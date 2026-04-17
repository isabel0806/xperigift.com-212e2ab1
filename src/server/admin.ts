import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { attachSupabaseAuth } from '@/integrations/supabase/auth-client-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (error) throw new Error('Could not verify admin role');
  if (!data) throw new Response('Forbidden: admin only', { status: 403 });
}

// ----- Create client account -----
const createClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  industry: z
    .enum(['spa', 'salon', 'restaurant', 'golf_club', 'specialty_retail', 'gun_shop', 'other'])
    .nullable()
    .optional(),
  website: z.string().trim().max(255).url().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
});

export const createClientAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createClientSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from('clients')
      .insert({
        name: data.name,
        industry: data.industry ?? null,
        website: data.website || null,
        notes: data.notes || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { client: row };
  });

// ----- Invite / create user for a client -----
const inviteUserSchema = z.object({
  clientId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  makeAdmin: z.boolean().optional(),
});

export const inviteClientUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Verify client exists
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', data.clientId)
      .maybeSingle();
    if (clientErr || !client) throw new Error('Client not found');

    // Try to find existing user
    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const found = existing?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (found) {
      userId = found.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (createErr || !created.user) throw new Error(createErr?.message ?? 'Could not create user');
      userId = created.user.id;
    }

    // Link to client
    const { error: linkErr } = await supabaseAdmin
      .from('client_users')
      .insert({ client_id: data.clientId, user_id: userId })
      .select()
      .maybeSingle();
    if (linkErr && !linkErr.message.includes('duplicate')) throw new Error(linkErr.message);

    // Optionally grant admin
    if (data.makeAdmin) {
      await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' })
        .select()
        .maybeSingle();
    }

    return { userId, email: data.email };
  });

// ----- Remove user from client -----
const removeMembershipSchema = z.object({
  clientId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const removeClientUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeMembershipSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from('client_users')
      .delete()
      .eq('client_id', data.clientId)
      .eq('user_id', data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ----- List users for a client (admin only) -----
const listUsersSchema = z.object({ clientId: z.string().uuid() });

export const listClientMembers = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listUsersSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from('client_users')
      .select('user_id, created_at')
      .eq('client_id', data.clientId);
    if (error) throw new Error(error.message);

    // enrich with email
    const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byId = new Map((usersResp?.users ?? []).map((u) => [u.id, u]));

    return {
      members: (rows ?? []).map((r) => ({
        userId: r.user_id,
        email: byId.get(r.user_id)?.email ?? '(unknown)',
        joinedAt: r.created_at,
      })),
    };
  });
