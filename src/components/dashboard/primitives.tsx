import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-8 md:py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-[28px] md:text-[34px] leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[14px] text-ink-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-sm border border-hairline bg-paper p-5">
      <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-3 font-display text-[28px] leading-none text-ink">
        {loading ? <Loader2 className="h-6 w-6 animate-spin text-ink-muted" /> : value}
      </p>
      {hint && <p className="mt-2 text-[12px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function DashboardEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-hairline-strong bg-paper p-10 text-center">
      <h3 className="font-display text-[20px] text-ink">{title}</h3>
      {description && <p className="mt-2 text-[14px] text-ink-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function formatCurrencyCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
