import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { DashboardProvider } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, BarChart3, Users, Mail, Settings, LogOut, Building2 } from 'lucide-react';

export const Route = createFileRoute('/_dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard — xperigift' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login', search: { redirect: pathname } });
    }
  }, [loading, user, navigate, pathname]);

  const clientsQuery = useQuery({
    queryKey: ['clients-for-user', user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, industry, is_active')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const clients = clientsQuery.data ?? [];

  useEffect(() => {
    if (!clients.length) return;
    if (activeClientId && clients.some((c) => c.id === activeClientId)) return;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('xg.activeClientId') : null;
    const initial = stored && clients.some((c) => c.id === stored) ? stored : clients[0].id;
    setActiveClientId(initial);
  }, [clients, activeClientId]);

  useEffect(() => {
    if (activeClientId && typeof window !== 'undefined') {
      localStorage.setItem('xg.activeClientId', activeClientId);
    }
  }, [activeClientId]);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === activeClientId) ?? null,
    [clients, activeClientId],
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-[14px] text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <DashboardProvider
      value={{
        activeClientId,
        activeClientName: activeClient?.name ?? null,
        isAdmin,
      }}
    >
      <div className="flex min-h-screen bg-paper-soft">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-hairline bg-paper">
          <div className="flex h-16 items-center border-b border-hairline px-5">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-[20px] font-semibold tracking-tight text-ink leading-none lowercase">
                xperigift
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            </Link>
          </div>

          <div className="border-b border-hairline px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Workspace</p>
            {clients.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-muted">No clients assigned yet.</p>
            ) : (
              <select
                value={activeClientId ?? ''}
                onChange={(e) => setActiveClientId(e.target.value)}
                className="mt-2 w-full rounded-sm border border-hairline-strong bg-paper px-2 h-9 text-[14px] text-ink"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <nav className="flex-1 px-3 py-4">
            <ul className="space-y-1">
              <NavItem to="/dashboard" label="Overview" icon={LayoutDashboard} exact />
              <NavItem to="/dashboard/sales" label="Sales" icon={BarChart3} />
              <NavItem to="/dashboard/customers" label="Customers" icon={Users} />
              <NavItem to="/dashboard/emails" label="Emails" icon={Mail} />
            </ul>

            {isAdmin && (
              <>
                <p className="mt-6 mb-2 px-3 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  Admin
                </p>
                <ul className="space-y-1">
                  <NavItem to="/dashboard/admin/clients" label="Clients" icon={Building2} />
                  <NavItem to="/dashboard/admin/bookings" label="Audit bookings" icon={Settings} />
                </ul>
              </>
            )}
          </nav>

          <div className="border-t border-hairline px-4 py-4">
            <p className="truncate text-[12px] text-ink-muted">{user.email}</p>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: '/login' });
              }}
              className="mt-2 inline-flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile bar */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-paper px-4">
          <Link to="/" className="font-display text-[18px] font-semibold lowercase">
            xperigift
          </Link>
          {clients.length > 0 && (
            <select
              value={activeClientId ?? ''}
              onChange={(e) => setActiveClientId(e.target.value)}
              className="rounded-sm border border-hairline-strong bg-paper px-2 h-9 text-[13px] text-ink"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <main className="flex-1 pt-14 md:pt-0">
          <Outlet />
        </main>
      </div>
    </DashboardProvider>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-sm px-3 py-2 text-[14px] text-ink-soft hover:bg-paper-soft hover:text-ink"
        activeProps={{ className: 'bg-ink/5 text-ink font-medium' }}
        activeOptions={{ exact }}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </li>
  );
}
