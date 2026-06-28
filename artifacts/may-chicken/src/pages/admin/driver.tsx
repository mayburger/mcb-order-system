import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import {
  useListDriverOrders,
  getListDriverOrdersQueryKey,
  useUpdateDriverOrderStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, MapPin, Phone, Clock, CheckCircle2 } from "lucide-react";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_LABELS: Record<string, string> = {
  ready: "Bereit zur Auslieferung",
  delivering: "Unterwegs",
};

export default function AdminDriver() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useListDriverOrders({
    query: {
      queryKey: getListDriverOrdersQueryKey(),
      refetchInterval: 20000,
    },
  });
  const updateStatus = useUpdateDriverOrderStatus();

  const setStatus = (id: number, status: "delivering" | "completed") => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getListDriverOrdersQueryKey() }),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase text-white">
          Fahrer-Ansicht
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Offene Lieferungen – übernehmen und als geliefert markieren.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Wird geladen...</p>
      ) : !orders || orders.length === 0 ? (
        <div className="bg-card border border-border p-10 text-center">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aktuell keine offenen Lieferungen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-border flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-display font-bold text-white">
                  #{o.orderNumber}
                </span>
                <span
                  className={`text-xs uppercase tracking-wider px-2 py-0.5 border ${
                    o.status === "delivering"
                      ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                      : "border-primary/40 bg-primary/10 text-primary"
                  }`}
                >
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>

              <div className="p-4 space-y-2 flex-1">
                <p className="text-white font-medium">{o.customerName}</p>
                {o.customerPhone && (
                  <a
                    href={`tel:${o.customerPhone}`}
                    className="text-sm text-muted-foreground flex items-center gap-2 hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {o.customerPhone}
                  </a>
                )}
                {o.deliveryAddress && (
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      {o.deliveryAddress}
                      {(o.postalCode || o.city) && (
                        <>
                          <br />
                          {o.postalCode} {o.city}
                        </>
                      )}
                    </span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(o.createdAt)}
                </p>
                <p className="text-lg font-bold text-white pt-1">
                  {o.total.toFixed(2)} €
                </p>
              </div>

              <div className="p-4 border-t border-border">
                {o.status === "ready" ? (
                  <Button
                    onClick={() => setStatus(o.id, "delivering")}
                    disabled={updateStatus.isPending}
                    className="w-full rounded-none uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-white"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Lieferung starten
                  </Button>
                ) : (
                  <Button
                    onClick={() => setStatus(o.id, "completed")}
                    disabled={updateStatus.isPending}
                    className="w-full rounded-none uppercase tracking-widest font-bold bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Als geliefert markieren
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
