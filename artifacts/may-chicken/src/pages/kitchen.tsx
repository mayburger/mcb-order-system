import { useState } from "react";
import {
  useListKitchenOrders, getListKitchenOrdersQueryKey,
  useUpdateKitchenOrderStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, ChefHat, Package, CheckCircle2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType; next?: string; nextLabel?: string }> = {
  confirmed:  { label: "To Prepare", color: "border-blue-500/50 bg-blue-500/5", icon: Clock, next: "preparing", nextLabel: "Start Preparing" },
  preparing:  { label: "Preparing", color: "border-orange-500/50 bg-orange-500/5", icon: ChefHat, next: "ready", nextLabel: "Mark Ready" },
  ready:      { label: "Ready", color: "border-green-500/50 bg-green-500/5", icon: Package, next: "delivering", nextLabel: "Out for Delivery" },
  delivering: { label: "Delivering", color: "border-purple-500/50 bg-purple-500/5", icon: Truck, next: "completed", nextLabel: "Delivered" },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff === 1) return "1 min ago";
  return `${diff} min ago`;
}

export default function KitchenPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("confirmed");

  const { data: allOrders, isLoading } = useListKitchenOrders({
    query: { queryKey: getListKitchenOrdersQueryKey(), refetchInterval: 10000 }
  });
  const updateStatus = useUpdateKitchenOrderStatus();

  const orders = allOrders?.filter((o) => o.status === statusFilter);

  const handleNext = (id: number, next: string) => {
    updateStatus.mutate(
      { id, data: { status: next as any } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListKitchenOrdersQueryKey() }) }
    );
  };

  const tabs = [
    { key: "confirmed",  label: "Queue",      icon: Clock },
    { key: "preparing",  label: "Preparing",  icon: ChefHat },
    { key: "ready",      label: "Ready",      icon: Package },
    { key: "delivering", label: "Delivering", icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-2xl font-display font-bold uppercase tracking-tight">
            KITCHEN<span className="text-primary">.</span>
          </span>
          <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 px-3 py-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-primary text-xs font-bold uppercase">Live</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border">
          {tabs.map((tab) => {
            const count = tab.key === statusFilter ? orders?.length : 0;
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${statusFilter === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"}`}>
                <Icon className="h-5 w-5" />
                {tab.label}
                {tab.key === statusFilter && count ? (
                  <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-card border border-border animate-pulse" />)}
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <CheckCircle2 className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No orders in this queue</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders?.map((order) => {
              const meta = STATUS_MAP[order.status];
              const Icon = meta?.icon ?? Clock;
              return (
                <div key={order.id} className={`border ${meta?.color ?? "border-border"} p-4 flex flex-col gap-3`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-xl text-white leading-none">{order.orderNumber}</p>
                      <p className="text-muted-foreground text-xs mt-1 uppercase">{order.orderType}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="border-t border-border pt-3">
                    <p className="font-semibold text-white text-sm">{order.customerName}</p>
                    {order.orderType === "delivery" && order.deliveryAddress && (
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">{order.deliveryAddress}</p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="flex-1 space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-white">{item.itemName}</span>
                        <span className="text-primary font-bold">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 text-yellow-300 text-xs">
                      {order.notes}
                    </div>
                  )}

                  {/* Action */}
                  {meta?.next && (
                    <Button className="w-full rounded-none uppercase tracking-wider font-bold text-xs bg-primary hover:bg-primary/90 mt-auto"
                      onClick={() => handleNext(order.id, meta.next!)} disabled={updateStatus.isPending}>
                      {meta.nextLabel}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
