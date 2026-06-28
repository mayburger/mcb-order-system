import { AdminLayout } from "@/components/admin-layout";
import {
  useListPaymentMethods,
  useUpdatePaymentMethod,
  getListPaymentMethodsQueryKey,
} from "@workspace/api-client-react";
import type { PaymentMethodSetting } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Car,
  ShoppingBag,
  Globe,
  AlertCircle,
} from "lucide-react";

// ── Icons per payment key ─────────────────────────────────────────────────────

const METHOD_META: Record<string, { icon: React.ElementType; color: string; description: string }> = {
  cash:        { icon: Banknote,    color: "text-green-400",  description: "Kunde zahlt bei Lieferung oder Abholung in bar." },
  ec_pickup:   { icon: CreditCard,  color: "text-blue-400",   description: "Kartenzahlung beim Abholen im Restaurant." },
  ec_delivery: { icon: Car,         color: "text-blue-400",   description: "Kartenzahlung beim Fahrer über ein mobiles Terminal." },
  paypal:      { icon: Globe,       color: "text-indigo-400", description: "PayPal-Zahlung online. (Noch keine echte Anbindung)" },
  stripe:      { icon: CreditCard,  color: "text-purple-400", description: "Kartenzahlung über Stripe online. (Noch keine echte Anbindung)" },
  lieferando:  { icon: ShoppingBag, color: "text-orange-400", description: "Bereits über Lieferando bezahlt — kein Geldeinzug nötig." },
};

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ── Payment status badge legend ───────────────────────────────────────────────

const STATUS_BADGES = [
  { key: "open",      label: "Offen",          cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  { key: "paid",      label: "Bezahlt",         cls: "bg-green-500/20  text-green-300  border-green-500/40"  },
  { key: "refunded",  label: "Zurückerstattet", cls: "bg-blue-500/20   text-blue-300   border-blue-500/40"   },
  { key: "failed",    label: "Fehlgeschlagen",  cls: "bg-red-500/20    text-red-300    border-red-500/40"    },
];

// ── Method card ───────────────────────────────────────────────────────────────

function MethodCard({
  method,
  onUpdate,
  isUpdating,
}: {
  method: PaymentMethodSetting;
  onUpdate: (key: string, patch: Partial<PaymentMethodSetting>) => void;
  isUpdating: boolean;
}) {
  const meta = METHOD_META[method.key] ?? { icon: CreditCard, color: "text-muted-foreground", description: "" };
  const Icon = meta.icon;

  return (
    <div className={`border rounded-none bg-card transition-opacity ${!method.isActive ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border/50">
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 ${meta.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">{method.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium ${method.isActive ? "text-green-400" : "text-muted-foreground"}`}>
            {method.isActive ? "Aktiv" : "Inaktiv"}
          </span>
          <Toggle
            checked={method.isActive}
            onChange={(v) => onUpdate(method.key, { isActive: v })}
          />
        </div>
      </div>

      {/* Settings grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground">Lieferung</span>
          <Toggle
            checked={method.forDelivery}
            onChange={(v) => onUpdate(method.key, { forDelivery: v })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground">Abholung</span>
          <Toggle
            checked={method.forPickup}
            onChange={(v) => onUpdate(method.key, { forPickup: v })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground">Online sichtbar</span>
          <Toggle
            checked={method.onlineVisible}
            onChange={(v) => onUpdate(method.key, { onlineVisible: v })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground">Admin sichtbar</span>
          <Toggle
            checked={method.adminVisible}
            onChange={(v) => onUpdate(method.key, { adminVisible: v })}
          />
        </label>
      </div>

      {/* Integration badge */}
      {(method.key === "paypal" || method.key === "stripe") && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Noch keine echte Zahlungsanbindung — nur Strukturvorbereitung
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: methods = [], isLoading } = useListPaymentMethods();
  const updateMethod = useUpdatePaymentMethod();

  const handleUpdate = (key: string, patch: Partial<PaymentMethodSetting>) => {
    updateMethod.mutate(
      { key, data: patch },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
          toast({ title: "Gespeichert", description: "Zahlungsart aktualisiert." });
        },
        onError: () => {
          toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <CreditCard className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold uppercase text-white tracking-wider">
              Zahlungen
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Zahlungsarten aktivieren, deaktivieren und Sichtbarkeit steuern.
          </p>
        </div>

        {/* Payment status legend */}
        <div className="mb-8 border border-border/50 bg-card p-4 rounded-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Zahlungsstatus — Bedeutung
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUS_BADGES.map((b) => (
              <div
                key={b.key}
                className={`flex items-center gap-2 px-3 py-2 border rounded text-xs font-medium ${b.cls}`}
              >
                <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                {b.label}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Den Zahlungsstatus einer Bestellung kannst du in <strong>Bestellungen</strong> oder im{" "}
            <strong>Küchenmonitor</strong> manuell ändern.
          </p>
        </div>

        {/* Payment method cards */}
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Zahlungsarten konfigurieren
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-card border border-border/50 animate-pulse rounded-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((method) => (
              <MethodCard
                key={method.key}
                method={method}
                onUpdate={handleUpdate}
                isUpdating={updateMethod.isPending}
              />
            ))}
          </div>
        )}

        {/* Future note */}
        <div className="mt-8 border border-border/30 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-white">Geplante Erweiterungen:</p>
          <p>• PayPal / Stripe Echtanbindung — Zahlungsabwicklung direkt im Checkout</p>
          <p>• Automatischer Statuswechsel auf „Bezahlt" nach erfolgreichem Online-Payment</p>
          <p>• Webhook-Empfang bei Rückerstattungen</p>
        </div>
      </div>
    </AdminLayout>
  );
}
