import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/industries', label: 'Industries' },
  { to: '/about', label: 'About' },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <span className="font-display text-[22px] font-semibold tracking-tight text-ink leading-none lowercase">
            xperigift
          </span>
          <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[14px] text-ink-soft hover:text-ink transition-colors"
              activeProps={{ className: 'text-ink font-medium' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-5">
          <Link
            to="/login"
            className="text-[14px] text-ink-soft hover:text-ink transition-colors"
            activeProps={{ className: 'text-ink font-medium' }}
          >
            Client sign in
          </Link>
          <Link
            to="/book-audit"
            className="inline-flex h-10 items-center rounded-sm bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Book your audit
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-hairline bg-paper">
          <nav className="mx-auto flex max-w-[1200px] flex-col px-5 py-4 gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-sm px-3 py-3 text-[15px] text-ink-soft hover:bg-paper-soft"
                activeProps={{ className: 'text-ink font-medium' }}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/book-audit"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-sm bg-ink px-5 text-[14px] font-medium text-paper"
              onClick={() => setOpen(false)}
            >
              Book your audit
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
