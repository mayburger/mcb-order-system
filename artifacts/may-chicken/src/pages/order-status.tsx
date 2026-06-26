import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useGetOrderStatus, getGetOrderStatusQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, Clock, ChefHat, Package, Truck, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Received",  icon: Clock },
  { key: "confirmed",  label: "Confirmed",        icon: CheckCircle2 },
  { key: "preparing",  label: "Preparing",        icon: ChefHat },
  { key: "ready",      label: "Ready",            icon: Package },
  { key: "delivering", label: "On the Way",       icon: Truck },
  { key: "completed",  label: "Delivered",        icon: CheckCircle2 },
];

const STATUS_PICKUP_STEPS = [
  { key: "pending",    label: "Order Received",  icon: Clock },
  { key: "confirmed",  label: "Confirmed",        icon: CheckCircle2 },
  { key: "preparing",  label: "Preparing",        icon: ChefHat },
  { key: "ready",      label: "Ready for Pickup", icon: Package },
  { key: "completed",  label: "Completed",        icon: CheckCircle2 },
];

function getStepIndex(status: string, steps: typeof STATUS_STEPS) {
  return steps.findIndex((s) => s.key === status);
}

export default function OrderStatusPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: order, isLoading, error } = useGetOrderStatus(id, {
    query: {
      queryKey: getGetOrderStatusQueryKey(id),
      refetchInterval: 15000,
      enabled: !!id,
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-64 mx-auto" />
            <div className="h-4 bg-secondary rounded w-40 mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Order not found</h1>
          <Link href="/menu"><Button className="mt-4 rounded-none">Back to Menu</Button></Link>
        </div>
      </Layout>
    );
  }

  const isCancelled = order.status === "cancelled";
  const steps = order.orderType === "pickup" ? STATUS_PICKUP_STEPS : STATUS_STEPS;
  const currentStep = getStepIndex(order.status, steps);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-muted-foreground uppercase tracking-wider text-sm mb-2">Order</p>
          <h1 className="text-5xl font-display font-bold text-white">{order.orderNumber}</h1>
          <p className="text-muted-foreground mt-2">
            {order.orderType === "delivery" ? "Delivery" : "Pickup"} · Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Status tracker */}
        {isCancelled ? (
          <div className="bg-destructive/10 border border-destructive/30 p-6 text-center mb-10">
            <XCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <p className="text-white font-bold uppercase">Order Cancelled</p>
          </div>
        ) : (
          <div className="relative mb-12">
            <div className="flex justify-between items-start relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
              {steps.map((step, i) => {
                const isActive = i === currentStep;
                const isDone = i < currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="relative flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors ${isDone ? "bg-primary border-primary" : isActive ? "bg-primary border-primary animate-pulse" : "bg-background border-border"}`}>
                      <Icon className={`h-4 w-4 ${isDone || isActive ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <p className={`text-xs mt-2 text-center font-medium ${isDone || isActive ? "text-white" : "text-muted-foreground"}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-card border border-border p-6 mb-6">
          <h2 className="font-display font-bold uppercase text-white mb-4">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground">{item.itemName} × {item.quantity}</span>
              <span className="text-white">£{item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-primary text-sm pt-2">
              <span>Discount ({order.couponCode})</span>
              <span>-£{order.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-muted-foreground text-sm pt-1">
              <span>Delivery fee</span>
              <span>£{order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-white text-lg pt-3 border-t border-border mt-2">
            <span>Total</span>
            <span>£{order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Info */}
        {order.orderType === "delivery" && order.deliveryAddress && (
          <div className="bg-card border border-border p-6 mb-6">
            <h2 className="font-display font-bold uppercase text-white mb-2 text-sm">Delivery to</h2>
            <p className="text-muted-foreground text-sm">{order.deliveryAddress}{order.postalCode ? `, ${order.postalCode}` : ""}</p>
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/menu">
            <Button variant="outline" className="rounded-none border-border uppercase tracking-wider font-bold">
              Order More
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
