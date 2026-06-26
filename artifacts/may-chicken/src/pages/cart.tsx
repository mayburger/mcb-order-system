import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart-context";
import { useValidateCoupon } from "@workspace/api-client-react";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const [, navigate] = useLocation();
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const { toast } = useToast();
  const validateCoupon = useValidateCoupon();

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    validateCoupon.mutate(
      { data: { code: couponCode.trim(), orderTotal: subtotal } },
      {
        onSuccess: (coupon) => {
          const d =
            coupon.discountType === "percentage"
              ? subtotal * (coupon.discountValue / 100)
              : Math.min(coupon.discountValue, subtotal);
          setDiscount(d);
          setAppliedCoupon(couponCode.trim().toUpperCase());
          toast({ title: "Gutschein angewendet!", description: `Du sparst ${d.toFixed(2)} €` });
        },
        onError: () => {
          toast({
            title: "Ungültiger Gutschein",
            description: "Dieser Code ist ungültig oder abgelaufen.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const total = subtotal - discount;

  if (items.length === 0) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <ShoppingBag className="h-20 w-20 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-display font-bold uppercase text-white mb-2">
            Dein Warenkorb ist leer
          </h1>
          <p className="text-muted-foreground mb-8">Füge Artikel hinzu, um zu starten.</p>
          <Link href="/menu">
            <Button className="uppercase tracking-widest font-bold rounded-none bg-primary hover:bg-primary/90">
              Zur Speisekarte <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-display font-bold uppercase tracking-tight text-white mb-10">
          Deine Bestellung
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Artikel */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.cartKey}
                className="flex items-start gap-4 bg-card border border-border p-4"
              >
                <div className="flex-1">
                  <p className="font-bold text-white text-lg">{item.menuItem.name}</p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Größe: {item.variant.name}
                    </p>
                  )}
                  {item.selectedExtras.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Extras: {item.selectedExtras.map((e) => e.name).join(", ")}
                    </p>
                  )}
                  <p className="text-primary font-semibold mt-1">{item.unitPrice.toFixed(2)} € / Stk.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-none border-border"
                    onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-bold text-white">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-none border-border"
                    onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="w-24 text-right font-bold text-white">
                  {(item.unitPrice * item.quantity).toFixed(2)} €
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.cartKey)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Übersicht */}
          <div className="bg-card border border-border p-6 h-fit space-y-6">
            <h2 className="text-xl font-display font-bold uppercase text-white">Übersicht</h2>

            {/* Gutschein */}
            {!appliedCoupon ? (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Gutscheincode
                </label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="WELCOME10"
                    className="rounded-none border-border bg-background text-white uppercase"
                  />
                  <Button
                    variant="outline"
                    className="rounded-none border-border shrink-0"
                    onClick={handleApplyCoupon}
                    disabled={validateCoupon.isPending}
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/30 p-3">
                <span className="text-primary font-semibold text-sm">{appliedCoupon} angewendet</span>
                <button
                  className="text-muted-foreground text-xs hover:text-white"
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

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Zwischensumme</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Rabatt</span>
                  <span>-{discount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-xl border-t border-border pt-3">
                <span>Gesamt</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>

            <Button
              className="w-full rounded-none uppercase tracking-widest font-bold h-12 bg-primary hover:bg-primary/90 text-white"
              onClick={() => navigate("/checkout")}
            >
              Zur Kasse <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Link href="/menu" className="block text-center text-sm text-muted-foreground hover:text-white transition-colors">
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
