import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardShell,
  DashboardEmptyState,
  formatCurrencyCents,
  formatDate,
} from '@/components/dashboard/primitives';
import { Download, Search } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/customers')({
  component: CustomersPage,
});

function CustomersPage() {
  const { activeClientId } = useDashboard();
  const [search, setSearch] = useState('');

  const customers = useQuery({
    queryKey: ['customers', activeClientId, search],
    enabled: !!activeClientId,
    queryFn: async () => {
      let q = supabase
        .from('customers')
        .select('id, email, full_name, phone, total_spent_cents, purchase_count, last_purchase_at, loyalty_points')
        .eq('client_id', activeClientId!)
        .order('loyalty_points', { ascending: false })
        .limit(500);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`email.ilike.${term},full_name.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const exportCsv = () => {
    if (!customers.data?.length) return;
    const header = ['email', 'full_name', 'phone', 'total_spent', 'purchase_count', 'loyalty_points', 'last_purchase_at'];
    const lines = [header.join(',')];
    for (const r of customers.data) {
      lines.push(
        [
          r.email,
          escapeCsv(r.full_name ?? ''),
          escapeCsv(r.phone ?? ''),
          (r.total_spent_cents / 100).toFixed(2),
          String(r.purchase_count),
          String(r.loyalty_points ?? 0),
          r.last_purchase_at ?? '',
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeClientId) {
    return (
      <DashboardShell title="Customers">
        <DashboardEmptyState title="Select a workspace to view customers." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Customers"
      subtitle="Buyers and recipients tied to your gift card program."
      actions={
        <button
          onClick={exportCsv}
          disabled={!customers.data?.length}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      }
    >
      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="h-10 w-full max-w-md rounded-sm border border-hairline-strong bg-paper pl-9 pr-3 text-[14px]"
        />
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Total spent</th>
              <th className="px-4 py-3 font-medium">Purchases</th>
              <th className="px-4 py-3 font-medium">Last purchase</th>
            </tr>
          </thead>
          <tbody>
            {customers.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : customers.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-muted">
                  No customers yet.
                </td>
              </tr>
            ) : (
              customers.data?.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-ink">{r.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.full_name || '—'}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {formatCurrencyCents(r.total_spent_cents)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.purchase_count}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.last_purchase_at ? formatDate(r.last_purchase_at) : '—'}
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

function escapeCsv(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
