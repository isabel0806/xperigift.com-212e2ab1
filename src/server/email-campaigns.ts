import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { sanitizeEmailHtml } from '@/lib/sanitize-html';

/* ============================================================ */
/*  Settings                                                    */
/* ============================================================ */

const settingsSchema = z.object({
  clientId: z.string().uuid(),
  fromEmail: z.string().email().max(200),
  fromName: z.string().trim().min(1).max(100),
  replyToEmail: z
    .string()
    .email()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  domain: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const saveEmailSettings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      client_id: data.clientId,
      from_email: data.fromEmail,
      from_name: data.fromName,
      reply_to_email: data.replyToEmail ?? null,
      domain: data.domain ?? data.fromEmail.split('@')[1] ?? null,
    };

    const { data: existing } = await supabase
      .from('client_email_settings')
      .select('id')
      .eq('client_id', data.clientId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('client_email_settings')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('client_email_settings')
        .insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ============================================================ */
/*  Test email                                                  */
/* ============================================================ */

const testSchema = z.object({
  clientId: z.string().uuid(),
  to: z.string().email(),
});

export const sendTestEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => testSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: settings, error } = await supabase
      .from('client_email_settings')
      .select('from_email, from_name, reply_to_email')
      .eq('client_id', data.clientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!settings) throw new Error('Configurá primero el remitente.');

    const html = `
      <div style="font-family:system-ui,sans-serif;padding:24px;color:#222">
        <h2 style="margin:0 0 12px">Email de prueba ✅</h2>
        <p>Tu configuración funciona. Estás enviando como
          <strong>${escapeHtml(settings.from_name)}</strong>
          &lt;${escapeHtml(settings.from_email)}&gt;.</p>
      </div>`;

    const result = await sendViaResend({
      from: `${settings.from_name} <${settings.from_email}>`,
      replyTo: settings.reply_to_email ?? undefined,
      to: data.to,
      subject: 'Email de prueba — campañas',
      html,
    });

    if (!result.ok) {
      throw new Error(`Resend: ${result.error}`);
    }
    return { ok: true, messageId: result.messageId };
  });

/* ============================================================ */
/*  Send campaign                                               */
/* ============================================================ */

const sendCampaignSchema = z.object({
  clientId: z.string().uuid(),
  draftId: z.string().uuid(),
});

interface RecipientRow {
  id: string | null;
  email: string;
  unsubscribed_at: string | null;
}

export const sendCampaign = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendCampaignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Load draft (RLS scoped)
    const { data: draft, error: dErr } = await supabase
      .from('email_drafts')
      .select(
        'id, client_id, subject, preheader, html_sanitized, approval_status, send_to_all, recipient_customer_ids, sent_at',
      )
      .eq('id', data.draftId)
      .eq('client_id', data.clientId)
      .single();
    if (dErr || !draft) throw new Error('Campaña no encontrada.');
    if (draft.approval_status !== 'approved') {
      throw new Error('La campaña debe estar aprobada antes de enviarla.');
    }
    if (draft.sent_at) {
      throw new Error('Esta campaña ya fue enviada.');
    }

    // 2. Load settings
    const { data: settings, error: sErr } = await supabase
      .from('client_email_settings')
      .select('from_email, from_name, reply_to_email')
      .eq('client_id', data.clientId)
      .single();
    if (sErr || !settings) throw new Error('Configurá primero el remitente.');

    // 3. Resolve recipients (admin client to bypass RLS for the bulk read)
    const recipients = await resolveRecipients(
      data.clientId,
      draft.send_to_all,
      draft.recipient_customer_ids ?? [],
    );

    if (recipients.length === 0) {
      throw new Error('No hay destinatarios elegibles para esta campaña.');
    }

    // 4. Mark draft as sending
    await supabaseAdmin
      .from('email_drafts')
      .update({
        send_started_at: new Date().toISOString(),
        total_recipients: recipients.length,
      })
      .eq('id', draft.id);

    // 5. Iterate with throttle, log each result
    let sent = 0;
    let failed = 0;
    const html = sanitizeEmailHtml(draft.html_sanitized);

    for (const r of recipients) {
      if (r.unsubscribed_at) {
        await logSend(draft.client_id, draft.id, r, 'skipped_unsubscribed');
        continue;
      }
      const token = await getOrCreateUnsubToken(draft.client_id, r);
      const personalised = injectUnsubscribeFooter(html, token);

      const result = await sendViaResend({
        from: `${settings.from_name} <${settings.from_email}>`,
        replyTo: settings.reply_to_email ?? undefined,
        to: r.email,
        subject: draft.subject,
        html: personalised,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(token)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (result.ok) {
        sent++;
        await logSend(draft.client_id, draft.id, r, 'sent', {
          provider_message_id: result.messageId,
        });
      } else {
        failed++;
        await logSend(draft.client_id, draft.id, r, 'failed', {
          error_message: result.error,
        });
      }

      // small throttle: ~10 emails/sec to stay well under Resend limits
      await sleep(110);
    }

    // 6. Mark sent
    await supabaseAdmin
      .from('email_drafts')
      .update({
        sent_at: new Date().toISOString(),
        approval_status: 'sent',
        status: 'sent',
        total_sent: sent,
        total_failed: failed,
      })
      .eq('id', draft.id);

    return { sent, failed, total: recipients.length };
  });

/* ============================================================ */
/*  Helpers                                                     */
/* ============================================================ */

async function resolveRecipients(
  clientId: string,
  sendToAll: boolean,
  customerIds: string[],
): Promise<RecipientRow[]> {
  let q = supabaseAdmin
    .from('customers')
    .select('id, email, unsubscribed_at')
    .eq('client_id', clientId)
    .not('email', 'is', null);

  if (!sendToAll) {
    if (customerIds.length === 0) return [];
    q = q.in('id', customerIds);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // Dedup by lower email
  const seen = new Set<string>();
  const out: RecipientRow[] = [];
  for (const c of data ?? []) {
    const e = c.email.trim().toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    out.push({ id: c.id, email: c.email, unsubscribed_at: c.unsubscribed_at });
  }
  return out;
}

async function getOrCreateUnsubToken(
  clientId: string,
  r: RecipientRow,
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('client_id', clientId)
    .ilike('email', r.email)
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabaseAdmin.from('email_unsubscribe_tokens').insert({
    client_id: clientId,
    customer_id: r.id,
    email: r.email,
    token,
  });
  if (error) throw new Error(error.message);
  return token;
}

function injectUnsubscribeFooter(html: string, token: string): string {
  const url = unsubscribeUrl(token);
  const footer = `
    <table role="presentation" width="100%" style="margin-top:32px;border-top:1px solid #e5e5e5">
      <tr><td style="padding:16px;text-align:center;font-family:system-ui,sans-serif;font-size:12px;color:#888">
        <a href="${url}" style="color:#888;text-decoration:underline">Darme de baja</a>
      </td></tr>
    </table>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}</body>`);
  }
  return html + footer;
}

function unsubscribeUrl(token: string): string {
  const base =
    process.env.PUBLIC_SITE_URL ??
    process.env.SUPABASE_URL?.replace(
      /https:\/\/.*?\.supabase\.co/,
      '',
    ) ??
    '';
  // Prefer explicit PUBLIC_SITE_URL, fallback to relative — relative still works in clients.
  const origin = process.env.PUBLIC_SITE_URL ?? '';
  return `${origin}/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function logSend(
  clientId: string,
  draftId: string,
  r: RecipientRow,
  status:
    | 'sent'
    | 'failed'
    | 'skipped_unsubscribed'
    | 'skipped_invalid'
    | 'pending',
  extra: { provider_message_id?: string; error_message?: string } = {},
) {
  await supabaseAdmin.from('email_send_log').insert({
    client_id: clientId,
    email_draft_id: draftId,
    customer_id: r.id,
    recipient_email: r.email,
    status,
    provider_message_id: extra.provider_message_id ?? null,
    error_message: extra.error_message ?? null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  });
}

interface SendArgs {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

async function sendViaResend(args: SendArgs): Promise<SendResult> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY) return { ok: false, error: 'LOVABLE_API_KEY no configurada' };
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY no configurada' };

  try {
    const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        reply_to: args.replyTo,
        headers: args.headers,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!res.ok) {
      return { ok: false, error: json.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, messageId: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
