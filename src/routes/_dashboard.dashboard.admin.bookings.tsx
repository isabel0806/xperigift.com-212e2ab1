import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import {
  DashboardShell,
  DashboardEmptyState,
  formatDateTime,
} from '@/components/dashboard/primitives';

export const Route = createFileRoute('/_dashboard/dashboard/admin/bookings')({
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const { isAdmin } = useAuth();

  const bookings = useQuery({
    queryKey: ['admin-bookings'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_bookings')
        .select('*')
        .order('scheduled_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin) {
    return (
      <DashboardShell title="Audit bookings">
        <DashboardEmptyState title="Admin only." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Audit bookings"
      subtitle="Every prospect that booked a Gift Card Revenue Audit."
    >
      <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
        <table className="w-full text-[14px]">
          <thead className="border-b border-hairline bg-paper-soft text-left text-[12px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">Loading…</td></tr>
            ) : bookings.data?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">No bookings yet.</td></tr>
            ) : (
              bookings.data?.map((b) => (
                <tr key={b.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDateTime(b.scheduled_at)}</td>
                  <td className="px-4 py-3 text-ink">
                    <div className="font-medium">{b.full_name}</div>
                    <div className="text-[12px] text-ink-muted">{b.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{b.business_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{b.industry}</td>
                  <td className="px-4 py-3 text-ink-soft">{b.revenue_band}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 items-center rounded-sm bg-paper-soft px-2 text-[12px] text-ink-soft">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
