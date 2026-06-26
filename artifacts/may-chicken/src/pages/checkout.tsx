import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import {
  useCreateOrder,
  useListDeliveryAreas,
  useValidateCoupon,
  useListCustomerNotes,
  useCreateCustomerNote,
  getListCustomerNotesQueryKey,
} from "@workspace/api-client-react";
import { Truck, ShoppingBag, Tag, ArrowRight, ChevronDown, ChevronUp, Banknote, CreditCard, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { customer, isAuthenticated } = useCustomerAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Pre-fill from logged-in customer
  useEffect(() => {
    if (customer) {
      setName(`${customer.firstName} ${customer.lastName}`.trim());
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
    }
  }, [customer]);

  const { data: areas } = useListDeliveryAreas();
  const { data: savedNotes } = useListCustomerNotes({
    query: { queryKey: getListCustomerNotesQueryKey(), enabled: isAuthenticated },
  });
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();
  const createNote = useCreateCustomerNote();

  // Delivery area validation
  const postalCodeTrimmed = postalCode.trim();
  const matchedArea = areas && postalCodeTrimmed
    ? areas.find((a) => a.postalCode.toLowerCase() === postalCodeTrimmed.toLowerCase())
    : undefined;

  type AreaStatus = "idle" | "not_found" | "below_min" | "ok";
  const areaStatus: AreaStatus = (() => {
    if (orderType !== "delivery") return "idle";
    if (!postalCodeTrimmed) return "idle";
    if (!matchedArea) return "not_found";
    if (matchedArea.minOrder > 0 && subtotal < matchedArea.minOrder) return "below_min";
    return "ok";
  })();

  const deliveryFee = orderType === "delivery" && matchedArea ? matchedArea.deliveryFee : 0;
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
        onError: () => toast({ title: "Ungültiger Gutschein", variant: "destructive" }),
      }
    );
  };

  const handleSelectNote = (noteText: string) => {
    setNotes((prev) => {
      if (!prev.trim()) return noteText;
      if (prev.includes(noteText)) return prev;
      return `${prev.trim()}, ${noteText}`;
    });
  };

  const handleSaveNewNote = () => {
    if (!newNoteText.trim() || !isAuthenticated) return;
    createNote.mutate(
      { data: { text: newNoteText.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomerNotesQueryKey() });
          handleSelectNote(newNoteText.trim());
          setNewNoteText("");
          toast({ title: "Notiz gespeichert & hinzugefügt" });
        },
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
    if (orderType === "delivery" && areaStatus === "not_found") {
      toast({ title: "Leider liefern wir nicht in dieses Gebiet", description: "Bitte überprüfe deine PLZ oder wähle Abholung.", variant: "destructive" });
      return;
    }
    if (orderType === "delivery" && areaStatus === "below_min" && matchedArea) {
      toast({ title: `Mindestbestellwert ${matchedArea.minOrder.toFixed(2)} € nicht erreicht`, description: `Noch ${(matchedArea.minOrder - subtotal).toFixed(2)} € fehlen.`, variant: "destructive" });
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
          paymentMethod,
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
          toast({ title: "Bestellung fehlgeschlagen", description: "Bitte versuche es erneut.", variant: "destructive" }),
      }
    );
  };

  if (items.length === 0) { navigate("/cart"); return null; }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-white mb-6 md:mb-10">
          Kasse
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          {/* ── Form ──────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Bestellart */}
            <div>
              <h2 className="text-base md:text-lg font-display font-bold uppercase text-white mb-3">
                Bestellart
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(["delivery", "pickup"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-2 p-4 md:p-6 border transition-colors ${
                      orderType === type
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-muted-foreground hover:border-white"
                    }`}
                  >
                    {type === "delivery" ? <Truck className="h-6 w-6 md:h-8 md:w-8" /> : <ShoppingBag className="h-6 w-6 md:h-8 md:w-8" />}
                    <span className="font-bold uppercase tracking-wider text-sm">
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
              <h2 className="text-base md:text-lg font-display font-bold uppercase text-white mb-3">
                Deine Angaben
              </h2>
              {isAuthenticated && (
                <p className="text-xs text-primary mb-3">✓ Automatisch ausgefüllt aus deinem Konto</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    Vollständiger Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-none border-border bg-background text-white"
                    autoComplete="name"
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
                    type="tel"
                    className="rounded-none border-border bg-background text-white"
                    autoComplete="tel"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    E-Mail (optional)
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="rounded-none border-border bg-background text-white"
                    autoComplete="email"
                  />
                </div>
              </div>
            </div>

            {/* Lieferadresse */}
            {orderType === "delivery" && (
              <div>
                <h2 className="text-base md:text-lg font-display font-bold uppercase text-white mb-3">
                  Lieferadresse
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                      Straße & Hausnummer *
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required={orderType === "delivery"}
                      className="rounded-none border-border bg-background text-white"
                      autoComplete="street-address"
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
                      autoComplete="postal-code"
                      inputMode="numeric"
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
                      autoComplete="address-level2"
                    />
                  </div>
                </div>

                {/* Delivery area status banner */}
                {areaStatus === "not_found" && (
                  <div className="mt-3 flex items-start gap-3 border border-red-500/40 bg-red-500/10 p-3">
                    <span className="text-red-400 text-lg leading-none mt-0.5">✕</span>
                    <div>
                      <p className="text-sm font-semibold text-red-400">Leider liefern wir aktuell nicht in dieses Gebiet.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Bitte überprüfe deine PLZ oder wähle <strong>Abholung</strong> aus.</p>
                    </div>
                  </div>
                )}
                {areaStatus === "below_min" && matchedArea && (
                  <div className="mt-3 flex items-start gap-3 border border-yellow-500/40 bg-yellow-500/10 p-3">
                    <span className="text-yellow-400 text-lg leading-none mt-0.5">!</span>
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">Mindestbestellwert nicht erreicht</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mindestbestellung: <strong>{matchedArea.minOrder.toFixed(2)} €</strong> — noch{" "}
                        <strong>{(matchedArea.minOrder - subtotal).toFixed(2)} €</strong> fehlen.
                      </p>
                    </div>
                  </div>
                )}
                {areaStatus === "ok" && matchedArea && (
                  <div className="mt-3 flex items-start gap-3 border border-green-500/30 bg-green-500/10 p-3">
                    <span className="text-green-400 text-lg leading-none mt-0.5">✓</span>
                    <div>
                      <p className="text-sm font-semibold text-green-400">Lieferung möglich nach {matchedArea.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lieferzeit: {matchedArea.deliveryTime ?? "30–45 Min."} ·{" "}
                        {matchedArea.deliveryFee === 0 ? "Kostenlose Lieferung" : `Liefergebühr: ${matchedArea.deliveryFee.toFixed(2)} €`}
                        {matchedArea.minOrder > 0 && ` · Mindestbestellung: ${matchedArea.minOrder.toFixed(2)} €`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Zahlungsart */}
            <div>
              <h2 className="text-base md:text-lg font-display font-bold uppercase text-white mb-3">
                Zahlungsart
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(["cash", "card"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex items-center gap-3 p-4 border transition-colors ${
                      paymentMethod === method
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-muted-foreground hover:border-white"
                    }`}
                  >
                    {method === "cash" ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    <span className="font-bold uppercase tracking-wider text-sm">
                      {method === "cash" ? "Barzahlung" : "Kartenzahlung"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Anmerkungen */}
            <div>
              <h2 className="text-base md:text-lg font-display font-bold uppercase text-white mb-3">
                Anmerkungen
              </h2>

              {/* Saved notes (only shown if logged in and has notes) */}
              {isAuthenticated && savedNotes && savedNotes.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Gespeicherte Notizen — per Klick hinzufügen:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedNotes.map((n) => {
                      const active = notes.includes(n.text);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleSelectNote(n.text)}
                          className={`text-xs px-3 py-1.5 border transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {active ? "✓ " : "+ "}{n.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-none border border-border bg-background text-white p-3 h-20 resize-none focus:outline-none focus:border-primary text-sm"
                placeholder="Allergien, Sonderwünsche, Lieferhinweise…"
              />

              {/* Save new note — only shown if logged in */}
              {isAuthenticated && notes.trim() && !savedNotes?.some((n) => n.text === notes.trim()) && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newNoteText || notes.trim()}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Notiz speichern für nächstes Mal..."
                    className="rounded-none border-border bg-background text-white text-xs h-8 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-none border-border h-8 text-xs gap-1"
                    onClick={handleSaveNewNote}
                    disabled={createNote.isPending}
                  >
                    <Plus className="h-3 w-3" />
                    Merken
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={createOrder.isPending}
              className="w-full rounded-none h-13 md:h-14 uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-white text-base"
            >
              {createOrder.isPending ? "Wird aufgegeben…" : "Bestellung aufgeben"}{" "}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          {/* ── Bestellübersicht ──────────────────────────────────────── */}
          <div className="h-fit">
            <button
              className="lg:hidden w-full flex items-center justify-between bg-card border border-border p-4 mb-0"
              onClick={() => setSummaryOpen((v) => !v)}
            >
              <span className="font-display font-bold uppercase text-white text-sm">
                Bestellübersicht · {total.toFixed(2)} €
              </span>
              {summaryOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            <div className={`bg-card border border-border border-t-0 lg:border-t p-5 md:p-6 space-y-4 ${summaryOpen ? "block" : "hidden lg:block"}`}>
              <h2 className="text-base md:text-lg font-display font-bold uppercase text-white hidden lg:block">
                Bestellübersicht
              </h2>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.cartKey} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">
                        {item.menuItem.name} × {item.quantity}
                      </span>
                      <span className="text-white shrink-0">
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
                    {item.selectedOptions.filter((o) => o.priceType === "additive" && o.price > 0).length > 0 && (
                      <p className="text-xs text-muted-foreground pl-2">
                        +{item.selectedOptions
                          .filter((o) => o.priceType === "additive" && o.price > 0)
                          .map((o) => o.optionItemName)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Gutschein */}
              {!appliedCoupon ? (
                <div className="flex gap-2 pt-1">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
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
                  <button className="text-muted-foreground text-xs" onClick={() => { setDiscount(0); setAppliedCoupon(null); setCouponCode(""); }}>
                    Entfernen
                  </button>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-2">
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
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {paymentMethod === "cash" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                  {paymentMethod === "cash" ? "Barzahlung bei Lieferung" : "Kartenzahlung bei Lieferung"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
