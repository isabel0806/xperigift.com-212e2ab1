import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import { DashboardShell, DashboardEmptyState, KpiCard, formatCurrencyCents, formatNumber } from '@/components/dashboard/primitives';

export const Route = createFileRoute('/_dashboard/dashboard')({
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
        .select('amount_cents, redeemed_cents, status, sold_at')
        .eq('client_id', activeClientId!);
      if (error) throw error;
      const totalIssued = sales.reduce((s, r) => s + r.amount_cents, 0);
      const totalRedeemed = sales.reduce((s, r) => s + r.redeemed_cents, 0);
      const last30 = sales.filter((r) => new Date(r.sold_at) >= since);
      const last30Issued = last30.reduce((s, r) => s + r.amount_cents, 0);
      const avgTicket = sales.length ? Math.round(totalIssued / sales.length) : 0;
      const outstanding = totalIssued - totalRedeemed;
      return {
        count: sales.length,
        totalIssued,
        totalRedeemed,
        outstanding,
        last30Issued,
        avgTicket,
      };
    },
  });

  const customers = useQuery({
    queryKey: ['customers-stats', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('client_id', activeClientId!);
      if (error) throw error;
      const totalPoints = (data ?? []).reduce((s, r) => s + (r.loyalty_points ?? 0), 0);
      return { count: data?.length ?? 0, totalPoints };
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

  return (
    <DashboardShell
      title="Overview"
      subtitle={activeClientName ? `Gift card revenue snapshot for ${activeClientName}` : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Last 30 days issued"
          value={s ? formatCurrencyCents(s.last30Issued) : '—'}
          loading={summary.isLoading}
        />
        <KpiCard
          label="All-time issued"
          value={s ? formatCurrencyCents(s.totalIssued) : '—'}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Outstanding liability"
          value={s ? formatCurrencyCents(s.outstanding) : '—'}
          hint="Issued minus redeemed"
          loading={summary.isLoading}
        />
        <KpiCard
          label="Avg gift card"
          value={s ? formatCurrencyCents(s.avgTicket) : '—'}
          loading={summary.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total cards sold"
          value={s ? formatNumber(s.count) : '—'}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Customers in CRM"
          value={customers.data ? formatNumber(customers.data.count) : '—'}
          loading={customers.isLoading}
        />
        <KpiCard
          label="Loyalty points outstanding"
          value={customers.data ? formatNumber(customers.data.totalPoints) : '—'}
          hint="Across all customers"
          loading={customers.isLoading}
        />
      </div>

      <div className="mt-10 rounded-sm border border-hairline bg-paper p-6">
        <h2 className="font-display text-[20px] text-ink">What's next</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          Use the sidebar to review sales, manage your customer list, or draft a campaign email for the
          xperigift team to launch.
        </p>
      </div>
    </DashboardShell>
  );
}
