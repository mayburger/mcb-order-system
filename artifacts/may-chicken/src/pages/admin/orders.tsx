import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminOrders, getListAdminOrdersQueryKey,
  useUpdateAdminOrder, useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  confirmed:  "bg-blue-500/10 text-blue-400 border-blue-500/30",
  preparing:  "bg-orange-500/10 text-orange-400 border-orange-500/30",
  ready:      "bg-green-500/10 text-green-400 border-green-500/30",
  delivering: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  completed:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cancelled:  "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUSES = ["", "pending", "confirmed", "preparing", "ready", "delivering", "completed", "cancelled"];
const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed", confirmed: "preparing", preparing: "ready",
  ready: "delivering", delivering: "completed",
};

export default function AdminOrders() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useGetAdminSession({}, { query: { queryKey: getGetAdminSessionQueryKey() } });
  const params = statusFilter ? { status: statusFilter as any } : {};
  const { data: orders, isLoading } = useListAdminOrders(params, {
    query: { queryKey: getListAdminOrdersQueryKey(params), refetchInterval: 30000 }
  });
  const updateOrder = useUpdateAdminOrder();

  if (!sessionLoading && !session?.authenticated) { navigate("/admin"); return null; }

  const handleStatusChange = (id: number, status: string) => {
    updateOrder.mutate(
      { id, data: { status: status as any } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey(params) }) }
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Orders</h1>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${statusFilter === s ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:border-white hover:text-white"}`}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card border border-border animate-pulse" />)}</div>
      ) : orders?.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center text-muted-foreground">No orders found.</div>
      ) : (
        <div className="space-y-2">
          {orders?.map((order) => (
            <div key={order.id} className="bg-card border border-border overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white font-mono">{order.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 border font-bold uppercase ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                    <span className="text-xs text-muted-foreground uppercase">{order.orderType}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{order.customerName} · {order.customerPhone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">£{order.total.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                {expanded === order.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {expanded === order.id && (
                <div className="border-t border-border p-4 space-y-4 bg-background/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {order.deliveryAddress && <div><p className="text-muted-foreground text-xs uppercase">Address</p><p className="text-white">{order.deliveryAddress}</p></div>}
                    {order.notes && <div><p className="text-muted-foreground text-xs uppercase">Notes</p><p className="text-white">{order.notes}</p></div>}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase mb-2">Items</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.itemName} × {item.quantity}</span>
                        <span className="text-white">£{item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {NEXT_STATUS[order.status] && (
                      <Button size="sm" className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
                        disabled={updateOrder.isPending}
                        onClick={() => handleStatusChange(order.id, NEXT_STATUS[order.status]!)}>
                        Mark as {NEXT_STATUS[order.status]}
                      </Button>
                    )}
                    {order.status !== "cancelled" && order.status !== "completed" && (
                      <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs font-bold border-destructive/50 text-destructive hover:bg-destructive/10"
                        disabled={updateOrder.isPending}
                        onClick={() => handleStatusChange(order.id, "cancelled")}>
                        Cancel
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
