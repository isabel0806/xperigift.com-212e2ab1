import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardShell,
  DashboardEmptyState,
  formatCurrencyCents,
  formatDate,
} from '@/components/dashboard/primitives';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  Download, Search, ArrowUpRight, ArrowDownRight, Settings2, Clock, Save,
} from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/customers')({
  component: CustomersPage,
});

type CustomerRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  total_spent_cents: number;
  purchase_count: number;
  last_purchase_at: string | null;
  last_contact_at: string | null;
  loyalty_points: number;
};

function CustomersPage() {
  const { activeClientId } = useDashboard();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const customers = useQuery({
    queryKey: ['customers', activeClientId, search],
    enabled: !!activeClientId,
    queryFn: async () => {
      let q = supabase
        .from('customers')
        .select('id, email, first_name, last_name, full_name, phone, total_spent_cents, purchase_count, last_purchase_at, last_contact_at, loyalty_points')
        .eq('client_id', activeClientId!)
        .order('loyalty_points', { ascending: false })
        .limit(500);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`email.ilike.${term},full_name.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });

  const exportCsv = () => {
    if (!customers.data?.length) return;
    const header = ['first_name', 'last_name', 'email', 'phone', 'loyalty_points', 'total_spent', 'purchases', 'last_purchase_at', 'last_contact_at'];
    const lines = [header.join(',')];
    for (const r of customers.data) {
      lines.push(
        [
          escapeCsv(r.first_name ?? ''),
          escapeCsv(r.last_name ?? ''),
          r.email,
          escapeCsv(r.phone ?? ''),
          String(r.loyalty_points ?? 0),
          (r.total_spent_cents / 100).toFixed(2),
          String(r.purchase_count),
          r.last_purchase_at ?? '',
          r.last_contact_at ?? '',
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
          placeholder="Search by name or email…"
          className="h-10 w-full max-w-md rounded-sm border border-hairline-strong bg-paper pl-9 pr-3 text-[14px]"
        />
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">First name</th>
              <th className="px-4 py-3 font-medium">Last name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Last contact</th>
              <th className="px-4 py-3 font-medium">Points</th>
              <th className="px-4 py-3 font-medium">Total spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">Loading…</td>
              </tr>
            ) : customers.data?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-muted">No customers yet.</td>
              </tr>
            ) : (
              customers.data?.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-hairline last:border-0 transition-colors hover:bg-paper-soft"
                >
                  <td className="px-4 py-3 text-ink">{r.first_name || '—'}</td>
                  <td className="px-4 py-3 text-ink">{r.last_name || '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.phone || '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.last_contact_at ? formatDate(r.last_contact_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 items-center rounded-sm bg-emerald-soft px-2 text-[12px] font-medium text-emerald-deep">
                      {(r.loyalty_points ?? 0).toLocaleString()} pts
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {formatCurrencyCents(r.total_spent_cents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-ink-muted">
        Click a row to edit details and see loyalty history. Points are awarded automatically on each gift card purchase.
      </p>

      <CustomerDetailSheet
        customer={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </DashboardShell>
  );
}

function CustomerDetailSheet({
  customer,
  onOpenChange,
}: {
  customer: CustomerRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!customer;
  const qc = useQueryClient();

  const txns = useQuery({
    queryKey: ['loyalty-txns', customer?.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select(
          'id, type, points, balance_after, note, created_at, gift_card_sale_id, gift_card_sales(amount_cents, sold_at, card_code, source, product_name)',
        )
        .eq('customer_id', customer!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<CustomerRow>) => {
      if (!customer) return;
      const { error } = await supabase
        .from('customers')
        .update(patch)
        .eq('id', customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto bg-paper">
        {customer && (
          <CustomerEditor
            key={customer.id}
            customer={customer}
            onSave={(patch) => update.mutate(patch)}
            saving={update.isPending}
            txns={txns}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CustomerEditor({
  customer,
  onSave,
  saving,
  txns,
}: {
  customer: CustomerRow;
  onSave: (patch: Partial<CustomerRow>) => void;
  saving: boolean;
  txns: ReturnType<typeof useQuery<unknown[], Error>>;
}) {
  const [first, setFirst] = useState(customer.first_name ?? '');
  const [last, setLast] = useState(customer.last_name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');

  const dirty =
    first !== (customer.first_name ?? '') ||
    last !== (customer.last_name ?? '') ||
    phone !== (customer.phone ?? '');

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-[24px] leading-tight text-ink">
          {customer.full_name || customer.email}
        </SheetTitle>
        <SheetDescription className="text-[13px] text-ink-soft">
          {customer.email}
        </SheetDescription>
      </SheetHeader>

      {/* Editable fields */}
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="h-9 w-full rounded-sm border border-hairline-strong bg-paper px-2 text-[14px]"
            />
          </Field>
          <Field label="Last name">
            <input
              value={last}
              onChange={(e) => setLast(e.target.value)}
              className="h-9 w-full rounded-sm border border-hairline-strong bg-paper px-2 text-[14px]"
            />
          </Field>
        </div>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9 w-full rounded-sm border border-hairline-strong bg-paper px-2 text-[14px]"
          />
        </Field>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={!dirty || saving}
            onClick={() =>
              onSave({
                first_name: first.trim() || null,
                last_name: last.trim() || null,
                phone: phone.trim() || null,
              })
            }
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            disabled={saving}
            onClick={() => onSave({ last_contact_at: new Date().toISOString() })}
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
          >
            Mark contacted today
          </button>
        </div>
        {customer.last_contact_at && (
          <p className="text-[12px] text-ink-muted">
            Last contact: {formatDate(customer.last_contact_at)}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <SummaryCard label="Points" value={(customer.loyalty_points ?? 0).toLocaleString()} highlight />
        <SummaryCard label="Spent" value={formatCurrencyCents(customer.total_spent_cents)} />
        <SummaryCard label="Purchases" value={String(customer.purchase_count)} />
      </div>

      {/* Loyalty history */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Loyalty history
          </h3>
          {txns.data && txns.data.length > 0 && (
            <span className="text-[12px] text-ink-muted">
              {txns.data.length} {txns.data.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {txns.isLoading ? (
          <p className="py-8 text-center text-[13px] text-ink-muted">Loading history…</p>
        ) : txns.error ? (
          <p className="py-8 text-center text-[13px] text-destructive">Could not load history.</p>
        ) : !txns.data || txns.data.length === 0 ? (
          <div className="rounded-sm border border-dashed border-hairline-strong p-6 text-center">
            <Clock className="mx-auto h-5 w-5 text-ink-muted" />
            <p className="mt-2 text-[13px] text-ink-muted">No loyalty activity yet.</p>
          </div>
        ) : (
          <ol className="relative space-y-0">
            {(txns.data as Array<{
              id: string; type: string; points: number; balance_after: number; note: string | null; created_at: string;
              gift_card_sales: { amount_cents: number; sold_at: string; card_code: string | null; source: string | null; product_name: string | null } | null;
            }>).map((t, idx, arr) => {
              const sale = t.gift_card_sales;
              const positive = t.points >= 0 && t.type !== 'redeemed' && t.type !== 'expired';
              return (
                <li key={t.id} className="relative flex gap-3 border-l border-hairline pl-4 pb-5">
                  <span
                    className={`absolute -left-[5px] top-1 h-[9px] w-[9px] rounded-full border-2 border-paper ${
                      positive ? 'bg-emerald' : 'bg-ink-muted'
                    }`}
                    aria-hidden
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[14px] font-medium text-ink">{labelForType(t.type)}</p>
                      <span
                        className={`inline-flex items-center gap-1 text-[13px] font-medium tabular-nums ${
                          positive ? 'text-emerald-deep' : 'text-ink'
                        }`}
                      >
                        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {positive ? '+' : ''}
                        {t.points.toLocaleString()} pts
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {formatDate(t.created_at)} · Balance:{' '}
                      <span className="text-ink-soft">{t.balance_after.toLocaleString()} pts</span>
                    </p>
                    {sale && (
                      <div className="mt-2 rounded-sm border border-hairline bg-paper-soft px-3 py-2 text-[12px] text-ink-soft">
                        <div className="flex items-center justify-between">
                          <span>{sale.product_name || 'Gift card sale'}</span>
                          <span className="font-medium text-ink">{formatCurrencyCents(sale.amount_cents)}</span>
                        </div>
                        {sale.card_code && (
                          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">{sale.card_code}</p>
                        )}
                      </div>
                    )}
                    {!sale && t.type === 'adjustment' && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-ink-muted">
                        <Settings2 className="h-3 w-3" /> Manual adjustment
                      </p>
                    )}
                    {t.note && <p className="mt-1.5 text-[12px] italic text-ink-muted">"{t.note}"</p>}
                  </div>
                  {idx === arr.length - 1 && (
                    <span className="absolute -left-px bottom-0 h-5 w-px bg-paper" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-soft">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border p-3 ${
        highlight ? 'border-emerald bg-emerald-soft' : 'border-hairline bg-paper-soft'
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-[0.14em] ${
          highlight ? 'text-emerald-deep/80' : 'text-ink-muted'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[18px] leading-none ${
          highlight ? 'text-emerald-deep' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function labelForType(t: string): string {
  switch (t) {
    case 'earned':
      return 'Points earned';
    case 'redeemed':
      return 'Points redeemed';
    case 'adjustment':
      return 'Manual adjustment';
    case 'expired':
      return 'Points expired';
    default:
      return t;
  }
}

function escapeCsv(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
