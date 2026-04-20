import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/**
 * GoHighLevel import (Private Integration / Location API key).
 *
 * - Pulls all contacts from the configured GHL location → upserts into `customers`
 *   (matched by client_id + lower(email)). Always updates name/phone/tags.
 * - Pulls "won" opportunities with monetary_value > 0 → upserts into `gift_card_sales`
 *   (matched by client_id + source='gohighlevel' + notes containing the GHL opp id).
 *   Always updates amount/sold_at/product_name.
 *
 * Requires env: GHL_API_KEY, GHL_LOCATION_ID
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

type GhlContact = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  tags?: string[] | null;
  dateAdded?: string | null;
};

type GhlOpportunity = {
  id: string;
  name?: string | null;
  monetaryValue?: number | null;
  status?: string | null; // open / won / lost / abandoned
  contact?: { id?: string; email?: string | null; name?: string | null } | null;
  contactId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

async function ghlFetch(path: string, params: Record<string, string | number>) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey) throw new Error('GHL_API_KEY is not configured');
  if (!locationId) throw new Error('GHL_LOCATION_ID is not configured');

  const url = new URL(`${GHL_BASE}${path}`);
  url.searchParams.set('locationId', locationId);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GHL API ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchAllContacts(): Promise<GhlContact[]> {
  const out: GhlContact[] = [];
  let page = 1;
  const limit = 100;
  // Hard cap to avoid runaway loops
  const maxPages = 100;
  while (page <= maxPages) {
    const data = await ghlFetch('/contacts/', { page, limit });
    const batch: GhlContact[] = data?.contacts ?? [];
    out.push(...batch);
    if (batch.length < limit) break;
    page += 1;
  }
  return out;
}

async function fetchWonOpportunities(): Promise<GhlOpportunity[]> {
  const out: GhlOpportunity[] = [];
  let page = 1;
  const limit = 100;
  const maxPages = 100;
  while (page <= maxPages) {
    const data = await ghlFetch('/opportunities/search', {
      page,
      limit,
      status: 'won',
    });
    const batch: GhlOpportunity[] = data?.opportunities ?? [];
    out.push(...batch);
    const meta = data?.meta;
    if (batch.length < limit || (meta && meta.nextPage == null)) break;
    page += 1;
  }
  return out.filter((o) => (o.monetaryValue ?? 0) > 0);
}

export const importFromGoHighLevel = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      clientId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const clientId = data.clientId;

    // Verify caller actually has access to this client (RLS will also enforce on writes)
    const { data: membership, error: memErr } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();
    if (memErr) throw new Error(`Access check failed: ${memErr.message}`);
    if (!membership) throw new Error('You do not have access to this workspace');

    // ---------- 1. CONTACTS → customers ----------
    const contacts = await fetchAllContacts();

    // Existing customers for this client, indexed by lower(email)
    const { data: existing, error: exErr } = await supabase
      .from('customers')
      .select('id, email')
      .eq('client_id', clientId);
    if (exErr) throw new Error(`Read customers failed: ${exErr.message}`);
    const byEmail = new Map<string, string>();
    for (const c of existing ?? []) {
      if (c.email) byEmail.set(c.email.toLowerCase(), c.id);
    }

    let contactsCreated = 0;
    let contactsUpdated = 0;
    let contactsSkippedNoEmail = 0;

    for (const c of contacts) {
      const email = (c.email ?? '').trim().toLowerCase();
      if (!email) {
        contactsSkippedNoEmail += 1;
        continue;
      }
      const first = (c.firstName ?? '').trim() || null;
      const last = (c.lastName ?? '').trim() || null;
      const phone = (c.phone ?? '').trim() || null;
      const tags = Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : null;

      const existingId = byEmail.get(email);
      if (existingId) {
        const { error } = await supabase
          .from('customers')
          .update({
            first_name: first,
            last_name: last,
            phone,
            tags,
            source: 'gohighlevel',
          })
          .eq('id', existingId);
        if (error) throw new Error(`Update customer failed: ${error.message}`);
        contactsUpdated += 1;
      } else {
        const { data: inserted, error } = await supabase
          .from('customers')
          .insert({
            client_id: clientId,
            email,
            first_name: first,
            last_name: last,
            phone,
            tags,
            source: 'gohighlevel',
          })
          .select('id')
          .single();
        if (error) throw new Error(`Insert customer failed: ${error.message}`);
        if (inserted?.id) byEmail.set(email, inserted.id);
        contactsCreated += 1;
      }
    }

    // ---------- 2. OPPORTUNITIES (won) → gift_card_sales ----------
    const opps = await fetchWonOpportunities();

    // Existing GHL-sourced sales for this client
    const { data: existingSales, error: salesErr } = await supabase
      .from('gift_card_sales')
      .select('id, notes')
      .eq('client_id', clientId)
      .eq('source', 'gohighlevel');
    if (salesErr) throw new Error(`Read sales failed: ${salesErr.message}`);

    // Map GHL opportunity id → sale id (we encode it in `notes` as "ghl_opp_id:<id>")
    const byOppId = new Map<string, string>();
    const oppIdRegex = /ghl_opp_id:([\w-]+)/;
    for (const s of existingSales ?? []) {
      const m = s.notes?.match(oppIdRegex);
      if (m?.[1]) byOppId.set(m[1], s.id);
    }

    let salesCreated = 0;
    let salesUpdated = 0;
    let salesSkipped = 0;

    for (const o of opps) {
      const amountCents = Math.round(((o.monetaryValue ?? 0) as number) * 100);
      if (amountCents <= 0) {
        salesSkipped += 1;
        continue;
      }
      const soldAt = o.updatedAt || o.createdAt || new Date().toISOString();
      const buyerEmail = (o.contact?.email ?? '').trim() || null;
      const buyerName = (o.contact?.name ?? o.name ?? '').trim() || null;
      const productName = (o.name ?? '').trim() || null;
      const noteTag = `ghl_opp_id:${o.id}`;

      const existingSaleId = byOppId.get(o.id);
      if (existingSaleId) {
        const { error } = await supabase
          .from('gift_card_sales')
          .update({
            amount_cents: amountCents,
            sold_at: soldAt,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            product_name: productName,
            notes: noteTag,
            source: 'gohighlevel',
          })
          .eq('id', existingSaleId);
        if (error) throw new Error(`Update sale failed: ${error.message}`);
        salesUpdated += 1;
      } else {
        const { error } = await supabase.from('gift_card_sales').insert({
          client_id: clientId,
          amount_cents: amountCents,
          sold_at: soldAt,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          product_name: productName,
          notes: noteTag,
          source: 'gohighlevel',
          status: 'sold',
        });
        if (error) throw new Error(`Insert sale failed: ${error.message}`);
        salesCreated += 1;
      }
    }

    return {
      contacts: {
        total: contacts.length,
        created: contactsCreated,
        updated: contactsUpdated,
        skippedNoEmail: contactsSkippedNoEmail,
      },
      sales: {
        total: opps.length,
        created: salesCreated,
        updated: salesUpdated,
        skipped: salesSkipped,
      },
    };
  });
