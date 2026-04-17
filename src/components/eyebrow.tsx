import type { ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-ink-muted">
      <span className="h-px w-6 bg-hairline-strong" aria-hidden />
      {children}
    </div>
  );
}
