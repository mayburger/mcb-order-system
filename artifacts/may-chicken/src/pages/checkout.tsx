import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart-context";
import { useCreateOrder, useListDeliveryAreas, useValidateCoupon } from "@workspace/api-client-react";
import { Truck, ShoppingBag, Tag, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const { data: areas } = useListDeliveryAreas();
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();

  const matchedArea = areas?.find(
    (a) => a.postalCode.toLowerCase() === postalCode.toLowerCase()
  );
  const deliveryFee = orderType === "delivery" ? (matchedArea?.deliveryFee ?? 2.99) : 0;
  const total = subtotal - discount + deliveryFee;

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    validateCoupon.mutate(
      { data: { code: couponCode.trim(), orderTotal: subtotal } },
      {
        onSuccess: (c) => {
          const d =
            c.discountType === "percentage"
              ? subtotal * (c.discountValue / 100)
              : Math.min(c.discountValue, subtotal);
          setDiscount(d);
          setAppliedCoupon(couponCode.trim().toUpperCase());
          toast({ title: "Gutschein angewendet!", description: `Du sparst ${d.toFixed(2)} €` });
        },
        onError: () =>
          toast({ title: "Ungültiger Gutschein", variant: "destructive" }),
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Name und Telefonnummer sind erforderlich", variant: "destructive" });
      return;
    }
    if (orderType === "delivery" && !address.trim()) {
      toast({ title: "Lieferadresse ist erforderlich", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        data: {
          orderType,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || null,
          deliveryAddress: orderType === "delivery" ? address.trim() : undefined,
          postalCode: postalCode.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
          couponCode: appliedCoupon ?? undefined,
          items: items.map((i) => ({
            menuItemId: i.menuItem.id,
            quantity: i.quantity,
            selectedOptions: i.selectedOptions.map((o) => ({
              groupId: o.groupId,
              optionItemId: o.optionItemId,
              price: o.price,
            })),
          })),
        },
      },
      {
        onSuccess: (order) => {
          clearCart();
          navigate(`/order/${order.id}`);
        },
        onError: () =>
          toast({
            title: "Bestellung fehlgeschlagen",
            description: "Bitte versuche es erneut.",
            variant: "destructive",
          }),
      }
    );
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-display font-bold uppercase tracking-tight text-white mb-10">
          Kasse
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
            {/* Bestellart */}
            <div>
              <h2 className="text-lg font-display font-bold uppercase text-white mb-4">
                Bestellart
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {(["delivery", "pickup"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-3 p-6 border transition-colors ${
                      orderType === type
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-muted-foreground hover:border-white"
                    }`}
                  >
                    {type === "delivery" ? (
                      <Truck className="h-8 w-8" />
                    ) : (
                      <ShoppingBag className="h-8 w-8" />
                    )}
                    <span className="font-bold uppercase tracking-wider">
                      {type === "delivery" ? "Lieferung" : "Abholung"}
                    </span>
                    <span className="text-xs">
                      {type === "delivery" ? "30–45 Min." : "15–20 Min."}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kontaktdaten */}
            <div>
              <h2 className="text-lg font-display font-bold uppercase text-white mb-4">
                Deine Angaben
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    Vollständiger Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-none border-border bg-background text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    Telefon *
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="rounded-none border-border bg-background text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    E-Mail (optional)
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="rounded-none border-border bg-background text-white"
                  />
                </div>
              </div>
            </div>

            {/* Lieferadresse */}
            {orderType === "delivery" && (
              <div>
                <h2 className="text-lg font-display font-bold uppercase text-white mb-4">
                  Lieferadresse
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                      Straße & Hausnummer *
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required={orderType === "delivery"}
                      className="rounded-none border-border bg-background text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                      Postleitzahl
                    </label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="rounded-none border-border bg-background text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                      Stadt
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="rounded-none border-border bg-background text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Anmerkungen */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Anmerkungen (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-none border border-border bg-background text-white p-3 h-24 resize-none focus:outline-none focus:border-primary"
                placeholder="Allergien, Sonderwünsche..."
              />
            </div>

            <Button
              type="submit"
              disabled={createOrder.isPending}
              className="w-full rounded-none h-14 uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-white text-base"
            >
              {createOrder.isPending ? "Bestellung wird aufgegeben..." : "Bestellung aufgeben"}{" "}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          {/* Bestellübersicht */}
          <div className="bg-card border border-border p-6 space-y-4 h-fit">
            <h2 className="text-lg font-display font-bold uppercase text-white">
              Bestellübersicht
            </h2>
            {items.map((item) => (
              <div key={item.cartKey} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {item.menuItem.name} × {item.quantity}
                  </span>
                  <span className="text-white">
                    {(item.unitPrice * item.quantity).toFixed(2)} €
                  </span>
                </div>
                {item.selectedOptions
                  .filter((o) => o.priceType === "absolute")
                  .map((o) => (
                    <p key={o.optionItemId} className="text-xs text-muted-foreground pl-2">
                      {o.groupName}: {o.optionItemName}
                    </p>
                  ))}
                {item.selectedOptions.filter((o) => o.priceType === "additive").length > 0 && (
                  <p className="text-xs text-muted-foreground pl-2">
                    +{item.selectedOptions
                      .filter((o) => o.priceType === "additive")
                      .map((o) => o.optionItemName)
                      .join(", ")}
                  </p>
                )}
              </div>
            ))}

            {/* Gutschein */}
            {!appliedCoupon ? (
              <div className="flex gap-2 pt-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Gutscheincode"
                  className="rounded-none border-border bg-background text-white text-sm uppercase"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-none border-border shrink-0"
                  onClick={handleApplyCoupon}
                  disabled={validateCoupon.isPending}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-primary/10 border border-primary/30 p-2 text-sm">
                <span className="text-primary">{appliedCoupon}</span>
                <button
                  className="text-muted-foreground text-xs"
                  onClick={() => {
                    setDiscount(0);
                    setAppliedCoupon(null);
                    setCouponCode("");
                  }}
                >
                  Entfernen
                </button>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Zwischensumme</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary text-sm">
                  <span>Rabatt</span>
                  <span>-{discount.toFixed(2)} €</span>
                </div>
              )}
              {orderType === "delivery" && (
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Liefergebühr</span>
                  <span>{deliveryFee.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-lg border-t border-border pt-2">
                <span>Gesamt</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
