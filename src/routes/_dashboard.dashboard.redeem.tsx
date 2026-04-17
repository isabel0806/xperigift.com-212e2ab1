import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardShell,
  DashboardEmptyState,
  formatCurrencyCents,
  formatDate,
} from '@/components/dashboard/primitives';
import { RedeemDialog, type RedeemSale } from '@/components/redeem-dialog';
import { ScanLine, Search } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/redeem')({
  component: RedeemPage,
});

function RedeemPage() {
  const { activeClientId } = useDashboard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [submittedCode, setSubmittedCode] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeClientId]);

  const lookup = useQuery({
    queryKey: ['redeem-lookup', activeClientId, submittedCode],
    enabled: !!activeClientId && submittedCode.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_sales')
        .select(
          'id, client_id, card_code, amount_cents, redeemed_cents, status, buyer_name, buyer_email, recipient_name, product_name, sold_at',
        )
        .eq('client_id', activeClientId!)
        .ilike('card_code', submittedCode.trim())
        .maybeSingle();
      if (error) throw error;
      return (data as RedeemSale | null) ?? null;
    },
  });

  const recent = useQuery({
    queryKey: ['redemptions', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_redemptions')
        .select('id, amount_cents, redeemed_at, card_code_snapshot, note')
        .eq('client_id', activeClientId!)
        .order('redeemed_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;
    setSubmittedCode(v);
  };

  if (!activeClientId) {
    return (
      <DashboardShell title="Redeem">
        <DashboardEmptyState title="Select a workspace to redeem cards." />
      </DashboardShell>
    );
  }

  const sale = lookup.data;

  return (
    <DashboardShell
      title="Redeem"
      subtitle="Scan or type a gift card code to look it up and redeem the balance."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-sm border border-hairline bg-paper p-6"
      >
        <label className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-ink-muted">
          <ScanLine className="h-4 w-4" />
          Card code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Scan or type code…"
            autoComplete="off"
            spellCheck={false}
            className="h-11 flex-1 rounded-sm border border-hairline-strong bg-paper px-3 font-mono text-[15px] text-ink"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-sm bg-ink px-4 text-[13px] text-paper hover:bg-ink-soft"
          >
            <Search className="h-4 w-4" />
            Look up
          </button>
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">
          Scanners that emit Enter at the end will auto-submit.
        </p>
      </form>

      {/* Result */}
      {submittedCode && (
        <div className="mt-6 rounded-sm border border-hairline bg-paper p-6">
          {lookup.isLoading ? (
            <p className="text-[13px] text-ink-muted">Searching…</p>
          ) : !sale ? (
            <p className="text-[13px] text-ink-muted">
              No card found with code <span className="font-mono text-ink">{submittedCode}</span> in
              this workspace.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[12px] uppercase tracking-wide text-ink-muted">Found</p>
                <p className="mt-1 font-display text-[20px] text-ink">
                  {sale.product_name || 'Gift card'}
                </p>
                <p className="text-[13px] text-ink-soft">
                  {sale.buyer_name || sale.buyer_email || 'Unknown buyer'} ·{' '}
                  {formatDate(sale.sold_at)}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">Remaining</p>
                  <p className="font-display text-[22px] text-emerald">
                    {formatCurrencyCents(sale.amount_cents - sale.redeemed_cents)}
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    of {formatCurrencyCents(sale.amount_cents)}
                  </p>
                </div>
                <button
                  onClick={() => setDialogOpen(true)}
                  disabled={sale.amount_cents - sale.redeemed_cents <= 0}
                  className="h-10 rounded-sm bg-ink px-4 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
                >
                  {sale.amount_cents - sale.redeemed_cents <= 0 ? 'Fully redeemed' : 'Redeem'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent redemptions */}
      <div className="mt-8 overflow-hidden rounded-sm border border-hairline bg-paper">
        <div className="border-b border-hairline px-5 py-3">
          <h2 className="font-display text-[16px] text-ink">Recent redemptions</h2>
        </div>
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {recent.isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : (recent.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  No redemptions yet.
                </td>
              </tr>
            ) : (
              recent.data!.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                    {formatDate(r.redeemed_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink">
                    {r.card_code_snapshot || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {formatCurrencyCents(r.amount_cents)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.note || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RedeemDialog
        sale={sale ?? null}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          // refocus for the next scan
          setCode('');
          setSubmittedCode('');
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      />
    </DashboardShell>
  );
}
