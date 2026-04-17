import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Mobile-only sticky CTA that appears after the user scrolls past the hero.
 * Hidden on /book-audit (already on the conversion page).
 */
export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const onBookingPage = location.pathname.startsWith('/book-audit');

  useEffect(() => {
    if (onBookingPage) return;
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onBookingPage]);

  if (onBookingPage) return null;

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-paper/95 backdrop-blur-md px-4 py-3 transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <Link
        to="/book-audit"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-ink text-[15px] font-medium text-paper"
      >
        Book your free audit <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
