import { Link } from '@tanstack/react-router';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline bg-paper">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[22px] font-semibold tracking-tight text-ink leading-none lowercase">
                xperigift
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            </div>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
              A done-with-you system that turns your gift card program into a
              measurable revenue engine. Strategy, execution, and infrastructure —
              handled.
            </p>
            <p className="mt-4 text-[13px] text-ink-muted">
              Powered by{' '}
              <a
                href="https://thegiftcardcafe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-hairline-strong underline-offset-4 hover:text-ink"
              >
                TheGiftCardCafe
              </a>
              .
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">
              Company
            </p>
            <ul className="mt-4 space-y-3 text-[14px]">
              <li><Link to="/how-it-works" className="text-ink-soft hover:text-ink">How it works</Link></li>
              <li><Link to="/industries" className="text-ink-soft hover:text-ink">Industries</Link></li>
              <li><Link to="/about" className="text-ink-soft hover:text-ink">About</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">
              Get started
            </p>
            <p className="mt-4 text-[14px] text-ink-soft">
              30-minute Gift Card Revenue Audit. No pitch — you'll leave with two
              to three specific revenue opportunities.
            </p>
            <Link
              to="/book-audit"
              className="mt-5 inline-flex h-10 items-center rounded-sm bg-ink px-5 text-[14px] font-medium text-paper hover:bg-ink-soft"
            >
              Book your audit
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-hairline pt-6">
          <p className="text-[12px] text-ink-muted">© {year} xperigift. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/login" className="text-[12px] text-ink-muted hover:text-ink">
              Client login
            </Link>
            <p className="text-[12px] text-ink-muted">US-based. Built for operators.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
