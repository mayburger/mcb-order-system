import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useListMenuItems,
  useListMenuCategories,
  useCreateQuickOrder,
} from "@workspace/api-client-react";
import type { MenuItem, OptionGroup, OptionGroupItem } from "@workspace/api-client-react";
import { computeUnitPrice, type SelectedOption } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Check,
  CheckCircle2,
  ShoppingCart,
  ChevronRight,
  Search,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Source = "phone" | "lieferando" | "takeaway" | "dine_in";
type OrderType = "delivery" | "pickup";
type PayMethod = "cash" | "ec" | "paypal" | "lieferando";

interface StaffCartLine {
  cartKey: string;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  variantLabel: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCartKey(menuItemId: number, opts: SelectedOption[]): string {
  const k = opts
    .map((o) => `${o.groupId}:${o.optionItemId}`)
    .sort()
    .join("|");
  return `${menuItemId}-${k}`;
}

// ── Source config ─────────────────────────────────────────────────────────────

const SOURCES: { id: Source; label: string; icon: React.ReactNode; bg: string; activeBg: string }[] = [
  {
    id: "phone",
    label: "Telefon",
    icon: <Phone className="w-5 h-5" />,
    bg: "bg-secondary border-border",
    activeBg: "bg-blue-700 border-blue-600",
  },
  {
    id: "lieferando",
    label: "Lieferando",
    icon: <Truck className="w-5 h-5" />,
    bg: "bg-secondary border-border",
    activeBg: "bg-orange-700 border-orange-600",
  },
  {
    id: "takeaway",
    label: "Mitnehmen",
    icon: <ShoppingBag className="w-5 h-5" />,
    bg: "bg-secondary border-border",
    activeBg: "bg-purple-700 border-purple-600",
  },
  {
    id: "dine_in",
    label: "Tisch",
    icon: <UtensilsCrossed className="w-5 h-5" />,
    bg: "bg-secondary border-border",
    activeBg: "bg-emerald-700 border-emerald-600",
  },
];

const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: "cash", label: "Bar" },
  { id: "ec", label: "EC" },
  { id: "paypal", label: "PayPal" },
  { id: "lieferando", label: "Lieferando" },
];

// ── Staff Product Dialog ──────────────────────────────────────────────────────

interface StaffProductDialogProps {
  item: MenuItem;
  onAdd: (item: MenuItem, quantity: number, opts: SelectedOption[]) => void;
  onClose: () => void;
}

function StaffProductDialog({ item, onAdd, onClose }: StaffProductDialogProps) {
  const groups: OptionGroup[] = item.optionGroups ?? [];

  const [selections, setSelections] = useState<Map<number, number[]>>(() => {
    const m = new Map<number, number[]>();
    for (const g of groups) {
      m.set(g.id, g.inputType === "single" && g.items.length > 0 ? [g.items[0].id] : []);
    }
    return m;
  });
  const [qty, setQty] = useState(1);

  const toggle = (g: OptionGroup, opt: OptionGroupItem) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const cur = next.get(g.id) ?? [];
      if (g.inputType === "single") {
        next.set(g.id, [opt.id]);
      } else {
        next.set(g.id, cur.includes(opt.id) ? cur.filter((id) => id !== opt.id) : [...cur, opt.id]);
      }
      return next;
    });
  };

  const buildOpts = (): SelectedOption[] => {
    const res: SelectedOption[] = [];
    for (const g of groups) {
      for (const id of selections.get(g.id) ?? []) {
        const opt = g.items.find((i) => i.id === id);
        if (!opt) continue;
        let price = opt.defaultPrice;
        if (g.priceType === "additive" && opt.priceByVariant) {
          const sizeG = groups.find((gg) => gg.priceType === "absolute");
          if (sizeG) {
            const sizeId = (selections.get(sizeG.id) ?? [])[0];
            const sizeItem = sizeG.items.find((i) => i.id === sizeId);
            if (sizeItem && opt.priceByVariant[sizeItem.name] !== undefined) {
              price = opt.priceByVariant[sizeItem.name];
            }
          }
        }
        res.push({
          groupId: g.id,
          groupName: g.name,
          optionItemId: opt.id,
          optionItemName: opt.name,
          price,
          inputType: g.inputType as "single" | "multiple",
          priceType: g.priceType as "absolute" | "additive",
        });
      }
    }
    return res;
  };

  const isValid = () => groups.filter((g) => g.required).every((g) => (selections.get(g.id) ?? []).length > 0);
  const opts = buildOpts();
  const unitPrice = computeUnitPrice(item, opts);

  const getSizeOpt = () => {
    const sg = groups.find((g) => g.priceType === "absolute");
    if (!sg) return undefined;
    const sizeId = (selections.get(sg.id) ?? [])[0];
    return sg.items.find((i) => i.id === sizeId);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-white max-w-md w-[calc(100vw-1rem)] rounded-none p-0 overflow-hidden flex flex-col max-h-[90dvh]">
        {item.imageUrl && (
          <div className="aspect-video overflow-hidden shrink-0">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold uppercase text-white text-left">
              {item.name}
            </DialogTitle>
            {item.description && (
              <p className="text-muted-foreground text-sm text-left">{item.description}</p>
            )}
          </DialogHeader>

          {groups.map((g) => {
            const selectedIds = selections.get(g.id) ?? [];
            const isMulti = g.inputType === "multiple";
            return (
              <div key={g.id}>
                <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                  {g.name}
                  {g.required && <span className="text-primary ml-1">*</span>}
                  {isMulti && <span className="ml-2 font-normal text-muted-foreground">(optional)</span>}
                </h3>
                <div className="space-y-1.5">
                  {g.items.map((opt) => {
                    const selected = selectedIds.includes(opt.id);
                    let displayPrice = opt.defaultPrice;
                    if (g.priceType === "additive" && opt.priceByVariant) {
                      const sizeOpt = getSizeOpt();
                      if (sizeOpt && opt.priceByVariant[sizeOpt.name] !== undefined) {
                        displayPrice = opt.priceByVariant[sizeOpt.name];
                      }
                    }
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggle(g, opt)}
                        className={`w-full flex items-center justify-between p-3 border transition-colors text-left ${
                          selected
                            ? "border-primary bg-primary/10 text-white"
                            : "border-border text-muted-foreground hover:border-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isMulti ? (
                            <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                              {selected && <Check className="h-3 w-3 text-white" />}
                            </div>
                          ) : (
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-muted-foreground"}`}>
                              {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                          )}
                          <span className="font-semibold text-sm truncate">{opt.name}</span>
                        </div>
                        <span className="font-bold text-primary shrink-0 ml-2 text-sm">
                          {g.priceType === "absolute"
                            ? `${displayPrice.toFixed(2)} €`
                            : displayPrice > 0
                            ? `+${displayPrice.toFixed(2)} €`
                            : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-border p-4 flex items-center gap-3 bg-card">
          <div className="flex items-center border border-border">
            <button
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-white"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-bold text-white text-lg">{qty}</span>
            <button
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-white"
              onClick={() => setQty((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="flex-1 h-11 rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
            onClick={() => { if (isValid()) { onAdd(item, qty, opts); onClose(); } }}
            disabled={!isValid()}
          >
            {(unitPrice * qty).toFixed(2)} € hinzufügen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Cart Panel ────────────────────────────────────────────────────────────────

interface CartPanelProps {
  cart: StaffCartLine[];
  source: Source;
  orderType: OrderType;
  payMethod: PayMethod;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  postalCode: string;
  city: string;
  tableInfo: string;
  notes: string;
  couponCode: string;
  onSourceChange: (s: Source) => void;
  onOrderTypeChange: (t: OrderType) => void;
  onPayMethodChange: (p: PayMethod) => void;
  onCustomerNameChange: (v: string) => void;
  onCustomerPhoneChange: (v: string) => void;
  onCustomerEmailChange: (v: string) => void;
  onDeliveryAddressChange: (v: string) => void;
  onPostalCodeChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onTableInfoChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onCouponCodeChange: (v: string) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function CartPanel(props: CartPanelProps) {
  const {
    cart, source, orderType, payMethod,
    customerName, customerPhone, customerEmail,
    deliveryAddress, postalCode, city,
    tableInfo, notes, couponCode,
    onSourceChange, onOrderTypeChange, onPayMethodChange,
    onCustomerNameChange, onCustomerPhoneChange, onCustomerEmailChange,
    onDeliveryAddressChange, onPostalCodeChange, onCityChange,
    onTableInfoChange, onNotesChange, onCouponCodeChange,
    onUpdateQty, onRemove, onSubmit, isSubmitting,
  } = props;

  const total = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const showDelivery = source === "phone" && orderType === "delivery";
  const showOrderType = source === "phone" || source === "takeaway";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Source selector */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="grid grid-cols-4 gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSourceChange(s.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                source === s.id ? `${s.activeBg} text-white` : `${s.bg} text-muted-foreground hover:text-white`
              }`}
            >
              {s.icon}
              <span className="text-xs font-medium leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Order type (Lieferung/Abholung) — only for phone and takeaway */}
        {showOrderType && (
          <div className="px-3 pt-3">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onOrderTypeChange("delivery")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  orderType === "delivery"
                    ? "bg-primary border-primary text-white"
                    : "border-border text-muted-foreground hover:text-white"
                }`}
              >
                <Truck className="w-4 h-4" /> Lieferung
              </button>
              <button
                onClick={() => onOrderTypeChange("pickup")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  orderType === "pickup"
                    ? "bg-primary border-primary text-white"
                    : "border-border text-muted-foreground hover:text-white"
                }`}
              >
                <ShoppingBag className="w-4 h-4" /> Abholung
              </button>
            </div>
          </div>
        )}

        {/* Warenkorb */}
        <div className="px-3 pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Warenkorb</p>
          {cart.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              Noch keine Artikel — links antippen
            </div>
          )}
          <div className="space-y-1.5">
            {cart.map((line) => (
              <div key={line.cartKey} className="flex items-start gap-2 bg-secondary/30 rounded-lg p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-tight">{line.itemName}</p>
                  {line.variantLabel && (
                    <p className="text-muted-foreground text-xs mt-0.5">{line.variantLabel}</p>
                  )}
                  {line.selectedOptions.filter(o => o.priceType === "additive").length > 0 && (
                    <p className="text-muted-foreground text-xs mt-0.5">
                      + {line.selectedOptions.filter(o => o.priceType === "additive").map(o => o.optionItemName).join(", ")}
                    </p>
                  )}
                  <p className="text-primary text-xs font-mono mt-1">{line.unitPrice.toFixed(2)} € / Stk.</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onUpdateQty(line.cartKey, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-secondary rounded text-muted-foreground hover:text-white hover:bg-primary transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-white font-mono text-sm">{line.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(line.cartKey, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-secondary rounded text-muted-foreground hover:text-white hover:bg-primary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(line.cartKey)}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors ml-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-white font-mono text-sm font-semibold shrink-0 min-w-[52px] text-right">
                  {(line.unitPrice * line.quantity).toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-muted-foreground text-sm">Gesamt</span>
              <span className="text-white font-bold font-mono text-lg">{total.toFixed(2)} €</span>
            </div>
          )}
        </div>

        {/* Zahlungsart */}
        <div className="px-3 pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Zahlungsart</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PAY_METHODS
              .filter((pm) => source !== "lieferando" || pm.id === "lieferando")
              .map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => onPayMethodChange(pm.id)}
                  className={`py-2 px-1 rounded-lg border text-sm font-medium transition-all ${
                    payMethod === pm.id
                      ? "bg-primary border-primary text-white"
                      : "border-border text-muted-foreground hover:text-white"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
          </div>
        </div>

        {/* Kundendaten */}
        <div className="px-3 pt-3 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Kundendaten</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Max Mustermann"
                className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefon</Label>
              <Input
                value={customerPhone}
                onChange={(e) => onCustomerPhoneChange(e.target.value)}
                placeholder="0171…"
                className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
              />
            </div>
          </div>

          {source === "dine_in" && (
            <div>
              <Label className="text-xs text-muted-foreground">Tisch</Label>
              <Input
                value={tableInfo}
                onChange={(e) => onTableInfoChange(e.target.value)}
                placeholder="z.B. Tisch 3"
                className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
              />
            </div>
          )}

          {showDelivery && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Adresse</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => onDeliveryAddressChange(e.target.value)}
                  placeholder="Musterstraße 1"
                  className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">PLZ</Label>
                  <Input
                    value={postalCode}
                    onChange={(e) => onPostalCodeChange(e.target.value)}
                    placeholder="12345"
                    className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ort</Label>
                  <Input
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    placeholder="Musterstadt"
                    className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Notiz</Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Allergien, Sonderwünsche…"
              className="bg-secondary border-border text-white resize-none text-sm mt-0.5"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Gutscheincode</Label>
            <Input
              value={couponCode}
              onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
              placeholder="z.B. SOMMER10"
              className="bg-secondary border-border text-white h-9 text-sm mt-0.5"
            />
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Sticky submit */}
      <div className="shrink-0 border-t border-border p-3">
        {cart.length > 0 && (
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-muted-foreground text-sm">Gesamt inkl. Extras</span>
            <span className="text-primary font-bold font-mono text-xl">{total.toFixed(2)} €</span>
          </div>
        )}
        <Button
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-base uppercase tracking-wider rounded-none"
          onClick={onSubmit}
          disabled={isSubmitting || cart.length === 0}
        >
          {isSubmitting ? "Wird gespeichert…" : "Bestellung aufgeben"}
          {!isSubmitting && <ChevronRight className="ml-2 w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminQuickOrder() {
  const { toast } = useToast();
  const { data: allItems = [] } = useListMenuItems();
  const { data: categories = [] } = useListMenuCategories();
  const createOrder = useCreateQuickOrder();

  // Menu state
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null);

  // Order state
  const [source, setSource] = useState<Source>("phone");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [tableInfo, setTableInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");

  // Cart
  const [cart, setCart] = useState<StaffCartLine[]>([]);

  // Mobile: "menu" or "cart" view
  const [mobileView, setMobileView] = useState<"menu" | "cart">("menu");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  // Success
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; total: number } | null>(null);

  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  // Filter items
  const visibleItems = allItems.filter((item: MenuItem) => {
    const matchCat = selectedCat ? item.categoryId === selectedCat : true;
    const matchSearch = searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchCat && matchSearch && item.available;
  });

  const handleSourceChange = (s: Source) => {
    setSource(s);
    if (s === "lieferando") {
      setOrderType("delivery");
      setPayMethod("lieferando");
    } else if (s === "dine_in") {
      setOrderType("pickup");
      if (payMethod === "lieferando") setPayMethod("cash");
    } else {
      if (payMethod === "lieferando") setPayMethod("cash");
    }
  };

  const addToCart = useCallback((item: MenuItem, qty: number, opts: SelectedOption[]) => {
    const key = buildCartKey(item.id, opts);
    const absoluteOpt = opts.find((o) => o.priceType === "absolute");
    const unitPrice = computeUnitPrice(item, opts);
    setCart((prev) => {
      const existing = prev.find((l) => l.cartKey === key);
      if (existing) {
        return prev.map((l) => l.cartKey === key ? { ...l, quantity: l.quantity + qty } : l);
      }
      return [
        ...prev,
        {
          cartKey: key,
          menuItemId: item.id,
          itemName: item.name,
          unitPrice,
          quantity: qty,
          selectedOptions: opts,
          variantLabel: absoluteOpt?.optionItemName ?? null,
        },
      ];
    });
    toast({ title: `${item.name} hinzugefügt`, description: `${(unitPrice * qty).toFixed(2)} €` });
  }, [toast]);

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => l.cartKey === key ? { ...l, quantity: l.quantity + delta } : l).filter((l) => l.quantity > 0)
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((l) => l.cartKey !== key));
  };

  const handleItemClick = (item: MenuItem) => {
    const groups: OptionGroup[] = item.optionGroups ?? [];
    if (groups.length === 0) {
      addToCart(item, 1, []);
    } else {
      setDialogItem(item);
    }
  };

  const resetForm = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setDeliveryAddress("");
    setPostalCode("");
    setCity("");
    setTableInfo("");
    setNotes("");
    setCouponCode("");
    setMobileView("menu");
    setCartSheetOpen(false);
  };

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast({ title: "Warenkorb ist leer", variant: "destructive" }); return;
    }

    const resolvedOrderType: OrderType =
      source === "dine_in" ? "pickup" :
      source === "lieferando" ? "delivery" :
      source === "takeaway" ? "pickup" :
      orderType;

    createOrder.mutate(
      {
        data: {
          source,
          orderType: resolvedOrderType,
          customerName: customerName.trim() || "Gast",
          customerPhone: customerPhone.trim() || "-",
          customerEmail: customerEmail.trim() || undefined,
          deliveryAddress: deliveryAddress.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          city: city.trim() || undefined,
          tableInfo: tableInfo.trim() || undefined,
          notes: notes.trim() || undefined,
          couponCode: couponCode.trim() || undefined,
          paymentMethod: payMethod as "cash" | "ec" | "paypal" | "lieferando",
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            selectedOptions: l.selectedOptions.map((o) => ({
              groupId: o.groupId,
              optionItemId: o.optionItemId,
              price: o.price,
            })),
          })),
        },
      },
      {
        onSuccess: (order) => {
          setSuccessOrder({ orderNumber: order.orderNumber, total: order.total });
          resetForm();
        },
        onError: () => {
          toast({ title: "Fehler beim Speichern", variant: "destructive" });
        },
      }
    );
  };

  const cartPanelProps: CartPanelProps = {
    cart, source, orderType, payMethod,
    customerName, customerPhone, customerEmail,
    deliveryAddress, postalCode, city,
    tableInfo, notes, couponCode,
    onSourceChange: handleSourceChange,
    onOrderTypeChange: setOrderType,
    onPayMethodChange: setPayMethod,
    onCustomerNameChange: setCustomerName,
    onCustomerPhoneChange: setCustomerPhone,
    onCustomerEmailChange: setCustomerEmail,
    onDeliveryAddressChange: setDeliveryAddress,
    onPostalCodeChange: setPostalCode,
    onCityChange: setCity,
    onTableInfoChange: setTableInfo,
    onNotesChange: setNotes,
    onCouponCodeChange: setCouponCode,
    onUpdateQty: updateQty,
    onRemove: removeFromCart,
    onSubmit: handleSubmit,
    isSubmitting: createOrder.isPending,
  };

  // ── Menu panel ──────────────────────────────────────────────────────────────
  const MenuPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Artikel suchen…"
            className="bg-secondary border-border text-white pl-9 h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 border-b border-border">
        <button
          onClick={() => setSelectedCat(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors uppercase tracking-wide ${
            !selectedCat ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-white"
          }`}
        >
          Alle
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id === selectedCat ? null : c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors uppercase tracking-wide ${
              selectedCat === c.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-white"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {visibleItems.length === 0 && (
          <div className="text-center text-muted-foreground py-16 text-sm">
            Keine Artikel gefunden
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {visibleItems.map((item: MenuItem) => {
            const groups: OptionGroup[] = item.optionGroups ?? [];
            const hasVariants = groups.some((g) => g.priceType === "absolute");
            const minPrice = hasVariants
              ? Math.min(...groups.filter((g) => g.priceType === "absolute").flatMap((g) => g.items.map((i) => i.defaultPrice)))
              : Number(item.price);

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="flex flex-col bg-secondary/40 hover:bg-secondary border border-border hover:border-primary/60 rounded-lg overflow-hidden text-left transition-all active:scale-[0.97] group"
              >
                {item.imageUrl && (
                  <div className="aspect-video overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-2.5 flex-1 flex flex-col">
                  <p className="text-white text-sm font-semibold leading-tight line-clamp-2 flex-1">{item.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-primary text-sm font-bold font-mono">
                      {hasVariants ? "ab " : ""}{minPrice.toFixed(2)} €
                    </span>
                    <div className="w-6 h-6 rounded-full bg-primary/20 group-hover:bg-primary flex items-center justify-center transition-colors">
                      <Plus className="w-3.5 h-3.5 text-primary group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      {/* ── Desktop layout (≥lg) ── */}
      <div className="hidden lg:flex h-[calc(100vh-0px)] overflow-hidden">
        {/* Left: Menu */}
        <div className="flex-1 border-r border-border overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold uppercase tracking-tight text-white text-lg">
              Schnellbestellung
            </h1>
          </div>
          <div className="flex-1 overflow-hidden">
            {MenuPanel}
          </div>
        </div>

        {/* Right: Cart + form */}
        <div className="w-[380px] xl:w-[420px] overflow-hidden border-l border-border flex flex-col">
          <CartPanel {...cartPanelProps} />
        </div>
      </div>

      {/* ── Mobile/Tablet layout (<lg) ── */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-0px)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold uppercase tracking-tight text-white">Schnellbestellung</h1>
          </div>
          {/* Source badge */}
          <Badge className={`text-white gap-1 ${SOURCES.find(s => s.id === source)?.activeBg ?? "bg-secondary"}`}>
            {SOURCES.find(s => s.id === source)?.icon}
            {SOURCES.find(s => s.id === source)?.label}
          </Badge>
        </div>

        {/* Menu panel fills the rest */}
        <div className="flex-1 overflow-hidden">
          {MenuPanel}
        </div>

        {/* Floating cart button */}
        <button
          onClick={() => setCartSheetOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-white rounded-full px-4 py-3 shadow-xl hover:bg-primary/90 active:scale-95 transition-all"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 ? (
            <>
              <span className="font-bold">{cartCount}</span>
              <span className="font-mono text-sm">{cartTotal.toFixed(2)} €</span>
            </>
          ) : (
            <span className="text-sm font-medium">Bestellung</span>
          )}
        </button>
      </div>

      {/* Mobile cart sheet */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="bg-card border-border h-[92dvh] p-0 flex flex-col rounded-t-2xl overflow-hidden">
          <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
            <SheetTitle className="text-white font-display uppercase tracking-tight text-left">
              Bestellung
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CartPanel {...cartPanelProps} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Product dialog */}
      {dialogItem && (
        <StaffProductDialog
          item={dialogItem}
          onAdd={addToCart}
          onClose={() => setDialogItem(null)}
        />
      )}

      {/* Success dialog */}
      <Dialog open={!!successOrder} onOpenChange={(v) => { if (!v) setSuccessOrder(null); }}>
        <DialogContent className="bg-card border-border max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">Bestellung erfolgreich</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="w-20 h-20 text-emerald-400" />
            <div className="space-y-1">
              <p className="text-white text-2xl font-display font-bold uppercase">Gespeichert!</p>
              <p className="text-muted-foreground font-mono">{successOrder?.orderNumber}</p>
              <p className="text-primary text-3xl font-mono font-bold mt-1">
                {successOrder?.total.toFixed(2)} €
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              Bestellung erscheint im Küchendisplay und in der Bestellübersicht.
            </p>
            <Button
              className="bg-primary hover:bg-primary/90 text-white w-full h-12 text-base font-bold uppercase tracking-wider"
              onClick={() => setSuccessOrder(null)}
            >
              Neue Bestellung
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
