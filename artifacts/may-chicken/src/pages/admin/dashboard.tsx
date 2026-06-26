import { AdminLayout } from "@/components/admin-layout";
import { useGetAdminStats, getGetAdminStatsQueryKey, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { TrendingUp, ShoppingBag, Clock, DollarSign, Star } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={`bg-card border p-6 ${accent ? "border-primary" : "border-border"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 ${accent ? "bg-primary/20" : "bg-secondary"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-3xl font-display font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-muted-foreground uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: session, isLoading: sessionLoading } = useGetAdminSession({
    query: { queryKey: getGetAdminSessionQueryKey() }
  });
  const { data: stats, isLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() }
  });

  if (!sessionLoading && !session?.authenticated) {
    navigate("/admin");
    return null;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Übersicht deines Restaurants.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-6 h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Bestellungen heute" value={String(stats?.todayOrders ?? 0)} icon={ShoppingBag} accent />
            <StatCard label="Offene Bestellungen" value={String(stats?.pendingOrders ?? 0)} icon={Clock} sub="Benötigen Aufmerksamkeit" />
            <StatCard label="Umsatz heute" value={`${(stats?.todayRevenue ?? 0).toFixed(2)} €`} icon={DollarSign} />
            <StatCard label="Wochenumsatz" value={`${(stats?.weekRevenue ?? 0).toFixed(2)} €`} icon={TrendingUp} />
          </div>

          {stats?.popularItems && stats.popularItems.length > 0 && (
            <div className="bg-card border border-border p-6">
              <div className="flex items-center gap-2 mb-6">
                <Star className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold uppercase text-white">Beliebteste Artikel</h2>
              </div>
              <div className="space-y-3">
                {stats.popularItems.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-bold text-sm w-5">{i + 1}.</span>
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">{item.orderCount}× bestellt</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
