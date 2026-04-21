import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import { importFromGoHighLevel } from '@/server/ghl-import';
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
  Download, Search, ArrowUpRight, ArrowDownRight, Settings2, Clock, Save, CloudDownload, X, Plus,
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
  tags: string[] | null;
  unsubscribed_at: string | null;
};

type Segment = 'vip' | 'active' | 'new' | 'dormant' | 'never' | 'unsubscribed';

const SEGMENT_META: Record<
  Segment,
  { label: string; tone: string; description: string }
> = {
  vip: {
    label: 'VIP',
    tone: 'bg-amber-100 text-amber-900 border-amber-200',
    description: '5+ compras o gasto > $500',
  },
  active: {
    label: 'Active',
    tone: 'bg-emerald-soft text-emerald-deep border-emerald/30',
    description: 'Compra en los últimos 90 días',
  },
  new: {
    label: 'New',
    tone: 'bg-blue-100 text-blue-900 border-blue-200',
    description: 'Primera compra hace < 30 días',
  },
  dormant: {
    label: 'Dormant',
    tone: 'bg-orange-100 text-orange-900 border-orange-200',
    description: 'Sin comprar hace > 90 días',
  },
  never: {
    label: 'No purchases',
    tone: 'bg-paper-soft text-ink-muted border-hairline-strong',
    description: 'Sin compras registradas',
  },
  unsubscribed: {
    label: 'Unsubscribed',
    tone: 'bg-rose-100 text-rose-900 border-rose-200',
    description: 'Se dio de baja de emails',
  },
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function computeSegment(r: CustomerRow): Segment {
  if (r.unsubscribed_at) return 'unsubscribed';
  if (r.purchase_count === 0) return 'never';
  if (r.purchase_count >= 5 || r.total_spent_cents >= 50_000) return 'vip';
  const d = daysSince(r.last_purchase_at);
  if (d !== null && d <= 30) return 'new';
  if (d !== null && d <= 90) return 'active';
  return 'dormant';
}

function CustomersPage() {
  const { activeClientId } = useDashboard();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<Segment | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');

  const importGhl = useServerFn(importFromGoHighLevel);
  const ghlImport = useMutation({
    mutationFn: async () => {
      if (!activeClientId) throw new Error('No active workspace');
      return importGhl({ data: { clientId: activeClientId } });
    },
    onSuccess: (r) => {
      toast.success(
        `GHL import complete — Contacts: +${r.contacts.created} new, ${r.contacts.updated} updated · Sales: +${r.sales.created} new, ${r.sales.updated} updated`,
      );
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'GHL import failed'),
  });

  const customers = useQuery({
    queryKey: ['customers', activeClientId, search],
    enabled: !!activeClientId,
    queryFn: async () => {
      let q = supabase
        .from('customers')
        .select('id, email, first_name, last_name, full_name, phone, total_spent_cents, purchase_count, last_purchase_at, last_contact_at, loyalty_points, tags, unsubscribed_at')
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

  // Compute counts and tag list
  const enriched = useMemo(() => {
    return (customers.data ?? []).map((r) => ({ ...r, _segment: computeSegment(r) }));
  }, [customers.data]);

  const segmentCounts = useMemo(() => {
    const counts: Record<Segment, number> = {
      vip: 0, active: 0, new: 0, dormant: 0, never: 0, unsubscribed: 0,
    };
    for (const r of enriched) counts[r._segment]++;
    return counts;
  }, [enriched]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of enriched) for (const t of r.tags ?? []) set.add(t);
    return Array.from(set).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (segmentFilter !== 'all' && r._segment !== segmentFilter) return false;
      if (tagFilter !== 'all' && !(r.tags ?? []).includes(tagFilter)) return false;
      return true;
    });
  }, [enriched, segmentFilter, tagFilter]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = ['first_name', 'last_name', 'email', 'phone', 'segment', 'tags', 'loyalty_points', 'total_spent', 'purchases', 'last_purchase_at', 'days_since_purchase', 'last_contact_at'];
    const lines = [header.join(',')];
    for (const r of filtered) {
      const days = daysSince(r.last_purchase_at);
      lines.push(
        [
          escapeCsv(r.first_name ?? ''),
          escapeCsv(r.last_name ?? ''),
          r.email,
          escapeCsv(r.phone ?? ''),
          r._segment,
          escapeCsv((r.tags ?? []).join('|')),
          String(r.loyalty_points ?? 0),
          (r.total_spent_cents / 100).toFixed(2),
          String(r.purchase_count),
          r.last_purchase_at ?? '',
          days === null ? '' : String(days),
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => ghlImport.mutate()}
            disabled={ghlImport.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
          >
            <CloudDownload className="h-4 w-4" />
            {ghlImport.isPending ? 'Importing…' : 'Import from GoHighLevel'}
          </button>
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      }
    >
      {/* Search */}
      <div className="mb-3 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="h-10 w-full max-w-md rounded-sm border border-hairline-strong bg-paper pl-9 pr-3 text-[14px]"
        />
      </div>

      {/* Segment filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip
          active={segmentFilter === 'all'}
          onClick={() => setSegmentFilter('all')}
          label={`All · ${enriched.length}`}
        />
        {(Object.keys(SEGMENT_META) as Segment[]).map((s) => (
          <FilterChip
            key={s}
            active={segmentFilter === s}
            onClick={() => setSegmentFilter(s)}
            label={`${SEGMENT_META[s].label} · ${segmentCounts[s]}`}
            tone={SEGMENT_META[s].tone}
            title={SEGMENT_META[s].description}
            disabled={segmentCounts[s] === 0 && segmentFilter !== s}
          />
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">Tag:</span>
          <FilterChip
            active={tagFilter === 'all'}
            onClick={() => setTagFilter('all')}
            label="Any"
          />
          {allTags.map((t) => (
            <FilterChip
              key={t}
              active={tagFilter === t}
              onClick={() => setTagFilter(t)}
              label={t}
            />
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-sm border border-hairline bg-paper">
        <table className="w-full min-w-[900px] text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Last purchase</th>
              <th className="px-4 py-3 font-medium">Points</th>
              <th className="px-4 py-3 font-medium">Total spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-muted">
                  No customers match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const days = daysSince(r.last_purchase_at);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-hairline last:border-0 transition-colors hover:bg-paper-soft"
                  >
                    <td className="px-4 py-3 text-ink">
                      {r.full_name || `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.email}</td>
                    <td className="px-4 py-3">
                      <SegmentBadge segment={r._segment} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.tags ?? []).slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="inline-flex h-5 items-center rounded-sm border border-hairline bg-paper-soft px-1.5 text-[11px] text-ink-soft"
                          >
                            {t}
                          </span>
                        ))}
                        {(r.tags ?? []).length > 3 && (
                          <span className="text-[11px] text-ink-muted">+{(r.tags ?? []).length - 3}</span>
                        )}
                        {(r.tags ?? []).length === 0 && (
                          <span className="text-[12px] text-ink-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.last_purchase_at ? (
                        <span>
                          {formatDate(r.last_purchase_at)}
                          <span className="ml-1.5 text-[11px] text-ink-muted">
                            ({days === 0 ? 'today' : `${days}d ago`})
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-muted">Never</span>
                      )}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-ink-muted">
        Click a row to edit tags and details. Segments are calculated automatically from purchase activity.
        Use tags + segments to build email audiences from the Emails tab.
      </p>

      <CustomerDetailSheet
        customer={selected}
        allTags={allTags}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </DashboardShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tone,
  title,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-7 items-center rounded-sm border px-2.5 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'border-ink bg-ink text-paper'
          : tone
            ? `${tone} hover:opacity-80`
            : 'border-hairline-strong bg-paper text-ink-soft hover:bg-paper-soft'
      }`}
    >
      {label}
    </button>
  );
}

function SegmentBadge({ segment }: { segment: Segment }) {
  const m = SEGMENT_META[segment];
  return (
    <span
      title={m.description}
      className={`inline-flex h-5 items-center rounded-sm border px-1.5 text-[11px] font-medium ${m.tone}`}
    >
      {m.label}
    </span>
  );
}

function CustomerDetailSheet({
  customer,
  allTags,
  onOpenChange,
}: {
  customer: CustomerRow | null;
  allTags: string[];
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
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto bg-paper">
        {customer && (
          <CustomerEditor
            key={customer.id}
            customer={customer}
            allTags={allTags}
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
  allTags,
  onSave,
  saving,
  txns,
}: {
  customer: CustomerRow;
  allTags: string[];
  onSave: (patch: Partial<CustomerRow>) => void;
  saving: boolean;
  txns: ReturnType<typeof useQuery<unknown[], Error>>;
}) {
  const [first, setFirst] = useState(customer.first_name ?? '');
  const [last, setLast] = useState(customer.last_name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [tags, setTags] = useState<string[]>(customer.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const segment = computeSegment(customer);

  const dirty =
    first !== (customer.first_name ?? '') ||
    last !== (customer.last_name ?? '') ||
    phone !== (customer.phone ?? '') ||
    JSON.stringify(tags.slice().sort()) !== JSON.stringify((customer.tags ?? []).slice().sort());

  const addTag = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return;
    if (tags.includes(v)) return;
    setTags([...tags, v]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const suggestions = allTags.filter((t) => !tags.includes(t) && t.includes(tagInput.trim().toLowerCase())).slice(0, 6);

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

      <div className="mt-3">
        <SegmentBadge segment={segment} />
        <span className="ml-2 text-[12px] text-ink-muted">
          {SEGMENT_META[segment].description}
        </span>
      </div>

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

        {/* Tags editor */}
        <Field label="Tags">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 && (
                <span className="text-[12px] text-ink-muted">No tags yet — add one below.</span>
              )}
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex h-6 items-center gap-1 rounded-sm border border-hairline-strong bg-paper-soft px-1.5 text-[12px] text-ink"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-ink-muted hover:text-ink"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder="vip, bday-march, golf-club…"
                className="h-9 flex-1 rounded-sm border border-hairline-strong bg-paper px-2 text-[14px]"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
                className="inline-flex h-9 items-center gap-1 rounded-sm border border-hairline-strong bg-paper px-2.5 text-[12px] text-ink hover:bg-paper-soft disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {suggestions.length > 0 && tagInput && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[11px] text-ink-muted">Suggestions:</span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className="inline-flex h-5 items-center rounded-sm border border-hairline bg-paper px-1.5 text-[11px] text-ink-soft hover:bg-paper-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={!dirty || saving}
            onClick={() =>
              onSave({
                first_name: first.trim() || null,
                last_name: last.trim() || null,
                phone: phone.trim() || null,
                tags: tags.length ? tags : null,
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
      {customer.last_purchase_at && (
        <p className="mt-2 text-[12px] text-ink-muted">
          Last purchase: {formatDate(customer.last_purchase_at)}
          {' · '}
          {(() => {
            const d = daysSince(customer.last_purchase_at);
            return d === 0 ? 'today' : `${d} days ago`;
          })()}
        </p>
      )}

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
