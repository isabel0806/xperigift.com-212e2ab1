import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { formatCurrencyCents, formatDate } from '@/components/dashboard/primitives';
import { X } from 'lucide-react';

export interface RedeemSale {
  id: string;
  client_id: string;
  card_code: string | null;
  amount_cents: number;
  redeemed_cents: number;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  recipient_name: string | null;
  product_name: string | null;
  sold_at: string;
}

export function RedeemDialog({
  sale,
  open,
  onClose,
}: {
  sale: RedeemSale | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const remaining = sale ? sale.amount_cents - sale.redeemed_cents : 0;

  useEffect(() => {
    if (open && sale) {
      setAmount((remaining / 100).toFixed(2));
      setNote('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, sale, remaining]);

  const redeem = useMutation({
    mutationFn: async (full: boolean) => {
      if (!sale) throw new Error('No card selected');
      const cents = full ? remaining : Math.round(parseFloat(amount) * 100);
      if (!Number.isFinite(cents) || cents <= 0) throw new Error('Enter a valid amount');
      if (cents > remaining) throw new Error('Amount exceeds remaining balance');

      const { error } = await supabase.from('gift_card_redemptions').insert({
        gift_card_sale_id: sale.id,
        client_id: sale.client_id,
        amount_cents: cents,
        redeemed_by: user?.id ?? null,
        card_code_snapshot: sale.card_code,
        note: note.trim() || null,
      });
      if (error) throw error;
      return cents;
    },
    onSuccess: (cents) => {
      toast.success(`Redeemed ${formatCurrencyCents(cents)}`);
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['redeem-lookup'] });
      qc.invalidateQueries({ queryKey: ['redemptions'] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Redeem failed'),
  });

  if (!open || !sale) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-sm border border-hairline-strong bg-paper shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="font-display text-[18px] text-ink">Redeem gift card</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-sm bg-paper-soft px-3 py-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-muted">Code</span>
              <span className="font-mono text-ink">{sale.card_code || '—'}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-ink-muted">Buyer</span>
              <span className="text-ink">
                {sale.buyer_name || sale.buyer_email || '—'}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-ink-muted">Sold</span>
              <span className="text-ink">{formatDate(sale.sold_at)}</span>
            </div>
            {sale.product_name && (
              <div className="mt-1 flex justify-between">
                <span className="text-ink-muted">Product</span>
                <span className="text-ink">{sale.product_name}</span>
              </div>
            )}
            <div className="mt-2 border-t border-hairline pt-2 flex justify-between">
              <span className="text-ink-muted">Original</span>
              <span className="text-ink">{formatCurrencyCents(sale.amount_cents)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-ink-muted">Already redeemed</span>
              <span className="text-ink">{formatCurrencyCents(sale.redeemed_cents)}</span>
            </div>
            <div className="mt-1 flex justify-between font-medium">
              <span className="text-ink">Remaining</span>
              <span className="text-emerald">{formatCurrencyCents(remaining)}</span>
            </div>
          </div>

          {remaining <= 0 ? (
            <p className="rounded-sm bg-paper-soft px-3 py-3 text-center text-[13px] text-ink-muted">
              This card has been fully redeemed.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-[12px] uppercase tracking-wide text-ink-muted">
                  Amount to redeem ($)
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(remaining / 100).toFixed(2)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') redeem.mutate(false);
                  }}
                  className="mt-1 h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[15px] text-ink"
                />
              </div>

              <div>
                <label className="block text-[12px] uppercase tracking-wide text-ink-muted">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. ticket #1234"
                  className="mt-1 h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px] text-ink"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => redeem.mutate(true)}
                  disabled={redeem.isPending}
                  className="flex-1 h-10 rounded-sm border border-hairline-strong bg-paper text-[13px] text-ink hover:bg-paper-soft disabled:opacity-60"
                >
                  Redeem full ({formatCurrencyCents(remaining)})
                </button>
                <button
                  onClick={() => redeem.mutate(false)}
                  disabled={redeem.isPending}
                  className="flex-1 h-10 rounded-sm bg-ink text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
                >
                  {redeem.isPending ? 'Redeeming…' : 'Redeem amount'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
