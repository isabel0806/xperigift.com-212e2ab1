import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import {
  DashboardShell,
  DashboardEmptyState,
  formatDateTime,
} from '@/components/dashboard/primitives';
import { sanitizeEmailHtml } from '@/lib/sanitize-html';
import { toast } from 'sonner';
import {
  Plus, Save, Send, Trash2, CheckCircle2, Clock, XCircle, Users, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/emails')({
  component: EmailsPage,
});

type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'cancelled';

interface Draft {
  id: string;
  subject: string;
  preheader: string | null;
  html_sanitized: string;
  status: string;
  approval_status: ApprovalStatus;
  send_at: string | null;
  send_to_all: boolean;
  recipient_customer_ids: string[] | null;
  created_at: string;
  submitted_at: string | null;
}

interface CustomerLite {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

function EmailsPage() {
  const { activeClientId } = useDashboard();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Draft> | null>(null);

  const drafts = useQuery({
    queryKey: ['email-drafts', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('id, subject, preheader, html_sanitized, status, approval_status, send_at, send_to_all, recipient_customer_ids, created_at, submitted_at')
        .eq('client_id', activeClientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Draft[];
    },
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

  const approve = useMutation({
    mutationFn: async ({ id, approval_status }: { id: string; approval_status: ApprovalStatus }) => {
      const patch: Record<string, unknown> = { approval_status };
      if (approval_status === 'approved') {
        patch.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('email_drafts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.approval_status === 'approved' ? 'Approved' : 'Rejected');
      qc.invalidateQueries({ queryKey: ['email-drafts'] });
      qc.invalidateQueries({ queryKey: ['emails-pending'] });
    },
  });

  if (!activeClientId) {
    return (
      <DashboardShell title="Emails">
        <DashboardEmptyState title="Select a workspace to manage email campaigns." />
      </DashboardShell>
    );
  }

  if (editing) {
    return (
      <DraftEditor
        clientId={activeClientId}
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['email-drafts'] });
          qc.invalidateQueries({ queryKey: ['emails-pending'] });
          setEditing(null);
        }}
      />
    );
  }

  const pendingCount = drafts.data?.filter((d) => d.approval_status === 'pending_approval').length ?? 0;

  return (
    <DashboardShell
      title="Email campaigns"
      subtitle="Upload your HTML, schedule a send date, and get it approved before launch."
      actions={
        <button
          onClick={() => setEditing({
            subject: '',
            preheader: '',
            html_sanitized: '',
            send_to_all: true,
            recipient_customer_ids: [],
          })}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </button>
      }
    >
      {pendingCount > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-sm border border-[oklch(0.78_0.13_75)] bg-[oklch(0.97_0.04_75)] px-4 py-3 text-[13px] text-[oklch(0.3_0.1_55)]">
          <Clock className="h-4 w-4" />
          {pendingCount} {pendingCount === 1 ? 'campaign' : 'campaigns'} waiting for your approval.
        </div>
      )}

      <div className="mb-5">
        <CampaignCalendar drafts={drafts.data ?? []} onSelectDraft={(d) => setEditing(d)} />
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Send at</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {drafts.isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">Loading…</td></tr>
            ) : drafts.data?.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-ink-muted">
                No campaigns yet. Click "New campaign" to draft your first one.
              </td></tr>
            ) : (
              drafts.data?.map((d) => (
                <tr key={d.id} className="border-b border-hairline last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="text-ink">{d.subject}</div>
                    {d.preheader && (
                      <div className="text-[12px] text-ink-muted truncate max-w-xs">{d.preheader}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft text-[13px]">
                    {d.send_to_all ? (
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> All customers</span>
                    ) : (
                      `${d.recipient_customer_ids?.length ?? 0} selected`
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft text-[13px]">
                    {d.send_at ? formatDateTime(d.send_at) : <span className="text-ink-muted italic">Not scheduled</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ApprovalBadge status={d.approval_status} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {d.approval_status === 'pending_approval' ? (
                      <>
                        <button
                          onClick={() => approve.mutate({ id: d.id, approval_status: 'approved' })}
                          className="inline-flex items-center gap-1 text-[13px] text-emerald-deep hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => approve.mutate({ id: d.id, approval_status: 'rejected' })}
                          className="ml-3 inline-flex items-center gap-1 text-[13px] text-destructive hover:underline"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditing(d)}
                        className="text-[13px] text-ink-soft hover:text-ink"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Delete this campaign?')) del.mutate(d.id); }}
                      className="ml-3 inline-flex items-center text-ink-muted hover:text-ink"
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

/* --------------------------- Calendar --------------------------- */

function CampaignCalendar({
  drafts,
  onSelectDraft,
}: {
  drafts: Draft[];
  onSelectDraft: (d: Draft) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDayKey(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, Draft[]>();
    for (const d of drafts) {
      if (!d.send_at) continue;
      const key = toDayKey(new Date(d.send_at));
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return map;
  }, [drafts]);

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, key: `pad-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toDayKey(new Date(year, month, d)) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `tail-${cells.length}` });

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-sm border border-hairline bg-paper">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div>
          <div className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">Calendar</div>
          <div className="text-[15px] font-medium text-ink">{monthLabel}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-hairline-strong bg-paper text-ink-soft hover:bg-paper-soft"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
            className="h-8 rounded-sm border border-hairline-strong bg-paper px-3 text-[12px] text-ink hover:bg-paper-soft"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-hairline-strong bg-paper text-ink-soft hover:bg-paper-soft"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-hairline bg-paper-soft text-[11px] uppercase tracking-wide text-ink-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-2 py-2 text-center font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((c, idx) => {
          if (c.day === null) {
            return <div key={c.key} className="min-h-[88px] border-b border-r border-hairline bg-paper-soft/40 last:border-r-0" />;
          }
          const items = byDay.get(c.key) ?? [];
          const isToday = c.key === todayKey;
          const isLastCol = (idx + 1) % 7 === 0;
          return (
            <div
              key={c.key}
              className={`min-h-[88px] border-b border-hairline p-1.5 ${isLastCol ? '' : 'border-r'}`}
            >
              <div className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[11px] ${
                isToday ? 'bg-ink text-paper' : 'text-ink-soft'
              }`}>
                {c.day}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onSelectDraft(d)}
                    title={`${d.subject} — ${formatDateTime(d.send_at!)}`}
                    className={`block w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] ${calendarItemClass(d.approval_status)}`}
                  >
                    {d.subject || '(untitled)'}
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="px-1.5 text-[10px] text-ink-muted">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-4 py-2 text-[11px] text-ink-muted">
        <LegendDot className="bg-emerald-soft text-emerald-deep" label="Approved" />
        <LegendDot className="bg-[oklch(0.97_0.04_75)] text-[oklch(0.3_0.1_55)]" label="Pending" />
        <LegendDot className="bg-paper-soft text-ink-soft" label="Sent / other" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function calendarItemClass(status: ApprovalStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-soft text-emerald-deep hover:opacity-80';
    case 'pending_approval':
      return 'bg-[oklch(0.97_0.04_75)] text-[oklch(0.3_0.1_55)] hover:opacity-80';
    case 'rejected':
      return 'bg-[oklch(0.95_0.05_27)] text-destructive hover:opacity-80';
    default:
      return 'bg-paper-soft text-ink-soft hover:bg-hairline';
  }
}

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; cls: string }> = {
    pending_approval: { label: 'Pending', cls: 'bg-[oklch(0.97_0.04_75)] text-[oklch(0.3_0.1_55)]' },
    approved: { label: 'Approved', cls: 'bg-emerald-soft text-emerald-deep' },
    rejected: { label: 'Rejected', cls: 'bg-[oklch(0.95_0.05_27)] text-destructive' },
    sent: { label: 'Sent', cls: 'bg-paper-soft text-ink-soft' },
    cancelled: { label: 'Cancelled', cls: 'bg-paper-soft text-ink-muted' },
  };
  const c = map[status] ?? map.pending_approval;
  return (
    <span className={`inline-flex h-6 items-center rounded-sm px-2 text-[12px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ----------------------------- Editor ----------------------------- */

function DraftEditor({
  clientId,
  draft,
  onClose,
  onSaved,
}: {
  clientId: string;
  draft: Partial<Draft>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(draft.subject ?? '');
  const [preheader, setPreheader] = useState(draft.preheader ?? '');
  const [rawHtml, setRawHtml] = useState(draft.html_sanitized ?? '');
  const [sendAt, setSendAt] = useState<string>(toLocalDateTimeInput(draft.send_at ?? null));
  const [sendToAll, setSendToAll] = useState<boolean>(draft.send_to_all ?? true);
  const [recipientIds, setRecipientIds] = useState<string[]>(draft.recipient_customer_ids ?? []);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  const customers = useQuery({
    queryKey: ['customers-for-emails', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, full_name')
        .eq('client_id', clientId)
        .order('full_name', { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as CustomerLite[];
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!customers.data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return customers.data;
    return customers.data.filter((c) =>
      `${c.first_name ?? ''} ${c.last_name ?? ''} ${c.email}`.toLowerCase().includes(term),
    );
  }, [customers.data, search]);

  const previewHtml = useMemo(() => sanitizeEmailHtml(rawHtml), [rawHtml]);

  const save = useMutation({
    mutationFn: async (approvalStatus: ApprovalStatus) => {
      if (!subject.trim()) throw new Error('Subject is required');
      if (!rawHtml.trim()) throw new Error('Email body is required');
      if (!sendToAll && recipientIds.length === 0) throw new Error('Pick at least one recipient or send to all');
      if (!user?.id) throw new Error('You must be signed in');

      const payload = {
        subject: subject.trim(),
        preheader: preheader.trim() || null,
        html_sanitized: sanitizeEmailHtml(rawHtml),
        status: 'draft' as const,
        approval_status: approvalStatus,
        send_at: sendAt ? new Date(sendAt).toISOString() : null,
        send_to_all: sendToAll,
        recipient_customer_ids: sendToAll ? [] : recipientIds,
        submitted_at: approvalStatus === 'pending_approval' ? new Date().toISOString() : null,
        approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
      };

      if (draft.id) {
        const { error } = await supabase
          .from('email_drafts')
          .update(payload)
          .eq('id', draft.id)
          .eq('client_id', clientId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('email_drafts')
          .insert({ ...payload, client_id: clientId, created_by: user.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_r, status) => {
      toast.success(status === 'pending_approval' ? 'Saved & queued for approval' : 'Saved');
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  useEffect(() => {
    if (sendToAll) setRecipientIds([]);
  }, [sendToAll]);

  const recipientCount = sendToAll ? (customers.data?.length ?? 0) : recipientIds.length;

  return (
    <DashboardShell
      title={draft.id ? 'Edit campaign' : 'New campaign'}
      subtitle="Paste your HTML, schedule it, pick recipients, then send for approval."
      actions={
        <>
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft"
          >
            Cancel
          </button>
          <button
            onClick={() => save.mutate('pending_approval')}
            disabled={save.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save as pending
          </button>
          <button
            onClick={() => save.mutate('approved')}
            disabled={save.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Save & approve
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: form */}
        <div className="space-y-5">
          <Field label="Subject *">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Spring promo — 20% off gift cards"
              className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
            />
          </Field>
          <Field label="Preheader">
            <input
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              maxLength={200}
              placeholder="Short preview text shown in inbox"
              className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
            />
          </Field>
          <Field label="Schedule send (optional)">
            <input
              type="datetime-local"
              value={sendAt}
              onChange={(e) => setSendAt(e.target.value)}
              className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
            />
          </Field>

          {/* Recipients */}
          <div className="rounded-sm border border-hairline bg-paper-soft p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                Recipients
              </span>
              <span className="text-[12px] text-ink-muted">
                {recipientCount} {recipientCount === 1 ? 'customer' : 'customers'}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setSendToAll(true)}
                className={`h-8 rounded-sm border px-3 text-[12px] ${
                  sendToAll
                    ? 'border-ink bg-ink text-paper'
                    : 'border-hairline-strong bg-paper text-ink hover:bg-paper-soft'
                }`}
              >
                Entire list
              </button>
              <button
                onClick={() => setSendToAll(false)}
                className={`h-8 rounded-sm border px-3 text-[12px] ${
                  !sendToAll
                    ? 'border-ink bg-ink text-paper'
                    : 'border-hairline-strong bg-paper text-ink hover:bg-paper-soft'
                }`}
              >
                Pick customers
              </button>
            </div>

            {!sendToAll && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-9 w-full rounded-sm border border-hairline-strong bg-paper pl-8 pr-2 text-[13px]"
                  />
                </div>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-sm border border-hairline bg-paper">
                  {customers.isLoading ? (
                    <p className="p-3 text-[13px] text-ink-muted">Loading…</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="p-3 text-[13px] text-ink-muted">No matches.</p>
                  ) : (
                    filteredCustomers.map((c) => {
                      const checked = recipientIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 border-b border-hairline px-3 py-2 last:border-0 hover:bg-paper-soft"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setRecipientIds((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                              )
                            }
                            className="h-3.5 w-3.5 accent-emerald"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-ink">
                              {c.full_name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email}
                            </div>
                            <div className="truncate text-[11px] text-ink-muted">{c.email}</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <Field label="Email HTML *">
            <textarea
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-sm border border-hairline-strong bg-paper p-3 font-mono text-[12px] leading-relaxed"
              placeholder="Paste your email HTML here…"
            />
            <p className="mt-2 text-[12px] text-ink-muted">
              Scripts, iframes, forms and event handlers are stripped before saving and previewing.
            </p>
          </Field>
        </div>

        {/* Right: preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft">
            Sanitized preview
          </p>
          <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={previewHtml || '<p style="font-family:sans-serif;color:#999;padding:24px">Paste your HTML to preview…</p>'}
              className="block h-[640px] w-full"
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}
