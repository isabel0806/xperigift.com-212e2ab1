import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardShell,
  DashboardEmptyState,
  KpiCard,
  formatCurrencyCents,
  formatNumber,
} from '@/components/dashboard/primitives';
import { Mail, TrendingUp, Wallet, Users, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/')({
  component: OverviewPage,
});

function OverviewPage() {
  const { activeClientId, activeClientName } = useDashboard();

  const summary = useQuery({
    queryKey: ['overview', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: sales, error } = await supabase
        .from('gift_card_sales')
        .select('amount_cents, redeemed_cents, sold_at')
        .eq('client_id', activeClientId!);
      if (error) throw error;
      const totalIssued = sales.reduce((s, r) => s + r.amount_cents, 0);
      const totalRedeemed = sales.reduce((s, r) => s + r.redeemed_cents, 0);
      const last30 = sales.filter((r) => new Date(r.sold_at) >= since);
      const last30Issued = last30.reduce((s, r) => s + r.amount_cents, 0);
      const outstanding = totalIssued - totalRedeemed;
      return {
        count: sales.length,
        totalIssued,
        outstanding,
        last30Issued,
        last30Count: last30.length,
      };
    },
  });

  const customers = useQuery({
    queryKey: ['customers-stats', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', activeClientId!);
      if (error) throw error;
      return { count: count ?? 0 };
    },
  });

  const pending = useQuery({
    queryKey: ['emails-pending', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('email_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', activeClientId!)
        .eq('approval_status', 'pending_approval');
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (!activeClientId) {
    return (
      <DashboardShell title="Overview">
        <DashboardEmptyState
          title="No workspace selected"
          description="An admin needs to assign you to a client account before you can see data."
        />
      </DashboardShell>
    );
  }

  const s = summary.data;
  const pendingCount = pending.data ?? 0;

  return (
    <DashboardShell
      title="Overview"
      subtitle={activeClientName ? `Snapshot for ${activeClientName}` : undefined}
    >
      {pendingCount > 0 && (
        <Link
          to="/dashboard/emails"
          className="mb-6 flex items-center justify-between rounded-sm border border-[oklch(0.78_0.13_75)] bg-[oklch(0.97_0.04_75)] px-5 py-4 transition-colors hover:bg-[oklch(0.95_0.05_75)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[oklch(0.85_0.12_75)] text-[oklch(0.3_0.1_55)]">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[oklch(0.3_0.1_55)]">
                You have {pendingCount} {pendingCount === 1 ? 'email' : 'emails'} to approve before sending
              </p>
              <p className="text-[12px] text-[oklch(0.4_0.1_60)]">
                Review and approve drafts in your campaigns queue.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[oklch(0.3_0.1_55)]">
            Review <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Last 30 days"
          value={s ? formatCurrencyCents(s.last30Issued) : '—'}
          hint={s ? `${formatNumber(s.last30Count)} cards sold` : undefined}
          loading={summary.isLoading}
          tone="emerald"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          label="All-time revenue"
          value={s ? formatCurrencyCents(s.totalIssued) : '—'}
          hint={s ? `${formatNumber(s.count)} total sales` : undefined}
          loading={summary.isLoading}
          tone="ink"
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          label="Outstanding"
          value={s ? formatCurrencyCents(s.outstanding) : '—'}
          hint="Issued minus redeemed"
          loading={summary.isLoading}
          tone="sky"
        />
        <KpiCard
          label="Customers"
          value={customers.data ? formatNumber(customers.data.count) : '—'}
          hint="In your CRM"
          loading={customers.isLoading}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Link
          to="/dashboard/sales"
          className="group rounded-sm border border-hairline bg-paper p-6 transition-colors hover:border-hairline-strong"
        >
          <h2 className="font-display text-[20px] text-ink">Review sales</h2>
          <p className="mt-2 text-[14px] text-ink-muted">
            See gift cards sold, top products, and import new sales from CSV.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-emerald-deep group-hover:underline">
            Open sales <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          to="/dashboard/emails"
          className="group rounded-sm border border-hairline bg-paper p-6 transition-colors hover:border-hairline-strong"
        >
          <h2 className="font-display text-[20px] text-ink">Draft a campaign</h2>
          <p className="mt-2 text-[14px] text-ink-muted">
            Upload your HTML, schedule a send date, choose customers, and get it approved.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-emerald-deep group-hover:underline">
            Open emails <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </DashboardShell>
  );
}
