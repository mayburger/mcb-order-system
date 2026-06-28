import { useEffect, useRef, useState } from "react";
import {
  useListKitchenOrders,
  getListKitchenOrdersQueryKey,
  useUpdateKitchenOrderStatus,
  useUpdateOrderPaymentStatus,
  useGetAdminSettings,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  printKitchenTicket,
  printCustomerTicket,
  printDriverTicket,
  type PrintSettings,
} from "@/lib/print-utils";
import {
  Clock,
  ChefHat,
  Package,
  CheckCircle2,
  Truck,
  Phone,
  Globe,
  UtensilsCrossed,
  ShoppingBag,
  XCircle,
  AlertTriangle,
  Printer,
  Volume2,
  VolumeX,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusKey =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";

type SourceFilter =
  | "all"
  | "online"
  | "phone"
  | "lieferando"
  | "pickup"
  | "delivery"
  | "dine_in";

type StatusFilter = "all" | "new" | "preparing" | "ready" | "delivering" | "completed" | "cancelled";

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  StatusKey,
  {
    label: string;
    cardBorder: string;
    cardBg: string;
    badgeBg: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "Neu",
    cardBorder: "border-blue-500",
    cardBg: "bg-blue-500/5",
    badgeBg: "bg-blue-600",
    icon: Clock,
  },
  confirmed: {
    label: "Bestätigt",
    cardBorder: "border-blue-400",
    cardBg: "bg-blue-400/5",
    badgeBg: "bg-blue-500",
    icon: Clock,
  },
  preparing: {
    label: "In Arbeit",
    cardBorder: "border-orange-500",
    cardBg: "bg-orange-500/5",
    badgeBg: "bg-orange-600",
    icon: ChefHat,
  },
  ready: {
    label: "Fertig",
    cardBorder: "border-green-500",
    cardBg: "bg-green-500/5",
    badgeBg: "bg-green-600",
    icon: Package,
  },
  delivering: {
    label: "Unterwegs",
    cardBorder: "border-purple-500",
    cardBg: "bg-purple-500/5",
    badgeBg: "bg-purple-600",
    icon: Truck,
  },
  completed: {
    label: "Abgeschlossen",
    cardBorder: "border-border",
    cardBg: "bg-card/40",
    badgeBg: "bg-secondary",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Storniert",
    cardBorder: "border-red-800",
    cardBg: "bg-red-900/10",
    badgeBg: "bg-red-700",
    icon: XCircle,
  },
};

const SOURCE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  online: { label: "Online", icon: Globe, color: "bg-sky-700" },
  phone: { label: "Telefon", icon: Phone, color: "bg-blue-700" },
  lieferando: { label: "Lieferando", icon: Truck, color: "bg-orange-700" },
  takeaway: { label: "Mitnehmen", icon: ShoppingBag, color: "bg-purple-700" },
  dine_in: { label: "Tisch", icon: UtensilsCrossed, color: "bg-emerald-700" },
};

const PAY_LABELS: Record<string, string> = {
  cash: "Bar",
  ec: "EC",
  paypal: "PayPal",
  card: "Karte",
  lieferando: "Lieferando",
};

// ── Status tab config ─────────────────────────────────────────────────────────

const STATUS_TABS: { key: StatusFilter; label: string; statuses: StatusKey[] }[] = [
  { key: "all", label: "Alle", statuses: ["pending","confirmed","preparing","ready","delivering","completed","cancelled"] },
  { key: "new", label: "Neu", statuses: ["pending", "confirmed"] },
  { key: "preparing", label: "In Arbeit", statuses: ["preparing"] },
  { key: "ready", label: "Fertig", statuses: ["ready"] },
  { key: "delivering", label: "Unterwegs", statuses: ["delivering"] },
  { key: "completed", label: "Abgeschlossen", statuses: ["completed"] },
  { key: "cancelled", label: "Storniert", statuses: ["cancelled"] },
];

const SOURCE_TABS: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "online", label: "Online" },
  { key: "phone", label: "Telefon" },
  { key: "lieferando", label: "Lieferando" },
  { key: "pickup", label: "Abholung" },
  { key: "delivery", label: "Lieferung" },
  { key: "dine_in", label: "Tisch" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function elapsed(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "gerade eben";
  if (mins === 1) return "1 Min.";
  return `${mins} Min.`;
}

function matchesSource(order: Order, filter: SourceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "online") return order.source === "online";
  if (filter === "phone") return order.source === "phone";
  if (filter === "lieferando") return order.source === "lieferando";
  if (filter === "pickup") return order.orderType === "pickup";
  if (filter === "delivery") return order.orderType === "delivery";
  if (filter === "dine_in") return order.source === "dine_in";
  return true;
}

// ── Sound alert ───────────────────────────────────────────────────────────────

function playAlert() {
  try {
    const ctx = new AudioContext();
    const playBeep = (freq: number, startAt: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + dur);
    };
    playBeep(880, 0, 0.2);
    playBeep(1100, 0.25, 0.2);
    playBeep(880, 0.5, 0.25);
  } catch {
    // AudioContext blocked — silently ignore
  }
}

// ── Payment Badge ─────────────────────────────────────────────────────────────

const PAY_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open:      { label: "Offen",          cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  paid:      { label: "Bezahlt",         cls: "bg-green-500/20  text-green-300  border-green-500/40"  },
  refunded:  { label: "Zurückerstattet", cls: "bg-blue-500/20   text-blue-300   border-blue-500/40"   },
  failed:    { label: "Fehlgeschlagen",  cls: "bg-red-500/20    text-red-300    border-red-500/40"    },
};

function PaymentBadge({
  order,
  onPaymentStatus,
}: {
  order: Order;
  onPaymentStatus: (id: number, status: string) => void;
}) {
  const ps = order.paymentStatus ?? "open";
  const cfg = PAY_STATUS_CFG[ps] ?? PAY_STATUS_CFG.open;
  const next = ps === "open" ? "paid" : ps === "paid" ? "refunded" : "open";
  const pm = PAY_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground">{pm}</span>
      <button
        onClick={() => onPaymentStatus(order.id, next)}
        title={`Klick → ${PAY_STATUS_CFG[next]?.label}`}
        className={`text-xs px-2 py-0.5 border rounded font-medium transition-opacity hover:opacity-80 ${cfg.cls}`}
      >
        {cfg.label}
      </button>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onStatus,
  onPaymentStatus,
  isPending,
  settings,
}: {
  order: Order;
  onStatus: (id: number, status: string) => void;
  onPaymentStatus: (id: number, status: string) => void;
  isPending: boolean;
  settings: PrintSettings;
}) {
  const status = (order.status ?? "pending") as StatusKey;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const StatusIcon = cfg.icon;
  const src = SOURCE_LABELS[order.source ?? ""] ?? { label: order.source ?? "", icon: Globe, color: "bg-secondary" };
  const SrcIcon = src.icon;

  const isNew = status === "pending" || status === "confirmed";
  const mins = Math.floor((Date.now() - new Date(order.createdAt as unknown as string).getTime()) / 60000);
  const isUrgent = isNew && mins > 10;

  return (
    <div
      className={`border-2 ${cfg.cardBorder} ${cfg.cardBg} flex flex-col rounded-none relative overflow-hidden`}
    >
      {/* Urgency pulse strip */}
      {isUrgent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
      )}

      {/* Card header */}
      <div className="p-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-2xl text-white leading-none">
              {order.orderNumber}
            </span>
            {isUrgent && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-muted-foreground text-sm">{formatTime(order.createdAt as unknown as string)}</span>
            <span className="text-muted-foreground text-xs">({elapsed(order.createdAt as unknown as string)})</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-xs font-bold ${cfg.badgeBg}`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-xs font-bold ${src.color}`}>
            <SrcIcon className="w-3 h-3" />
            {src.label}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-b border-border/50">
        <Badge
          className={`text-xs font-bold rounded px-2 ${
            order.orderType === "delivery"
              ? "bg-primary/20 text-primary border-primary/30"
              : order.source === "dine_in"
              ? "bg-emerald-900/60 text-emerald-300 border-emerald-700/50"
              : "bg-secondary text-white border-border"
          }`}
          variant="outline"
        >
          {order.orderType === "delivery"
            ? "🚚 Lieferung"
            : order.source === "dine_in"
            ? `🪑 ${order.tableInfo ?? "Tisch"}`
            : "🛍️ Abholung"}
        </Badge>
        <Badge
          variant="outline"
          className="text-xs font-bold rounded px-2 bg-secondary text-white border-border"
        >
          {PAY_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "–"} · {order.customerName}
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs font-bold rounded px-2 ${
            order.paymentMethod === "cash"
              ? "bg-yellow-900/40 text-yellow-300 border-yellow-700/40"
              : "bg-green-900/40 text-green-300 border-green-700/40"
          }`}
        >
          {order.paymentMethod === "cash" ? "⬤ Offen" : "✓ Bezahlt"}
        </Badge>
      </div>

      {/* Customer / delivery info */}
      {(order.customerPhone || (order.orderType === "delivery" && order.deliveryAddress)) && (
        <div className="px-4 py-2 border-b border-border/50 space-y-0.5">
          {order.customerPhone && order.customerPhone !== "-" && (
            <p className="text-muted-foreground text-xs">{order.customerPhone}</p>
          )}
          {order.orderType === "delivery" && order.deliveryAddress && (
            <p className="text-sm text-white font-medium">
              {order.deliveryAddress}
              {order.postalCode ? `, ${order.postalCode}` : ""}
              {order.city ? ` ${order.city}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="px-4 py-3 flex-1 space-y-3 border-b border-border/50">
        {order.items.map((item) => {
          type OptSnap = { groupId: number; groupName: string; optionItemId: number; optionItemName: string; price: number; priceType?: string };
          const opts = (item.optionsSnapshot ?? []) as OptSnap[];
          const variant = item.variantName ?? opts.find((o) => o.priceType === "absolute")?.optionItemName ?? null;
          const extras = opts.filter((o) => o.priceType !== "absolute");
          return (
            <div key={item.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-primary font-mono font-extrabold text-lg leading-tight shrink-0 w-7">
                    ×{item.quantity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base leading-tight">{item.itemName}</p>
                    {variant && (
                      <p className="text-muted-foreground text-sm">{variant}</p>
                    )}
                    {extras.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {extras.map((e, i) => (
                          <p key={i} className="text-muted-foreground text-xs">
                            <span className="text-primary mr-1">+</span>
                            {e.optionItemName}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground font-mono text-sm shrink-0">
                  {Number(item.lineTotal).toFixed(2)} €
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 my-2 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/40 p-2.5 rounded">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm leading-snug">{order.notes}</p>
        </div>
      )}

      {/* Total + Payment */}
      <div className="px-4 py-2 border-t border-border/50 flex justify-between items-center">
        <div>
          <span className="text-muted-foreground text-sm">Gesamt</span>
          <div className="flex items-center gap-2 mt-0.5">
            <PaymentBadge order={order} onPaymentStatus={onPaymentStatus} />
          </div>
        </div>
        <span className="text-white font-mono font-bold text-lg">
          {Number(order.total).toFixed(2)} €
        </span>
      </div>

      {/* Cash collection warning */}
      {order.paymentMethod === "cash" && order.paymentStatus === "open" && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-2 rounded">
          <span className="text-green-400 text-base">💵</span>
          <span className="text-green-300 text-sm font-bold">
            Bitte {Number(order.total).toFixed(2)} € kassieren
          </span>
        </div>
      )}

      {/* Action buttons */}
      {status !== "completed" && status !== "cancelled" && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
          {status === "pending" && (
            <Button
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-none bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onStatus(order.id, "confirmed")}
              disabled={isPending}
            >
              ✓ Annehmen
            </Button>
          )}
          {status === "confirmed" && (
            <Button
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-none bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => onStatus(order.id, "preparing")}
              disabled={isPending}
            >
              🍳 Zubereitung starten
            </Button>
          )}
          {status === "preparing" && (
            <Button
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-none bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onStatus(order.id, "ready")}
              disabled={isPending}
            >
              ✓ Fertig melden
            </Button>
          )}
          {status === "ready" && order.orderType === "delivery" && (
            <Button
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-none bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => onStatus(order.id, "delivering")}
              disabled={isPending}
            >
              🚚 An Fahrer übergeben
            </Button>
          )}
          {status === "ready" && order.orderType !== "delivery" && (
            <Button
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-none bg-green-700 hover:bg-green-800 text-white"
              onClick={() => onStatus(order.id, "completed")}
              disabled={isPending}
            >
              ✓ Abgeholt / Erledigt
            </Button>
          )}
          {status === "delivering" && (
            <Button
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-none bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={() => onStatus(order.id, "completed")}
              disabled={isPending}
            >
              ✓ Zugestellt
            </Button>
          )}
          {/* Cancel */}
          {(status === "pending" || status === "confirmed" || status === "preparing") && (
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-bold uppercase tracking-wider rounded-none border-red-800/60 text-red-400 hover:bg-red-900/20 hover:text-red-300"
              onClick={() => onStatus(order.id, "cancelled")}
              disabled={isPending}
            >
              <XCircle className="w-4 h-4 mr-2" /> Stornieren
            </Button>
          )}
        </div>
      )}

      {/* Completed / cancelled status label */}
      {(status === "completed" || status === "cancelled") && (
        <div className={`mx-4 mb-4 mt-2 py-3 text-center text-sm font-bold uppercase tracking-wider rounded ${status === "completed" ? "text-green-400 bg-green-900/20" : "text-red-400 bg-red-900/20"}`}>
          {status === "completed" ? "✓ Abgeschlossen" : "✗ Storniert"}
        </div>
      )}

      {/* Print buttons */}
      <div className="px-4 pb-4 border-t border-border/30 pt-3">
        <div className="flex gap-1.5">
          <button
            onClick={() => printKitchenTicket(order, settings)}
            className="flex-1 flex items-center justify-center gap-1 py-2 border border-border/50 text-muted-foreground hover:text-white hover:border-white text-xs font-medium transition-colors rounded"
          >
            <Printer className="w-3 h-3" />
            Küche
          </button>
          <button
            onClick={() => printCustomerTicket(order, settings)}
            className="flex-1 flex items-center justify-center gap-1 py-2 border border-border/50 text-muted-foreground hover:text-white hover:border-white text-xs font-medium transition-colors rounded"
          >
            <Printer className="w-3 h-3" />
            Kunde
          </button>
          {order.orderType === "delivery" && (
            <button
              onClick={() => printDriverTicket(order, settings)}
              className="flex-1 flex items-center justify-center gap-1 py-2 border border-purple-800/60 text-purple-400 hover:text-white hover:border-purple-400 text-xs font-medium transition-colors rounded"
            >
              <Printer className="w-3 h-3" />
              Fahrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const knownIds = useRef<Set<number>>(new Set());
  const firstLoad = useRef(true);
  const updateStatus = useUpdateKitchenOrderStatus();
  const { data: rawSettings } = useGetAdminSettings();
  const printSettings: PrintSettings = {
    restaurantName: rawSettings?.restaurantName ?? "May Chicken & Burger",
    address: rawSettings?.address ?? "",
    phone: rawSettings?.phone ?? "",
    email: rawSettings?.email ?? "",
  };

  const { data: allOrders = [], isLoading, refetch } = useListKitchenOrders({
    query: {
      queryKey: getListKitchenOrdersQueryKey(),
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    },
  });

  // Sound + new order detection
  useEffect(() => {
    if (allOrders.length === 0) return;
    setLastRefresh(new Date());

    if (firstLoad.current) {
      for (const o of allOrders) knownIds.current.add(o.id);
      firstLoad.current = false;
      return;
    }

    const newOrders = allOrders.filter(
      (o) => !knownIds.current.has(o.id) && (o.status === "pending" || o.status === "confirmed"),
    );
    if (newOrders.length > 0 && soundEnabled) {
      playAlert();
    }
    for (const o of allOrders) knownIds.current.add(o.id);
  }, [allOrders, soundEnabled]);

  const updatePaymentStatus = useUpdateOrderPaymentStatus();

  const handleStatus = (id: number, status: string) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListKitchenOrdersQueryKey() }) },
    );
  };

  const handlePaymentStatus = (id: number, paymentStatus: string) => {
    updatePaymentStatus.mutate(
      { id, data: { paymentStatus: paymentStatus as any } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListKitchenOrdersQueryKey() }) },
    );
  };

  const handleManualRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  // Filtered orders
  const activeStatuses = STATUS_TABS.find((t) => t.key === statusFilter)?.statuses ?? [];
  const filtered = allOrders
    .filter((o) => activeStatuses.includes((o.status ?? "pending") as StatusKey))
    .filter((o) => matchesSource(o, sourceFilter));

  // Counts per status tab
  const countFor = (tab: typeof STATUS_TABS[number]) =>
    allOrders.filter(
      (o) =>
        tab.statuses.includes((o.status ?? "pending") as StatusKey) &&
        matchesSource(o, sourceFilter),
    ).length;

  const newCount = allOrders.filter((o) => o.status === "pending" || o.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-display font-bold uppercase tracking-tight">
              KÜCHE<span className="text-primary">.</span>
            </span>
            {newCount > 0 && (
              <span className="bg-primary text-white text-sm font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                {newCount} NEU
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs hidden sm:block">
              {lastRefresh.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button
              onClick={handleManualRefresh}
              className="p-2 text-muted-foreground hover:text-white transition-colors"
              title="Manuell aktualisieren"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSoundEnabled((s) => !s)}
              className={`p-2 transition-colors ${soundEnabled ? "text-primary" : "text-muted-foreground"}`}
              title={soundEnabled ? "Ton ausschalten" : "Ton einschalten"}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-2.5 py-1 rounded">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-xs font-bold uppercase">Live · 10s</span>
            </div>
          </div>
        </div>

        {/* Source filter */}
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-t border-border/50">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                sourceFilter === tab.key
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex overflow-x-auto border-t border-border/50">
          {STATUS_TABS.map((tab) => {
            const count = countFor(tab);
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${
                  statusFilter === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-white"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      tab.key === "new" && count > 0
                        ? "bg-primary text-white animate-pulse"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Order grid ── */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-card border border-border animate-pulse rounded" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <CheckCircle2 className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Keine Bestellungen</p>
            <p className="text-sm mt-1 opacity-60">
              {statusFilter === "new"
                ? "Alle aktuellen Bestellungen wurden bearbeitet"
                : "Kein Eintrag für diesen Filter"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatus={handleStatus}
                onPaymentStatus={handlePaymentStatus}
                isPending={updateStatus.isPending}
                settings={printSettings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
