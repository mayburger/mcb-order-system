import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminOrders, getListAdminOrdersQueryKey,
  useUpdateAdminOrder, useGetAdminSession, getGetAdminSessionQueryKey,
  OrderItem,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Banknote, CreditCard, Truck, Package } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  confirmed:  "bg-blue-500/10 text-blue-400 border-blue-500/30",
  preparing:  "bg-orange-500/10 text-orange-400 border-orange-500/30",
  ready:      "bg-green-500/10 text-green-400 border-green-500/30",
  delivering: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  completed:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cancelled:  "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend", confirmed: "Bestätigt", preparing: "Zubereitung",
  ready: "Bereit", delivering: "Auslieferung", completed: "Abgeschlossen", cancelled: "Storniert",
};

const STATUSES = ["", "pending", "confirmed", "preparing", "ready", "delivering", "completed", "cancelled"];
const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed", confirmed: "preparing", preparing: "ready",
  ready: "delivering", delivering: "completed",
};

function OrderItemRow({ item }: { item: OrderItem }) {
  const sizeName = item.variantName ?? null;
  const extras = (item.optionsSnapshot ?? []).filter((o) => o.optionItemName !== sizeName);
  const legacyExtras = item.extrasSnapshot ?? [];

  return (
    <div className="py-2 border-b border-border/40 last:border-0">
      <div className="flex justify-between gap-2 items-start">
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white font-semibold">
            {item.quantity}× {item.itemName}
          </span>
          {sizeName && (
            <span className="text-xs text-muted-foreground ml-2">({sizeName})</span>
          )}
          {extras.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 pl-3">
              + {extras.map((e) => `${e.optionItemName} (+${e.price.toFixed(2)} €)`).join(", ")}
            </p>
          )}
          {legacyExtras.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 pl-3">
              + {legacyExtras.map((e) => `${e.name} (+${e.price.toFixed(2)} €)`).join(", ")}
            </p>
          )}
        </div>
        <span className="text-sm text-white font-mono shrink-0">{item.lineTotal.toFixed(2)} €</span>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const params = statusFilter ? { status: statusFilter as "pending" | "confirmed" | "preparing" | "ready" | "delivering" | "completed" | "cancelled" } : {};
  const { data: orders, isLoading } = useListAdminOrders(params, {
    query: { queryKey: getListAdminOrdersQueryKey(params), refetchInterval: 30000 }
  });
  const updateOrder = useUpdateAdminOrder();

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) navigate("/backstage");
  }, [sessionLoading, session, navigate]);

  if (sessionLoading || (!session?.authenticated)) return null;

  const handleStatusChange = (id: number, status: string) => {
    updateOrder.mutate(
      { id, data: { status: status as "pending" | "confirmed" | "preparing" | "ready" | "delivering" | "completed" | "cancelled" } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey(params) }) }
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Bestellungen</h1>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${statusFilter === s ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:border-white hover:text-white"}`}>
              {s ? (STATUS_LABELS[s] ?? s) : "Alle"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card border border-border animate-pulse" />)}</div>
      ) : orders?.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center text-muted-foreground">Keine Bestellungen gefunden.</div>
      ) : (
        <div className="space-y-2">
          {orders?.map((order) => (
            <div key={order.id} className="bg-card border border-border overflow-hidden">
              {/* ── Summary row ──────────────────────────────────────── */}
              <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white font-mono">{order.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 border font-bold uppercase ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {order.orderType === "delivery"
                        ? <><Truck className="h-3 w-3" /> Lieferung</>
                        : <><Package className="h-3 w-3" /> Abholung</>
                      }
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {order.paymentMethod === "cash" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                      {order.paymentMethod ?? "Bar"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{order.customerName} · {order.customerPhone}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.items.map((i) => `${i.quantity}× ${i.itemName}${i.variantName ? ` (${i.variantName})` : ""}`).join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">{order.total.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
                </div>
                {expanded === order.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* ── Expanded detail ───────────────────────────────────── */}
              {expanded === order.id && (
                <div className="border-t border-border p-4 space-y-4 bg-background/50">
                  {/* Contact + meta */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {order.deliveryAddress && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Lieferadresse</p>
                        <p className="text-white">
                          {order.deliveryAddress}
                          {order.postalCode && `, ${order.postalCode}`}
                          {order.city && ` ${order.city}`}
                        </p>
                      </div>
                    )}
                    {order.notes && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Anmerkungen</p>
                        <p className="text-white">{order.notes}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Zahlung</p>
                      <p className="text-white flex items-center gap-1.5">
                        {order.paymentMethod === "cash"
                          ? <><Banknote className="h-3.5 w-3.5 text-primary" /> Barzahlung</>
                          : <><CreditCard className="h-3.5 w-3.5 text-primary" /> {order.paymentMethod ?? "Bar"}</>
                        }
                      </p>
                    </div>
                  </div>

                  {/* ── Order items ──────────────────────────────────── */}
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Artikel</p>
                    <div>
                      {order.items.map((item) => (
                        <OrderItemRow key={item.id} item={item} />
                      ))}
                    </div>
                    {/* Pricing breakdown */}
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-primary">
                          <span>Rabatt{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                          <span>-{order.discountAmount.toFixed(2)} €</span>
                        </div>
                      )}
                      {order.deliveryFee > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Liefergebühr</span>
                          <span>{order.deliveryFee.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-border/50">
                        <span>Gesamt</span>
                        <span>{order.total.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Actions ──────────────────────────────────────── */}
                  <div className="flex gap-2 flex-wrap">
                    {NEXT_STATUS[order.status] && (
                      <Button size="sm" className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
                        disabled={updateOrder.isPending}
                        onClick={() => handleStatusChange(order.id, NEXT_STATUS[order.status]!)}>
                        Als „{STATUS_LABELS[NEXT_STATUS[order.status]!]}" markieren
                      </Button>
                    )}
                    {order.status !== "cancelled" && order.status !== "completed" && (
                      <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs font-bold border-destructive/50 text-destructive hover:bg-destructive/10"
                        disabled={updateOrder.isPending}
                        onClick={() => handleStatusChange(order.id, "cancelled")}>
                        Stornieren
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
