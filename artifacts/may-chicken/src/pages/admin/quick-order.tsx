import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useListAdminItems,
  useListAdminCategories,
  useCreateQuickOrder,
} from "@workspace/api-client-react";
import type { MenuItem, Category } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Phone,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  Search,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";

type Source = "phone" | "lieferando" | "takeaway" | "dine_in";
type OrderType = "delivery" | "pickup";
type PaymentMethod = "cash" | "card";

interface CartLine {
  menuItemId: number;
  itemName: string;
  itemPrice: number;
  quantity: number;
  variantId?: number;
  variantName?: string;
}

const SOURCE_CONFIG: Record<Source, { label: string; icon: React.ReactNode; color: string }> = {
  phone: { label: "Telefon", icon: <Phone className="w-4 h-4" />, color: "bg-blue-700" },
  lieferando: { label: "Lieferando", icon: <Truck className="w-4 h-4" />, color: "bg-orange-700" },
  takeaway: { label: "Abholung", icon: <ShoppingBag className="w-4 h-4" />, color: "bg-purple-700" },
  dine_in: { label: "Vor Ort", icon: <UtensilsCrossed className="w-4 h-4" />, color: "bg-emerald-700" },
};

export default function AdminQuickOrder() {
  const { toast } = useToast();
  const { data: menuItems = [] } = useListAdminItems();
  const { data: categories = [] } = useListAdminCategories();
  const createOrder = useCreateQuickOrder();

  const [source, setSource] = useState<Source>("phone");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [tableInfo, setTableInfo] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; total: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredItems = menuItems.filter((m: MenuItem) => {
    const matchCat = selectedCategory ? m.categoryId === selectedCategory : true;
    const matchSearch = searchQuery
      ? m.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchCat && matchSearch && m.available;
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.menuItemId === item.id && !l.variantId
      );
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          itemName: item.name,
          itemPrice: Number(item.price),
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((l, i) => (i === idx ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = cart.reduce((s, l) => s + l.itemPrice * l.quantity, 0);

  const handleSubmit = () => {
    if (!customerName.trim()) { toast({ title: "Kundenname erforderlich", variant: "destructive" }); return; }
    if (!customerPhone.trim()) { toast({ title: "Telefonnummer erforderlich", variant: "destructive" }); return; }
    if (cart.length === 0) { toast({ title: "Warenkorb ist leer", variant: "destructive" }); return; }

    createOrder.mutate(
      {
        data: {
          source,
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          deliveryAddress: deliveryAddress.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
          tableInfo: tableInfo.trim() || undefined,
          paymentMethod,
          couponCode: couponCode.trim() || undefined,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            variantId: l.variantId,
          })),
        },
      },
      {
        onSuccess: (order) => {
          setSuccessOrder({ orderNumber: order.orderNumber, total: order.total });
          setShowSuccess(true);
          setCart([]);
          setCustomerName("");
          setCustomerPhone("");
          setCustomerEmail("");
          setDeliveryAddress("");
          setPostalCode("");
          setCity("");
          setNotes("");
          setTableInfo("");
          setCouponCode("");
        },
        onError: () => {
          toast({ title: "Fehler beim Erstellen der Bestellung", variant: "destructive" });
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <PhoneCall className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
            Schnellbestellung
          </h1>
          <span className="text-muted-foreground text-sm ml-2">
            Telefon · Lieferando · Abholung · Vor Ort
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Customer + Details */}
          <div className="space-y-5">
            {/* Source selector */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Bestellkanal</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(SOURCE_CONFIG) as Source[]).map((s) => {
                  const cfg = SOURCE_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                        source === s
                          ? `${cfg.color} border-transparent text-white`
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                      }`}
                    >
                      {cfg.icon}
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order type */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType("delivery")}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  orderType === "delivery"
                    ? "bg-primary border-primary text-white"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Truck className="w-4 h-4" />
                <span className="text-sm font-medium">Lieferung</span>
              </button>
              <button
                onClick={() => setOrderType("pickup")}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  orderType === "pickup"
                    ? "bg-primary border-primary text-white"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-medium">Abholung</span>
              </button>
            </div>

            {/* Customer info */}
            <div className="space-y-3 bg-secondary/30 rounded-lg p-4 border border-border">
              <h3 className="text-sm font-medium text-white uppercase tracking-wider">Kundendaten</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Name *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="bg-secondary border-border text-white h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Telefon *</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0171 1234567"
                    className="bg-secondary border-border text-white h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">E-Mail (optional)</Label>
                <Input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="kunde@example.com"
                  className="bg-secondary border-border text-white h-9"
                />
              </div>
              {orderType === "delivery" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Lieferadresse</Label>
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Musterstraße 1"
                      className="bg-secondary border-border text-white h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">PLZ</Label>
                      <Input
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="12345"
                        className="bg-secondary border-border text-white h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Stadt</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Musterstadt"
                        className="bg-secondary border-border text-white h-9"
                      />
                    </div>
                  </div>
                </>
              )}
              {orderType === "pickup" && source === "dine_in" && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Tisch</Label>
                  <Input
                    value={tableInfo}
                    onChange={(e) => setTableInfo(e.target.value)}
                    placeholder="z.B. Tisch 3"
                    className="bg-secondary border-border text-white h-9"
                  />
                </div>
              )}
            </div>

            {/* Payment + notes */}
            <div className="space-y-3 bg-secondary/30 rounded-lg p-4 border border-border">
              <h3 className="text-sm font-medium text-white uppercase tracking-wider">Zahlung & Notizen</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Zahlungsmethode</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger className="bg-secondary border-border text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="cash">Bar</SelectItem>
                      <SelectItem value="card">Karte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Gutscheincode</Label>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="z.B. SOMMER10"
                    className="bg-secondary border-border text-white h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Notiz für die Küche</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergien, Sonderwünsche…"
                  className="bg-secondary border-border text-white resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Right: Menu picker + Cart */}
          <div className="space-y-4">
            {/* Search + category filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Artikel suchen…"
                  className="bg-secondary border-border text-white pl-9 h-9"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !selectedCategory ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-white"
                  }`}
                >
                  Alle
                </button>
                {categories.map((c: Category) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === c.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-white"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu items grid */}
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredItems.map((item: MenuItem) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="flex items-start gap-2 p-3 bg-secondary/40 hover:bg-secondary rounded-lg border border-border hover:border-primary/50 transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-primary text-xs font-mono">{Number(item.price).toFixed(2)} €</p>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-2 text-center text-muted-foreground py-8 text-sm">
                  Keine Artikel gefunden
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-medium text-white uppercase tracking-wider">Warenkorb</h3>
                {cart.length > 0 && (
                  <span className="text-xs text-muted-foreground">{cart.length} Position(en)</span>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto">
                {cart.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Artikel oben antippen um hinzuzufügen
                  </p>
                )}
                {cart.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{line.itemName}</p>
                      {line.variantName && (
                        <p className="text-muted-foreground text-xs">{line.variantName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="w-6 h-6 rounded bg-secondary text-muted-foreground hover:text-white hover:bg-primary transition-colors flex items-center justify-center text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-white text-sm font-mono">{line.quantity}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="w-6 h-6 rounded bg-secondary text-muted-foreground hover:text-white hover:bg-primary transition-colors flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-primary text-sm font-mono w-16 text-right">
                      {(line.itemPrice * line.quantity).toFixed(2)} €
                    </span>
                    <button onClick={() => removeFromCart(idx)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Gesamt</span>
                  <span className="text-white font-mono font-bold text-lg">{subtotal.toFixed(2)} €</span>
                </div>
              )}
            </div>

            {/* Summary badge + submit */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Badge className={`${SOURCE_CONFIG[source].color} text-white gap-1.5`}>
                  {SOURCE_CONFIG[source].icon}
                  {SOURCE_CONFIG[source].label}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground gap-1.5">
                  {orderType === "delivery" ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                  {orderType === "delivery" ? "Lieferung" : "Abholung"}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {paymentMethod === "cash" ? "Bar" : "Karte"}
                </Badge>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-white font-bold px-6"
                onClick={handleSubmit}
                disabled={createOrder.isPending || cart.length === 0}
              >
                {createOrder.isPending ? "Wird gebucht…" : "Bestellung aufgeben"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-card border-border max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">Bestellung erfolgreich</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            <div>
              <p className="text-white text-xl font-bold font-display uppercase">Bestellung aufgegeben!</p>
              <p className="text-muted-foreground mt-1">{successOrder?.orderNumber}</p>
              <p className="text-primary text-2xl font-mono font-bold mt-2">
                {successOrder?.total.toFixed(2)} €
              </p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-white w-full"
              onClick={() => setShowSuccess(false)}
            >
              Neue Bestellung
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
