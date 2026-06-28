import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminOrders, getListAdminOrdersQueryKey,
  useRestoreOrder, useDeleteOrder,
  useGetAdminSession, getGetAdminSessionQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, RotateCcw, Trash2, AlertTriangle, X, Truck, Package, Banknote, CreditCard } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend", confirmed: "Bestätigt", preparing: "Zubereitung",
  ready: "Bereit", delivering: "Auslieferung", completed: "Abgeschlossen", cancelled: "Storniert",
};

export default function AdminArchive() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; orderNumber: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const { data: session, isLoading: sessionLoading } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const params = { archived: true };
  const { data: orders, isLoading } = useListAdminOrders(params, {
    query: { queryKey: getListAdminOrdersQueryKey(params), refetchInterval: 30000 }
  });
  const restoreOrder = useRestoreOrder();
  const deleteOrder = useDeleteOrder();

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) navigate("/backstage");
  }, [sessionLoading, session, navigate]);

  if (sessionLoading || (!session?.authenticated)) return null;

  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey(params) });

  const handleRestore = (id: number) => {
    restoreOrder.mutate({ id }, { onSuccess: invalidate });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const reason = deleteReason.trim();
    deleteOrder.mutate(
      { id: deleteTarget.id, data: reason ? { reason } : {} },
      {
        onSuccess: () => {
          invalidate();
          setDeleteTarget(null);
          setDeleteReason("");
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-display font-bold uppercase text-white">Archiv</h1>
        </div>
        <p className="text-muted-foreground mt-1">Archivierte Bestellungen — wiederherstellen oder endgültig löschen.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card border border-border animate-pulse" />)}</div>
      ) : orders?.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center text-muted-foreground">
          Keine archivierten Bestellungen.
        </div>
      ) : (
        <div className="space-y-2">
          {orders?.map((order) => (
            <div key={order.id} className="bg-card border border-border p-4">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white font-mono">{order.orderNumber}</span>
                    <span className="text-xs px-2 py-0.5 border font-bold uppercase bg-secondary/40 text-muted-foreground border-border">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {order.orderType === "delivery"
                        ? <><Truck className="h-3 w-3" /> Lieferung</>
                        : <><Package className="h-3 w-3" /> Abholung</>}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {order.paymentMethod === "cash" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                      {order.paymentMethod ?? "Bar"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{order.customerName} · {order.customerPhone}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.items.map((i) => `${i.quantity}× ${i.itemName}${i.variantName ? ` (${i.variantName})` : ""}`).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bestellt: {new Date(order.createdAt).toLocaleDateString("de-DE")}
                    {order.archivedAt && <> · Archiviert: {new Date(order.archivedAt).toLocaleDateString("de-DE")}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">{order.total.toFixed(2)} €</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs font-bold border-border text-muted-foreground hover:border-white hover:text-white gap-1.5"
                  disabled={restoreOrder.isPending}
                  onClick={() => handleRestore(order.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Wiederherstellen
                </Button>
                <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs font-bold border-destructive/50 text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={() => { setDeleteTarget({ id: order.id, orderNumber: order.orderNumber }); setDeleteReason(""); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Endgültig löschen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!deleteOrder.isPending) setDeleteTarget(null); }}>
          <div className="bg-card border border-destructive/40 max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-white" onClick={() => { if (!deleteOrder.isPending) setDeleteTarget(null); }}>
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 flex items-center justify-center bg-destructive/10 border border-destructive/30 shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="font-display font-bold uppercase text-white text-lg">Bestellung löschen</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Bestellung <span className="font-mono text-white">{deleteTarget.orderNumber}</span>
            </p>
            <p className="text-sm text-white mb-4">
              Möchtest du diese Bestellung wirklich dauerhaft löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className="mb-5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Löschgrund (optional)</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                placeholder="z. B. Testbestellung, doppelte Erfassung …"
                className="w-full rounded-none border border-border bg-background text-white text-sm p-2 resize-none focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs font-bold border-border text-muted-foreground hover:text-white"
                disabled={deleteOrder.isPending}
                onClick={() => setDeleteTarget(null)}>
                Abbrechen
              </Button>
              <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-destructive hover:bg-destructive/90 text-white gap-1.5"
                disabled={deleteOrder.isPending}
                onClick={handleConfirmDelete}>
                <Trash2 className="h-3.5 w-3.5" /> {deleteOrder.isPending ? "Wird gelöscht …" : "Dauerhaft löschen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
