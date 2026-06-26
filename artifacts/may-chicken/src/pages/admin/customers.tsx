import { AdminLayout } from "@/components/admin-layout";
import { useListCustomers, getListCustomersQueryKey, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Users } from "lucide-react";

export default function AdminCustomers() {
  const [, navigate] = useLocation();
  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: customers, isLoading } = useListCustomers({ query: { queryKey: getListCustomersQueryKey() } });

  if (!sl && !session?.authenticated) { navigate("/admin"); return null; }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Customers</h1>
        <p className="text-muted-foreground mt-1">{customers?.length ?? 0} total customers</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
      ) : customers?.length === 0 ? (
        <div className="bg-card border border-border p-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No customers yet. They'll appear here after placing orders.</p>
        </div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider text-right">Orders</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider text-right">Spent</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers?.map((c, i) => (
                <tr key={i} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-white text-right font-mono">{c.orderCount}</td>
                  <td className="px-4 py-3 text-white text-right font-mono">£{c.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
