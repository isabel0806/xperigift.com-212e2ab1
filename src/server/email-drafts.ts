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
  notes: z.string().trim().max(1000).optional(),
});

export const saveEmailDraft = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveDraftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sanitized = sanitizeEmailHtml(data.rawHtml);

    if (data.id) {
      const { data: row, error } = await supabase
        .from('email_drafts')
        .update({
          subject: data.subject,
          preheader: data.preheader || null,
          html_sanitized: sanitized,
          status: data.status,
          notes: data.notes || null,
          submitted_at: data.status === 'submitted' ? new Date().toISOString() : null,
        })
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
        client_id: data.clientId,
        created_by: userId,
        subject: data.subject,
        preheader: data.preheader || null,
        html_sanitized: sanitized,
        status: data.status,
        notes: data.notes || null,
        submitted_at: data.status === 'submitted' ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { draft: row };
  });
