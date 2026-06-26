import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListCustomers,
  useGetAdminCustomer,
  getListCustomersQueryKey,
  getGetAdminCustomerQueryKey,
  useGetAdminSession,
  getGetAdminSessionQueryKey,
  Customer,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Users, ChevronRight, X, ShoppingBag, Heart, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  preparing: "bg-orange-500/20 text-orange-400",
  ready: "bg-green-500/20 text-green-400",
  delivering: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend", confirmed: "Bestätigt", preparing: "In Zubereitung",
  ready: "Fertig", delivering: "Unterwegs", completed: "Abgeschlossen", cancelled: "Storniert",
};

function CustomerDetailPanel({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const { data: detail, isLoading } = useGetAdminCustomer(customerId, {
    query: { queryKey: getGetAdminCustomerQueryKey(customerId) },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Lade Kundendaten…</div>
      </div>
    );
  }
  if (!detail) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold uppercase text-white">
            {detail.firstName} {detail.lastName}
          </h2>
          <p className="text-muted-foreground text-sm">{detail.email}</p>
          {detail.phone && <p className="text-muted-foreground text-sm">{detail.phone}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Kunde seit {new Date(detail.createdAt).toLocaleDateString("de-DE")}
          </p>
        </div>
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-white" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border p-3 text-center">
          <div className="text-2xl font-bold text-white">{detail.orderCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Bestellungen</div>
        </div>
        <div className="bg-card border border-border p-3 text-center">
          <div className="text-2xl font-bold text-primary">{detail.totalSpent.toFixed(2)} €</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Umsatz</div>
        </div>
        <div className="bg-card border border-border p-3 text-center">
          <div className="text-lg font-bold text-white">
            {detail.lastOrderAt ? new Date(detail.lastOrderAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "—"}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Letzte Best.</div>
        </div>
      </div>

      {/* Top items */}
      {detail.topItems && detail.topItems.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Lieblingsprodukte
          </h3>
          <div className="space-y-1">
            {detail.topItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-card border border-border px-3 py-2">
                <span className="text-white">{item.itemName}</span>
                <span className="text-muted-foreground">{item.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved notes */}
      {detail.notes && detail.notes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Gespeicherte Notizen
          </h3>
          <div className="flex flex-wrap gap-2">
            {detail.notes.map((n) => (
              <span key={n.id} className="text-xs px-2 py-1 bg-card border border-border text-muted-foreground">
                {n.text}
                {n.usageCount > 0 && <span className="ml-1 text-primary">({n.usageCount}×)</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {detail.favorites && detail.favorites.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Favoriten
          </h3>
          <div className="space-y-1">
            {detail.favorites.map((fav) => (
              <div key={fav.id} className="bg-card border border-border px-3 py-2 text-sm">
                <div className="text-white font-semibold">{fav.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {fav.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      {detail.orders && detail.orders.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Bestellungen
          </h3>
          <div className="space-y-2">
            {detail.orders.map((order) => (
              <div key={order.id} className="bg-card border border-border px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${STATUS_COLOR[order.status] ?? ""}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                    <span className="text-white font-bold text-sm">{order.total.toFixed(2)} €</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(order.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} ·{" "}
                  {order.orderType === "delivery" ? "Lieferung" : "Abholung"}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {order.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCustomers() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: customers, isLoading } = useListCustomers({ query: { queryKey: getListCustomersQueryKey() } });

  if (!sl && !session?.authenticated) { navigate("/backstage"); return null; }

  // The existing /admin/customers endpoint returns "phone-based" customers (no id)
  // The new /admin/customers/:id requires a numeric customer account id
  // We show registered accounts in the detail panel
  const registeredCustomers = customers?.filter((c): c is Customer & { id: number } => typeof (c as unknown as { id?: number }).id === "number");

  return (
    <AdminLayout>
      <div className="flex gap-6 h-full">
        {/* Customer list */}
        <div className={`${selectedId ? "hidden lg:flex" : "flex"} flex-col flex-1 min-w-0`}>
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold uppercase text-white">Kunden</h1>
            <p className="text-muted-foreground mt-1">{customers?.length ?? 0} Kunden insgesamt</p>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
          ) : customers?.length === 0 ? (
            <div className="bg-card border border-border p-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Noch keine Kunden. Sie erscheinen hier nach der ersten Bestellung.</p>
            </div>
          ) : (
            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Telefon</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">E-Mail</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider text-right">Bestellungen</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider text-right">Umsatz</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Letzte Best.</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers?.map((c, i) => {
                    const cId = (c as unknown as { id?: number }).id;
                    const hasAccount = typeof cId === "number";
                    return (
                      <tr
                        key={i}
                        className={`hover:bg-secondary/20 ${hasAccount ? "cursor-pointer" : ""}`}
                        onClick={() => hasAccount && setSelectedId(cId!)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{c.name}</div>
                          {hasAccount && <div className="text-xs text-primary">Registriertes Konto</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.email ?? "—"}</td>
                        <td className="px-4 py-3 text-white text-right font-mono">{c.orderCount}</td>
                        <td className="px-4 py-3 text-white text-right font-mono">{c.totalSpent.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden sm:table-cell">
                          {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("de-DE") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {hasAccount && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="w-full lg:w-96 bg-card border border-border flex flex-col overflow-hidden">
            <CustomerDetailPanel customerId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
