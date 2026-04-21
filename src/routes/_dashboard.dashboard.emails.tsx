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
  ChevronLeft, ChevronRight, Settings as SettingsIcon, Inbox, Rocket,
  Mail, FileText, BookmarkPlus,
} from 'lucide-react';
import {
  saveEmailSettings,
  sendTestEmail,
  sendCampaign,
} from '@/server/email-campaigns';
import { TemplatePickerDialog } from './_dashboard.dashboard.templates';

export const Route = createFileRoute('/_dashboard/dashboard/emails')({
  component: EmailsPage,
});

type TabKey = 'campaigns' | 'settings' | 'log';

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
  const [tab, setTab] = useState<TabKey>('campaigns');

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

  const send = useMutation({
    mutationFn: async (draftId: string) => {
      if (!activeClientId) throw new Error('No client');
      return await sendCampaign({ data: { clientId: activeClientId, draftId } });
    },
    onSuccess: (r) => {
      toast.success(`Enviado a ${r.sent} de ${r.total}${r.failed ? ` (${r.failed} fallaron)` : ''}`);
      qc.invalidateQueries({ queryKey: ['email-drafts'] });
      qc.invalidateQueries({ queryKey: ['email-send-log'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo enviar'),
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
      subtitle="Cargá tu HTML, programá la fecha de envío y obtené aprobación antes de lanzarla."
      actions={
        tab === 'campaigns' ? (
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
        ) : null
      }
    >
      <TabBar tab={tab} onChange={setTab} pendingCount={pendingCount} />

      {tab === 'campaigns' && (
        <>
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
                        <button
                          onClick={() => setEditing(d)}
                          className="text-left text-ink hover:underline"
                          title="Open campaign"
                        >
                          {d.subject || '(untitled)'}
                        </button>
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
                        ) : d.approval_status === 'approved' ? (
                          <button
                            onClick={() => {
                              if (confirm(`Enviar "${d.subject}" ahora?`)) send.mutate(d.id);
                            }}
                            disabled={send.isPending}
                            className="inline-flex items-center gap-1 rounded-sm bg-ink px-2.5 py-1 text-[12px] text-paper hover:bg-ink-soft disabled:opacity-60"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            {send.isPending ? 'Enviando…' : 'Send now'}
                          </button>
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
        </>
      )}

      {tab === 'settings' && <SettingsPanel clientId={activeClientId} />}
      {tab === 'log' && <SendLogPanel clientId={activeClientId} />}
    </DashboardShell>
  );
}

/* --------------------------- Tabs --------------------------- */

function TabBar({
  tab,
  onChange,
  pendingCount,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  pendingCount: number;
}) {
  const items: Array<{ key: TabKey; label: string; icon: typeof Mail; badge?: number }> = [
    { key: 'campaigns', label: 'Campañas', icon: Mail, badge: pendingCount > 0 ? pendingCount : undefined },
    { key: 'settings', label: 'Remitente', icon: SettingsIcon },
    { key: 'log', label: 'Envíos', icon: Inbox },
  ];
  return (
    <div className="mb-6 flex items-center gap-1 border-b border-hairline">
      {items.map((it) => {
        const active = tab === it.key;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-[13px] ${
              active
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
            {it.badge ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-[oklch(0.97_0.04_75)] px-1.5 text-[11px] text-[oklch(0.3_0.1_55)]">
                {it.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------- Settings panel --------------------------- */

interface EmailSettings {
  from_email: string;
  from_name: string;
  reply_to_email: string | null;
  domain: string | null;
  is_verified: boolean;
}

function SettingsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['email-settings', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_email_settings')
        .select('from_email, from_name, reply_to_email, domain, is_verified')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EmailSettings | null;
    },
  });

  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    if (settings.data) {
      setFromEmail(settings.data.from_email);
      setFromName(settings.data.from_name);
      setReplyTo(settings.data.reply_to_email ?? '');
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      return await saveEmailSettings({
        data: {
          clientId,
          fromEmail,
          fromName,
          replyToEmail: replyTo || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success('Configuración guardada');
      qc.invalidateQueries({ queryKey: ['email-settings', clientId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar'),
  });

  const test = useMutation({
    mutationFn: async () => {
      return await sendTestEmail({ data: { clientId, to: testTo } });
    },
    onSuccess: () => toast.success('Email de prueba enviado'),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo enviar la prueba'),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5 rounded-sm border border-hairline bg-paper p-5">
        <div>
          <h2 className="text-[15px] font-medium text-ink">Remitente</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Estos datos aparecen en la bandeja de tus clientes. El dominio debe
            estar verificado en tu proveedor de envío para mejorar la entregabilidad.
          </p>
        </div>

        <label className="block">
          <span className="text-[13px] font-medium text-ink">Nombre del remitente</span>
          <input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Spa Bella"
            className="mt-2 h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-ink">Email del remitente</span>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="hola@tudominio.com"
            className="mt-2 h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-ink">Reply-to (opcional)</span>
          <input
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="respuestas@tudominio.com"
            className="mt-2 h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
          />
        </label>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !fromEmail || !fromName}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-5 rounded-sm border border-hairline bg-paper p-5">
        <div>
          <h2 className="text-[15px] font-medium text-ink">Probar envío</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Mandate un email de prueba para verificar que la configuración funciona.
          </p>
        </div>

        <label className="block">
          <span className="text-[13px] font-medium text-ink">Enviar prueba a</span>
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="vos@tu-email.com"
            className="mt-2 h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
          />
        </label>

        <button
          onClick={() => test.mutate()}
          disabled={test.isPending || !testTo || !settings.data}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {test.isPending ? 'Enviando…' : 'Enviar prueba'}
        </button>

        {!settings.data && (
          <p className="text-[12px] text-ink-muted">
            Guardá primero la configuración del remitente.
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Send log panel --------------------------- */

interface SendLogRow {
  id: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  email_draft_id: string | null;
}

function SendLogPanel({ clientId }: { clientId: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const logs = useQuery({
    queryKey: ['email-send-log', clientId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('email_send_log')
        .select('id, recipient_email, status, error_message, sent_at, created_at, email_draft_id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as never);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SendLogRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = logs.data ?? [];
    return {
      total: rows.length,
      sent: rows.filter((r) => r.status === 'sent').length,
      failed: rows.filter((r) => r.status === 'failed').length,
      skipped: rows.filter((r) => r.status.startsWith('skipped')).length,
    };
  }, [logs.data]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Enviados" value={stats.sent} accent="text-emerald-deep" />
        <StatCard label="Fallidos" value={stats.failed} accent="text-destructive" />
        <StatCard label="Omitidos" value={stats.skipped} />
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'sent', 'failed', 'skipped_unsubscribed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`h-8 rounded-sm border px-3 text-[12px] ${
              statusFilter === s
                ? 'border-ink bg-ink text-paper'
                : 'border-hairline-strong bg-paper text-ink hover:bg-paper-soft'
            }`}
          >
            {s === 'all' ? 'Todos' : s === 'sent' ? 'Enviados' : s === 'failed' ? 'Fallidos' : 'Bajas'}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[13px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs.isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted">Cargando…</td></tr>
            ) : (logs.data?.length ?? 0) === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-ink-muted">
                Sin envíos todavía.
              </td></tr>
            ) : (
              logs.data?.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0 align-top">
                  <td className="px-4 py-2 text-ink">{r.recipient_email}</td>
                  <td className="px-4 py-2"><SendStatusBadge status={r.status} /></td>
                  <td className="px-4 py-2 text-ink-muted">{formatDateTime(r.sent_at ?? r.created_at)}</td>
                  <td className="px-4 py-2 text-ink-muted text-[12px]">{r.error_message ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-paper p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</div>
      <div className={`mt-1 text-[22px] font-medium ${accent ?? 'text-ink'}`}>{value}</div>
    </div>
  );
}

function SendStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    sent: { label: 'Enviado', cls: 'bg-emerald-soft text-emerald-deep' },
    pending: { label: 'Pendiente', cls: 'bg-paper-soft text-ink-soft' },
    failed: { label: 'Fallido', cls: 'bg-[oklch(0.95_0.05_27)] text-destructive' },
    bounced: { label: 'Rebotado', cls: 'bg-[oklch(0.95_0.05_27)] text-destructive' },
    complained: { label: 'Spam', cls: 'bg-[oklch(0.95_0.05_27)] text-destructive' },
    skipped_unsubscribed: { label: 'Dado de baja', cls: 'bg-paper-soft text-ink-muted' },
    skipped_invalid: { label: 'Inválido', cls: 'bg-paper-soft text-ink-muted' },
  };
  const c = map[status] ?? { label: status, cls: 'bg-paper-soft text-ink-muted' };
  return (
    <span className={`inline-flex h-5 items-center rounded-sm px-2 text-[11px] font-medium ${c.cls}`}>
      {c.label}
    </span>
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

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = toDayKey(new Date(year, month + 1, 0));

  const holidays = useQuery({
    queryKey: ['marketing-holidays', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_holidays')
        .select('id, name, holiday_date, emoji, category')
        .eq('is_active', true)
        .gte('holiday_date', monthStart)
        .lte('holiday_date', monthEnd)
        .order('holiday_date');
      if (error) throw error;
      return data ?? [];
    },
  });

  const holidaysByDay = useMemo(() => {
    const map = new Map<string, typeof holidays.data>();
    for (const h of holidays.data ?? []) {
      const list = map.get(h.holiday_date) ?? [];
      list.push(h);
      map.set(h.holiday_date, list);
    }
    return map;
  }, [holidays.data]);

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
          const dayHolidays = holidaysByDay.get(c.key) ?? [];
          const isToday = c.key === todayKey;
          const isLastCol = (idx + 1) % 7 === 0;
          return (
            <div
              key={c.key}
              className={`min-h-[88px] border-b border-hairline p-1.5 ${isLastCol ? '' : 'border-r'}`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[11px] ${
                  isToday ? 'bg-ink text-paper' : 'text-ink-soft'
                }`}>
                  {c.day}
                </span>
              </div>
              {dayHolidays.length > 0 && (
                <div className="mb-1 space-y-0.5">
                  {dayHolidays.map((h) => (
                    <div
                      key={h.id}
                      title={h.name}
                      className={`flex items-center gap-1 truncate rounded-sm px-1.5 py-0.5 text-[10px] ${holidayPillClass(h.category)}`}
                    >
                      {h.emoji && <span aria-hidden>{h.emoji}</span>}
                      <span className="truncate">{h.name}</span>
                    </div>
                  ))}
                </div>
              )}
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
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[oklch(0.94_0.06_300)]" />
          Holiday
        </span>
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

function holidayPillClass(category: string): string {
  switch (category) {
    case 'federal':
      return 'bg-[oklch(0.94_0.05_250)] text-[oklch(0.32_0.13_250)]';
    case 'retail':
      return 'bg-[oklch(0.94_0.06_300)] text-[oklch(0.32_0.16_300)]';
    default:
      return 'bg-paper-soft text-ink-soft';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveAsTplOpen, setSaveAsTplOpen] = useState(false);
  const { user } = useAuth();

  // If user clicked "Use" on a template card, auto-load it once on mount
  useEffect(() => {
    if (draft.id || typeof window === 'undefined') return;
    const stash = sessionStorage.getItem('xg.useTemplate');
    if (!stash) return;
    sessionStorage.removeItem('xg.useTemplate');
    try {
      const t = JSON.parse(stash) as {
        id?: string;
        subject?: string | null;
        preheader?: string | null;
        html_content: string;
        usage_count?: number;
      };
      if (t.subject) setSubject(t.subject);
      if (t.preheader) setPreheader(t.preheader);
      if (t.html_content) setRawHtml(t.html_content);
      if (t.id) {
        supabase
          .from('email_templates')
          .update({
            usage_count: (t.usage_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', t.id)
          .then(() => {});
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
