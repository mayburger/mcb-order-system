import { useState } from "react";
import { AccountLayout } from "./layout";
import {
  useListCustomerOrders,
  useListCustomerFavorites,
  useCreateCustomerFavorite,
  getListCustomerOrdersQueryKey,
  Order,
} from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, RefreshCw, Heart, ChevronDown, ChevronUp, MapPin, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend", confirmed: "Bestätigt", preparing: "In Zubereitung",
  ready: "Fertig", delivering: "Unterwegs", completed: "Abgeschlossen", cancelled: "Storniert",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  preparing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ready: "bg-green-500/20 text-green-400 border-green-500/30",
  delivering: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function OrderCard({ order }: { order: Order }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [showFavDialog, setShowFavDialog] = useState(false);
  const [favName, setFavName] = useState(`Bestellung vom ${new Date(order.createdAt).toLocaleDateString("de-DE")}`);
  const { setCartFromSnapshot } = useCart();
  const createFav = useCreateCustomerFavorite();

  const handleReorder = () => {
    const snapItems = order.items.map((i) => ({
      menuItemId: i.menuItemId ?? 0,
      itemName: i.itemName,
      quantity: i.quantity,
      unitPrice: i.itemPrice,
      selectedOptions: (i.optionsSnapshot ?? []).map((o) => ({
        groupId: o.groupId,
        groupName: o.groupName,
        optionItemId: o.optionItemId,
        optionItemName: o.optionItemName,
        price: o.price,
        priceType: "absolute",
      })),
    }));
    setCartFromSnapshot(snapItems);
    toast({ title: "Warenkorb befüllt!", description: "Zur Kasse um die Bestellung aufzugeben." });
    navigate("/cart");
  };

  const handleSaveFav = () => {
    const snapItems = order.items.map((i) => ({
      menuItemId: i.menuItemId ?? 0,
      itemName: i.itemName,
      quantity: i.quantity,
      unitPrice: i.itemPrice,
      selectedOptions: (i.optionsSnapshot ?? []).map((o) => ({
        groupId: o.groupId,
        groupName: o.groupName,
        optionItemId: o.optionItemId,
        optionItemName: o.optionItemName,
        price: o.price,
        priceType: "absolute",
      })),
    }));
    createFav.mutate(
      { data: { name: favName.trim() || `Bestellung #${order.orderNumber}`, items: snapItems } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listCustomerFavorites"] });
          setShowFavDialog(false);
          toast({ title: "Favorit gespeichert!", description: `"${favName}" wurde zu deinen Favoriten hinzugefügt.` });
        },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-card border border-border">
      {/* Order header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{order.orderNumber}</span>
            <Badge className={`text-xs border ${STATUS_COLOR[order.status] ?? ""}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </Badge>
            {order.orderType === "delivery" ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Lieferung</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Package className="h-3 w-3" />Abholung</span>
            )}
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-white font-bold text-lg">{order.total.toFixed(2)} €</span>
            <span className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {/* Item preview */}
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {order.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Button
            size="sm"
            className="rounded-none bg-primary hover:bg-primary/90 text-xs h-8 gap-1"
            onClick={handleReorder}
          >
            <RefreshCw className="h-3 w-3" />
            Erneut bestellen
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none border-border text-xs h-8 gap-1"
            onClick={() => setShowFavDialog(true)}
          >
            <Heart className="h-3 w-3" />
            Als Favorit
          </Button>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-border/50 text-xs text-muted-foreground hover:text-white transition-colors"
      >
        <span>{expanded ? "Details ausblenden" : "Details anzeigen"}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-white">
                    {item.quantity}× {item.itemName}
                    {item.variantName && <span className="text-muted-foreground ml-1">({item.variantName})</span>}
                  </span>
                  <span className="text-white shrink-0">{item.lineTotal.toFixed(2)} €</span>
                </div>
                {(item.optionsSnapshot ?? []).filter((o) => o.price > 0).length > 0 && (
                  <p className="text-xs text-muted-foreground pl-3">
                    +{(item.optionsSnapshot ?? []).filter((o) => o.price > 0).map((o) => o.optionItemName).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="border-t border-border/50 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Zwischensumme</span><span>{order.subtotal.toFixed(2)} €</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Rabatt {order.couponCode && `(${order.couponCode})`}</span>
                <span>-{order.discountAmount.toFixed(2)} €</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Liefergebühr</span><span>{order.deliveryFee.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold pt-1 border-t border-border/50">
              <span>Gesamt</span><span>{order.total.toFixed(2)} €</span>
            </div>
          </div>

          {/* Meta */}
          <div className="border-t border-border/50 pt-2 text-xs text-muted-foreground space-y-1">
            {order.deliveryAddress && (
              <p>📍 {order.deliveryAddress}{order.postalCode && `, ${order.postalCode}`}{order.city && ` ${order.city}`}</p>
            )}
            <p>💳 {order.paymentMethod ?? "Bar"}</p>
            {order.notes && <p>📝 {order.notes}</p>}
          </div>
        </div>
      )}

      {/* Save as favorite dialog */}
      <Dialog open={showFavDialog} onOpenChange={(v) => !v && setShowFavDialog(false)}>
        <DialogContent className="bg-card border-border text-white max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase">Als Favorit speichern</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Gib dieser Bestellung einen Namen um sie später schnell erneut zu bestellen.</p>
          <Input
            value={favName}
            onChange={(e) => setFavName(e.target.value)}
            className="rounded-none border-border bg-background text-white mt-2"
            placeholder='z.B. "Meine Pizza Bestellung"'
          />
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setShowFavDialog(false)}>Abbrechen</Button>
            <Button className="flex-1 rounded-none bg-primary hover:bg-primary/90" onClick={handleSaveFav} disabled={createFav.isPending}>
              <Heart className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountOrdersPage() {
  const { data: orders, isLoading } = useListCustomerOrders({
    query: { queryKey: getListCustomerOrdersQueryKey() },
  });

  return (
    <AccountLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold uppercase text-white">Meine Bestellungen</h2>
          <span className="text-sm text-muted-foreground">{orders?.length ?? 0} Bestellungen</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-24 bg-card border border-border animate-pulse" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-card border border-border p-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-semibold">Noch keine Bestellungen</p>
            <p className="text-xs text-muted-foreground mt-1">Deine nächste Bestellung erscheint hier automatisch.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
