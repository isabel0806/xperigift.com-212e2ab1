import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/lib/dashboard-context';
import { useAuth } from '@/lib/auth-context';
import {
  DashboardShell,
  DashboardEmptyState,
  formatDate,
} from '@/components/dashboard/primitives';
import {
  createClientAccount,
  inviteClientUser,
  listClientMembers,
  removeClientUser,
} from '@/server/admin';
import { toast } from 'sonner';
import { Plus, UserPlus, X } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/admin/clients')({
  component: AdminClientsPage,
});

const INDUSTRIES = [
  { v: 'spa', l: 'Spa' },
  { v: 'salon', l: 'Salon' },
  { v: 'restaurant', l: 'Restaurant' },
  { v: 'golf_club', l: 'Golf club' },
  { v: 'specialty_retail', l: 'Specialty retail' },
  { v: 'gun_shop', l: 'Gun shop' },
  { v: 'other', l: 'Other' },
] as const;

function AdminClientsPage() {
  const { isAdmin } = useDashboard();
  const { isAdmin: authAdmin } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', industry: '', website: '', notes: '', points_per_giftcard: 10 });

  const allowed = isAdmin || authAdmin;

  const clients = useQuery({
    queryKey: ['admin-clients'],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, industry, website, is_active, created_at, points_per_giftcard')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const result = await createClientAccount({
        data: {
          name: form.name,
          industry: form.industry ? (form.industry as 'spa') : undefined,
          website: form.website || undefined,
          notes: form.notes || undefined,
        },
      });
      // Set initial points config (createClientAccount uses defaults)
      if (form.points_per_giftcard !== 10 && result?.client?.id) {
        await supabase
          .from('clients')
          .update({ points_per_giftcard: form.points_per_giftcard })
          .eq('id', result.client.id);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Client created');
      setCreating(false);
      setForm({ name: '', industry: '', website: '', notes: '', points_per_giftcard: 10 });
      qc.invalidateQueries({ queryKey: ['admin-clients'] });
      qc.invalidateQueries({ queryKey: ['clients-for-user'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Create failed'),
  });

  const updatePoints = useMutation({
    mutationFn: async ({ id, points }: { id: string; points: number }) => {
      const { error } = await supabase
        .from('clients')
        .update({ points_per_giftcard: points })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Points config updated');
      qc.invalidateQueries({ queryKey: ['admin-clients'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  });

  if (!allowed) {
    return (
      <DashboardShell title="Clients">
        <DashboardEmptyState title="Admin only." description="You don't have access to this area." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Clients"
      subtitle="Manage client accounts and the users who can access them."
      actions={
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft"
        >
          <Plus className="h-4 w-4" />
          {creating ? 'Cancel' : 'New client'}
        </button>
      }
    >
      {creating && (
        <div className="mb-6 rounded-sm border border-hairline bg-paper p-5">
          <h2 className="font-display text-[18px] text-ink">New client</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[13px] font-medium text-ink">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink">Industry</label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-2 h-10 text-[14px]"
              >
                <option value="">—</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.v} value={i.v}>{i.l}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[13px] font-medium text-ink">Website</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[13px] font-medium text-ink">Loyalty points per gift card sold</label>
              <input
                type="number"
                min={0}
                value={form.points_per_giftcard}
                onChange={(e) => setForm({ ...form, points_per_giftcard: Math.max(0, parseInt(e.target.value) || 0) })}
                className="mt-2 w-full sm:w-40 rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
              />
              <p className="mt-1 text-[12px] text-ink-muted">Awarded automatically to the buyer when a sale is recorded.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[13px] font-medium text-ink">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 py-2 text-[14px]"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.name.trim()}
              className="inline-flex h-9 items-center rounded-sm bg-ink px-4 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {clients.isLoading ? (
          <p className="text-[14px] text-ink-muted">Loading…</p>
        ) : clients.data?.length === 0 ? (
          <DashboardEmptyState title="No clients yet" description="Create your first client to start onboarding." />
        ) : (
          clients.data?.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              expanded={invitingClientId === c.id}
              onToggle={() => setInvitingClientId((v) => (v === c.id ? null : c.id))}
              onUpdatePoints={(points) => updatePoints.mutate({ id: c.id, points })}
              isSavingPoints={updatePoints.isPending}
            />
          ))
        )}
      </div>
    </DashboardShell>
  );
}

function ClientRow({
  client,
  expanded,
  onToggle,
  onUpdatePoints,
  isSavingPoints,
}: {
  client: { id: string; name: string; industry: string | null; website: string | null; is_active: boolean; created_at: string; points_per_giftcard: number };
  expanded: boolean;
  onToggle: () => void;
  onUpdatePoints: (points: number) => void;
  isSavingPoints: boolean;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pointsDraft, setPointsDraft] = useState<number>(client.points_per_giftcard);

  const members = useQuery({
    queryKey: ['client-members', client.id],
    enabled: expanded,
    queryFn: () => listClientMembers({ data: { clientId: client.id } }).then((r) => r.members),
  });

  const invite = useMutation({
    mutationFn: () =>
      inviteClientUser({
        data: { clientId: client.id, email: email.trim(), password },
      }),
    onSuccess: () => {
      toast.success(`Invited ${email}`);
      setEmail('');
      setPassword('');
      qc.invalidateQueries({ queryKey: ['client-members', client.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Invite failed'),
  });

  const remove = useMutation({
    mutationFn: (userId: string) =>
      removeClientUser({ data: { clientId: client.id, userId } }),
    onSuccess: () => {
      toast.success('Member removed');
      qc.invalidateQueries({ queryKey: ['client-members', client.id] });
    },
  });

  return (
    <div className="rounded-sm border border-hairline bg-paper">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-medium text-ink">{client.name}</p>
          <p className="text-[12px] text-ink-muted">
            {client.industry || 'No industry'} · {client.points_per_giftcard} pts/gift card · created {formatDate(client.created_at)}
          </p>
        </div>
        <button
          onClick={onToggle}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft"
        >
          <UserPlus className="h-4 w-4" />
          {expanded ? 'Hide' : 'Manage'}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-hairline px-5 py-5 bg-paper-soft">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              placeholder="user@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
            />
            <input
              type="text"
              placeholder="Initial password (≥10 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-sm border border-hairline-strong bg-paper px-3 h-10 text-[14px]"
            />
            <button
              onClick={() => invite.mutate()}
              disabled={invite.isPending || !email || password.length < 10}
              className="inline-flex h-10 items-center rounded-sm bg-ink px-4 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
            >
              {invite.isPending ? 'Inviting…' : 'Invite'}
            </button>
          </div>

          <div className="mt-5 rounded-sm border border-hairline bg-paper p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">Loyalty program</p>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <label className="block text-[12px] text-ink-muted">Points awarded per gift card sold</label>
                <input
                  type="number"
                  min={0}
                  value={pointsDraft}
                  onChange={(e) => setPointsDraft(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-1 w-32 rounded-sm border border-hairline-strong bg-paper px-3 h-9 text-[14px]"
                />
              </div>
              <button
                onClick={() => onUpdatePoints(pointsDraft)}
                disabled={isSavingPoints || pointsDraft === client.points_per_giftcard}
                className="inline-flex h-9 items-center rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
              >
                {isSavingPoints ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-ink-muted">
              Awarded automatically to the buyer when a sale is recorded with their email.
            </p>
          </div>

          <div className="mt-5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">Members</p>
            {members.isLoading ? (
              <p className="mt-2 text-[13px] text-ink-muted">Loading…</p>
            ) : members.data?.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-muted">No users yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {members.data?.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2">
                    <span className="text-[14px] text-ink">{m.email}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${m.email} from ${client.name}?`)) remove.mutate(m.userId);
                      }}
                      className="text-ink-muted hover:text-ink"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
