import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardShell,
  DashboardEmptyState,
  KpiCard,
  formatCurrencyCents,
  formatNumber,
  formatDate,
  CHART_PALETTE,
  HBar,
} from '@/components/dashboard/primitives';
import { toast } from 'sonner';
import { Upload, Download, Package, ShoppingBag, DollarSign, TrendingUp, LineChart as LineChartIcon, ScanLine } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RedeemDialog, type RedeemSale } from '@/components/redeem-dialog';

export const Route = createFileRoute('/_dashboard/dashboard/sales')({
  component: SalesPage,
});

interface SaleRow {
  id: string;
  client_id: string;
  card_code: string | null;
  sold_at: string;
  amount_cents: number;
  redeemed_cents: number;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  recipient_name: string | null;
  product_name: string | null;
}

function SalesPage() {
  const { activeClientId } = useDashboard();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [redeemSale, setRedeemSale] = useState<RedeemSale | null>(null);

  const sales = useQuery({
    queryKey: ['sales', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_sales')
        .select('id, client_id, card_code, sold_at, amount_cents, redeemed_cents, status, buyer_name, buyer_email, recipient_name, product_name')
        .eq('client_id', activeClientId!)
        .order('sold_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SaleRow[];
    },
  });

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) throw new Error('CSV is empty');
      const required = ['sold_at', 'amount'];
      for (const r of required) {
        if (!Object.keys(rows[0]).includes(r)) throw new Error(`Missing column: ${r}`);
      }
      const inserts = rows.map((r) => ({
        client_id: activeClientId!,
        sold_at: new Date(r.sold_at).toISOString(),
        amount_cents: Math.round(parseFloat(r.amount) * 100),
        redeemed_cents: r.redeemed ? Math.round(parseFloat(r.redeemed) * 100) : 0,
        status: (r.status || 'sold') as 'sold' | 'partially_redeemed' | 'redeemed' | 'refunded' | 'expired',
        buyer_name: r.buyer_name || null,
        buyer_email: r.buyer_email || null,
        recipient_name: r.recipient_name || null,
        recipient_email: r.recipient_email || null,
        card_code: r.card_code || null,
        product_name: r.product_name || r.product || r.bundle || null,
        source: r.source || 'csv_import',
      }));
      const { error } = await supabase.from('gift_card_sales').insert(inserts);
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} sales`);
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
  });

  // KPIs computed client-side over the loaded set
  const kpis = useMemo(() => {
    const rows = sales.data ?? [];
    const totalCount = rows.length;
    const totalAmount = rows.reduce((s, r) => s + r.amount_cents, 0);
    const avg = totalCount ? Math.round(totalAmount / totalCount) : 0;
    const redeemed = rows.reduce((s, r) => s + r.redeemed_cents, 0);
    return { totalCount, totalAmount, avg, redeemed };
  }, [sales.data]);

  // Top products breakdown
  const productBreakdown = useMemo(() => {
    const rows = sales.data ?? [];
    const map = new Map<string, { count: number; amount: number }>();
    for (const r of rows) {
      const key = r.product_name?.trim() || 'Uncategorized';
      const prev = map.get(key) ?? { count: 0, amount: 0 };
      prev.count += 1;
      prev.amount += r.amount_cents;
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [sales.data]);

  // Monthly trend (last 12 months, oldest -> newest)
  const monthlyTrend = useMemo(() => {
    const rows = sales.data ?? [];
    const buckets = new Map<string, { revenue: number; count: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { revenue: 0, count: 0 });
    }
    for (const r of rows) {
      const d = new Date(r.sold_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.get(key);
      if (!b) continue;
      b.revenue += r.amount_cents;
      b.count += 1;
    }
    return Array.from(buckets.entries()).map(([key, v]) => {
      const [y, m] = key.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
      });
      return {
        month: label,
        revenue: Math.round(v.revenue / 100),
        count: v.count,
      };
    });
  }, [sales.data]);

  const productOptions = useMemo(
    () => productBreakdown.map((p) => p.name),
    [productBreakdown],
  );

  const filtered = useMemo(() => {
    if (!sales.data) return [];
    return sales.data.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterProduct !== 'all') {
        const name = r.product_name?.trim() || 'Uncategorized';
        if (name !== filterProduct) return false;
      }
      return true;
    });
  }, [sales.data, filterStatus, filterProduct]);

  const exportCsv = () => {
    if (!sales.data?.length) return;
    const header = ['sold_at', 'amount', 'redeemed', 'status', 'product_name', 'buyer_name', 'buyer_email', 'recipient_name'];
    const lines = [header.join(',')];
    for (const r of sales.data) {
      lines.push(
        [
          r.sold_at,
          (r.amount_cents / 100).toFixed(2),
          (r.redeemed_cents / 100).toFixed(2),
          r.status,
          csvEscape(r.product_name ?? ''),
          csvEscape(r.buyer_name ?? ''),
          csvEscape(r.buyer_email ?? ''),
          csvEscape(r.recipient_name ?? ''),
        ].join(','),
      );
    }
    downloadFile(`sales-${Date.now()}.csv`, lines.join('\n'));
  };

  if (!activeClientId) {
    return (
      <DashboardShell title="Sales">
        <DashboardEmptyState title="Select a workspace to view sales." />
      </DashboardShell>
    );
  }

  const maxAmount = productBreakdown[0]?.amount ?? 1;

  return (
    <DashboardShell
      title="Sales"
      subtitle="Gift cards sold, revenue, and breakdown by service or bundle."
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv.mutate(f);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importCsv.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {importCsv.isPending ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={exportCsv}
            disabled={!sales.data?.length}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </>
      }
    >
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Cards sold"
          value={formatNumber(kpis.totalCount)}
          loading={sales.isLoading}
          tone="ink"
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <KpiCard
          label="Revenue"
          value={formatCurrencyCents(kpis.totalAmount)}
          loading={sales.isLoading}
          tone="emerald"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg ticket"
          value={formatCurrencyCents(kpis.avg)}
          loading={sales.isLoading}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          label="Redeemed"
          value={formatCurrencyCents(kpis.redeemed)}
          hint={
            kpis.totalAmount
              ? `${Math.round((kpis.redeemed / kpis.totalAmount) * 100)}% of issued`
              : undefined
          }
          loading={sales.isLoading}
          tone="sky"
        />
      </div>

      {/* Monthly trend */}
      <div className="mt-8 rounded-sm border border-hairline bg-paper p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-ink-soft" />
            <h2 className="font-display text-[18px] text-ink">Revenue trend</h2>
          </div>
          <span className="text-[12px] text-ink-muted">Last 12 months</span>
        </div>
        {sales.isLoading ? (
          <p className="py-8 text-center text-[13px] text-ink-muted">Loading…</p>
        ) : (sales.data?.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-muted">
            No sales yet. Import a CSV to see month-over-month evolution.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PALETTE[0]} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART_PALETTE[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 90)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 90)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'oklch(0.88 0.01 90)' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 90)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${formatNumber(v)}`}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: 'oklch(0.99 0.005 90)',
                    border: '1px solid oklch(0.88 0.01 90)',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'revenue'
                      ? [`$${formatNumber(value)}`, 'Revenue']
                      : [formatNumber(value), 'Cards']
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_PALETTE[0]}
                  strokeWidth={2}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product breakdown */}
      <div className="mt-8 rounded-sm border border-hairline bg-paper p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-ink-soft" />
            <h2 className="font-display text-[18px] text-ink">Top products & bundles</h2>
          </div>
          <span className="text-[12px] text-ink-muted">By revenue</span>
        </div>
        {sales.isLoading ? (
          <p className="py-8 text-center text-[13px] text-ink-muted">Loading…</p>
        ) : productBreakdown.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-muted">
            No sales yet. Import a CSV with a <code>product_name</code> column to see the breakdown.
          </p>
        ) : (
          <div className="space-y-4">
            {productBreakdown.slice(0, 7).map((p, i) => (
              <HBar
                key={p.name}
                label={p.name}
                valueText={`${formatCurrencyCents(p.amount)} · ${p.count} ${p.count === 1 ? 'card' : 'cards'}`}
                ratio={p.amount / maxAmount}
                color={CHART_PALETTE[i % CHART_PALETTE.length]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-8 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-[13px] text-ink-muted">Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-sm border border-hairline-strong bg-paper px-2 h-9 text-[13px]"
        >
          <option value="all">All</option>
          <option value="sold">Sold</option>
          <option value="partially_redeemed">Partially redeemed</option>
          <option value="redeemed">Redeemed</option>
          <option value="refunded">Refunded</option>
          <option value="expired">Expired</option>
        </select>
        <label className="text-[13px] text-ink-muted">Product</label>
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="rounded-sm border border-hairline-strong bg-paper px-2 h-9 text-[13px]"
        >
          <option value="all">All</option>
          {productOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <p className="text-[13px] text-ink-muted">{filtered.length} rows</p>
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Redeemed</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sales.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-muted">
                  No sales yet. Import a CSV to get started.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const remaining = r.amount_cents - r.redeemed_cents;
                const canRedeem = remaining > 0 && r.status !== 'refunded' && r.status !== 'expired';
                return (
                  <tr key={r.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(r.sold_at)}</td>
                    <td className="px-4 py-3 text-ink">{r.product_name || <span className="text-ink-muted italic">Uncategorized</span>}</td>
                    <td className="px-4 py-3 font-medium text-ink">{formatCurrencyCents(r.amount_cents)}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatCurrencyCents(r.redeemed_cents)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex h-6 items-center rounded-sm bg-paper-soft px-2 text-[12px] text-ink-soft">
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.buyer_name || r.buyer_email || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRedeemSale(r)}
                        disabled={!canRedeem}
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-hairline-strong bg-paper px-2.5 text-[12px] text-ink hover:bg-paper-soft disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ScanLine className="h-3.5 w-3.5" />
                        Redeem
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-ink-muted">
        CSV columns: <code>sold_at, amount, redeemed, status, product_name, buyer_name, buyer_email, recipient_name, recipient_email, card_code, source</code>
      </p>
    </DashboardShell>
  );
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = (cells[i] ?? '').trim()));
    return obj;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else cur += ch;
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQ = true;
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
