import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import { saveEmailDraft } from '@/server/email-drafts';
import {
  DashboardShell,
  DashboardEmptyState,
  formatDateTime,
} from '@/components/dashboard/primitives';
import { sanitizeEmailHtml } from '@/lib/sanitize-html';
import { toast } from 'sonner';
import { Plus, Save, Send, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/emails')({
  component: EmailsPage,
});

interface Draft {
  id: string;
  subject: string;
  preheader: string | null;
  html_sanitized: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

function EmailsPage() {
  const { activeClientId } = useDashboard();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Draft> | null>(null);
  const [rawHtml, setRawHtml] = useState('');

  const drafts = useQuery({
    queryKey: ['email-drafts', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('id, subject, preheader, html_sanitized, status, created_at, submitted_at')
        .eq('client_id', activeClientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Draft[];
    },
  });

  useEffect(() => {
    if (editing?.html_sanitized && !rawHtml) setRawHtml(editing.html_sanitized);
  }, [editing, rawHtml]);

  const save = useMutation({
    mutationFn: async (status: 'draft' | 'submitted') => {
      if (!activeClientId) throw new Error('No active client');
      if (!editing?.subject?.trim()) throw new Error('Subject is required');
      if (!rawHtml.trim()) throw new Error('Email body is required');
      return saveEmailDraft({
        data: {
          id: editing.id,
          clientId: activeClientId,
          subject: editing.subject,
          preheader: editing.preheader ?? undefined,
          rawHtml,
          status,
        },
      });
    },
    onSuccess: (_res, status) => {
      toast.success(status === 'submitted' ? 'Submitted to xperigift' : 'Draft saved');
      qc.invalidateQueries({ queryKey: ['email-drafts'] });
      setEditing(null);
      setRawHtml('');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_drafts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });

  if (!activeClientId) {
    return (
      <DashboardShell title="Emails">
        <DashboardEmptyState title="Select a workspace to manage email drafts." />
      </DashboardShell>
    );
  }

  if (editing) {
    const previewHtml = sanitizeEmailHtml(rawHtml);
    return (
      <DashboardShell
        title={editing.id ? 'Edit draft' : 'New email draft'}
        subtitle="Paste your campaign HTML. We sanitize it before saving and previewing."
        actions={
          <>
            <button
              onClick={() => {
                setEditing(null);
                setRawHtml('');
              }}
              className="inline-flex h-9 items-center rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft"
            >
              Cancel
            </button>
            <button
              onClick={() => save.mutate('draft')}
              disabled={save.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>
            <button
              onClick={() => save.mutate('submitted')}
              disabled={save.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Submit to xperigift
            </button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-ink">Subject</label>
              <input
                value={editing.subject ?? ''}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                maxLength={200}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink">Preheader (optional)</label>
              <input
                value={editing.preheader ?? ''}
                onChange={(e) => setEditing({ ...editing, preheader: e.target.value })}
                maxLength={200}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink">Email HTML</label>
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                rows={20}
                spellCheck={false}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper p-3 font-mono text-[12px] leading-relaxed"
                placeholder="Paste your email HTML here…"
              />
              <p className="mt-2 text-[12px] text-ink-muted">
                Scripts, iframes, forms and event handlers are stripped automatically.
              </p>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium text-ink">Sanitized preview</p>
            <div className="mt-2 overflow-hidden rounded-sm border border-hairline bg-paper">
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="block h-[600px] w-full"
              />
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Emails"
      subtitle="Draft campaign emails for the xperigift team to launch."
      actions={
        <button
          onClick={() => {
            setEditing({ subject: '', preheader: '', html_sanitized: '' });
            setRawHtml('');
          }}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft"
        >
          <Plus className="h-4 w-4" />
          New draft
        </button>
      }
    >
      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {drafts.isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted">Loading…</td></tr>
            ) : drafts.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-ink-muted">No drafts yet.</td></tr>
            ) : (
              drafts.data?.map((d) => (
                <tr key={d.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-ink">{d.subject}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 items-center rounded-sm bg-paper-soft px-2 text-[12px] text-ink-soft">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatDateTime(d.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing(d);
                        setRawHtml(d.html_sanitized);
                      }}
                      className="text-[13px] text-ink-soft hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this draft?')) del.mutate(d.id);
                      }}
                      className="ml-3 inline-flex items-center text-[13px] text-ink-muted hover:text-ink"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
