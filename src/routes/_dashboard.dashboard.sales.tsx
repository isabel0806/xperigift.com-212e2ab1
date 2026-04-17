import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardShell,
  DashboardEmptyState,
  formatCurrencyCents,
  formatDate,
} from '@/components/dashboard/primitives';
import { toast } from 'sonner';
import { Upload, Download } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/sales')({
  component: SalesPage,
});

interface SaleRow {
  id: string;
  sold_at: string;
  amount_cents: number;
  redeemed_cents: number;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  recipient_name: string | null;
}

function SalesPage() {
  const { activeClientId } = useDashboard();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const sales = useQuery({
    queryKey: ['sales', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_sales')
        .select('id, sold_at, amount_cents, redeemed_cents, status, buyer_name, buyer_email, recipient_name')
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

  const filtered = useMemo(() => {
    if (!sales.data) return [];
    if (filterStatus === 'all') return sales.data;
    return sales.data.filter((r) => r.status === filterStatus);
  }, [sales.data, filterStatus]);

  const exportCsv = () => {
    if (!sales.data?.length) return;
    const header = ['sold_at', 'amount', 'redeemed', 'status', 'buyer_name', 'buyer_email', 'recipient_name'];
    const lines = [header.join(',')];
    for (const r of sales.data) {
      lines.push(
        [
          r.sold_at,
          (r.amount_cents / 100).toFixed(2),
          (r.redeemed_cents / 100).toFixed(2),
          r.status,
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

  return (
    <DashboardShell
      title="Sales"
      subtitle="Every gift card sold and how much has been redeemed."
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
      <div className="mb-4 flex items-center gap-3">
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
        <p className="text-[13px] text-ink-muted">{filtered.length} rows</p>
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Redeemed</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
            </tr>
          </thead>
          <tbody>
            {sales.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  No sales yet. Import a CSV to get started.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(r.sold_at)}</td>
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
                  <td className="px-4 py-3 text-ink-soft">{r.recipient_name || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-ink-muted">
        CSV columns: <code>sold_at, amount, redeemed, status, buyer_name, buyer_email, recipient_name, recipient_email, card_code, source</code>
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
