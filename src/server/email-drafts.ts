import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { sanitizeEmailHtml } from '@/lib/sanitize-html';

const saveDraftSchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  preheader: z.string().trim().max(200).optional(),
  rawHtml: z.string().min(1).max(500_000),
  status: z.enum(['draft', 'submitted', 'archived']).default('draft'),
  approvalStatus: z
    .enum(['pending_approval', 'approved', 'rejected', 'sent', 'cancelled'])
    .default('pending_approval'),
  sendAt: z.string().datetime().nullable().optional(),
  sendToAll: z.boolean().default(false),
  recipientCustomerIds: z.array(z.string().uuid()).default([]),
  notes: z.string().trim().max(1000).optional(),
});

export const saveEmailDraft = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveDraftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sanitized = sanitizeEmailHtml(data.rawHtml);

    const payload = {
      subject: data.subject,
      preheader: data.preheader || null,
      html_sanitized: sanitized,
      status: data.status,
      approval_status: data.approvalStatus,
      send_at: data.sendAt ?? null,
      send_to_all: data.sendToAll,
      recipient_customer_ids: data.recipientCustomerIds,
      notes: data.notes || null,
      submitted_at: data.status === 'submitted' ? new Date().toISOString() : null,
    };

    if (data.id) {
      const { data: row, error } = await supabase
        .from('email_drafts')
        .update(payload)
        .eq('id', data.id)
        .eq('client_id', data.clientId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { draft: row };
    }

    const { data: row, error } = await supabase
      .from('email_drafts')
      .insert({
        ...payload,
        client_id: data.clientId,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { draft: row };
  });
