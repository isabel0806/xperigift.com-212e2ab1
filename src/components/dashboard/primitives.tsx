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

type Tone = 'default' | 'emerald' | 'ink' | 'amber' | 'sky';

const toneClasses: Record<Tone, { wrap: string; label: string; value: string; hint: string }> = {
  default: {
    wrap: 'border-hairline bg-paper',
    label: 'text-ink-muted',
    value: 'text-ink',
    hint: 'text-ink-muted',
  },
  emerald: {
    wrap: 'border-emerald/30 bg-emerald-soft',
    label: 'text-emerald-deep/80',
    value: 'text-emerald-deep',
    hint: 'text-emerald-deep/70',
  },
  ink: {
    wrap: 'border-ink bg-ink',
    label: 'text-paper/70',
    value: 'text-paper',
    hint: 'text-paper/60',
  },
  amber: {
    wrap: 'border-[oklch(0.78_0.13_75)] bg-[oklch(0.97_0.04_75)]',
    label: 'text-[oklch(0.4_0.1_60)]',
    value: 'text-[oklch(0.32_0.1_55)]',
    hint: 'text-[oklch(0.4_0.1_60)]',
  },
  sky: {
    wrap: 'border-[oklch(0.78_0.07_230)] bg-[oklch(0.97_0.025_230)]',
    label: 'text-[oklch(0.38_0.1_240)]',
    value: 'text-[oklch(0.3_0.1_240)]',
    hint: 'text-[oklch(0.38_0.1_240)]',
  },
};

export function KpiCard({
  label,
  value,
  hint,
  loading,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  tone?: Tone;
  icon?: ReactNode;
}) {
  const c = toneClasses[tone];
  return (
    <div className={`rounded-sm border p-5 ${c.wrap}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[12px] uppercase tracking-[0.14em] ${c.label}`}>{label}</p>
        {icon && <span className={c.value}>{icon}</span>}
      </div>
      <p className={`mt-3 font-display text-[28px] leading-none ${c.value}`}>
        {loading ? <Loader2 className="h-6 w-6 animate-spin opacity-60" /> : value}
      </p>
      {hint && <p className={`mt-2 text-[12px] ${c.hint}`}>{hint}</p>}
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

/**
 * Horizontal bar in a list — used for top-products / breakdown views.
 * Accent palette is consistent across the dashboard.
 */
export const CHART_PALETTE = [
  'oklch(0.42 0.09 165)', // emerald
  'oklch(0.55 0.14 240)', // sky
  'oklch(0.62 0.16 55)',  // amber
  'oklch(0.5 0.16 320)',  // magenta
  'oklch(0.55 0.14 200)', // teal
  'oklch(0.45 0.1 285)',  // violet
  'oklch(0.6 0.15 25)',   // coral
];

export function HBar({
  label,
  valueText,
  ratio,
  color,
}: {
  label: string;
  valueText: string;
  ratio: number;
  color: string;
}) {
  const pct = Math.max(2, Math.min(100, ratio * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate text-ink">{label}</span>
        <span className="tabular-nums text-ink-soft">{valueText}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-soft">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
