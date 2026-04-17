import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: 'Client login — xperigift' },
      { name: 'description', content: 'Sign in to your xperigift dashboard.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, loading, user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → bounce
  if (!loading && user) {
    navigate({ to: search.redirect ?? '/dashboard' });
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      await router.invalidate();
      navigate({ to: search.redirect ?? '/dashboard' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not sign in';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-[22px] font-semibold tracking-tight text-ink leading-none lowercase">
              xperigift
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
          </Link>
          <Link to="/" className="text-[14px] text-ink-soft hover:text-ink">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-[400px]">
          <p className="text-[12px] uppercase tracking-[0.16em] text-ink-muted">Client portal</p>
          <h1 className="mt-3 font-display text-[36px] leading-[1.1] text-ink">Sign in</h1>
          <p className="mt-3 text-[15px] text-ink-soft">
            Access your gift card revenue data, customers, and campaigns.
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 h-11 text-[15px] text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-3 h-11 text-[15px] text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-[13px] text-ink-muted">
            Accounts are issued by xperigift. Need access?{' '}
            <Link to="/book-audit" className="underline decoration-hairline-strong underline-offset-4 hover:text-ink">
              Book an audit
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
