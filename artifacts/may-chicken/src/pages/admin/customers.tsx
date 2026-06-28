import { useState, useMemo, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListCrmCustomers,
  useGetCrmCustomer,
  useUpdateCrmCustomer,
  useCreateCrmNote,
  useDeleteCrmNote,
  getListCrmCustomersQueryKey,
  getGetCrmCustomerQueryKey,
  useGetAdminSession,
  getGetAdminSessionQueryKey,
  CrmCustomerListItem,
  CrmCustomerDetail,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, X, Star, Crown, Ban, UserCheck, ShoppingBag,
  TrendingUp, Heart, FileText, MessageSquare, Download, Clock,
  CreditCard, Truck, ChevronRight, Plus, Trash2, Shield,
  Gift, AlertTriangle, Award, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  preparing: "bg-orange-500/20 text-orange-400",
  ready: "bg-green-500/20 text-green-400",
  delivering: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend", confirmed: "Bestätigt", preparing: "In Zubereitung",
  ready: "Fertig", delivering: "Unterwegs", completed: "Abgeschlossen", cancelled: "Storniert",
};
const PAY_LABEL: Record<string, string> = {
  cash: "Bar", ec_pickup: "EC (Abh.)", ec_delivery: "EC (Lief.)",
  paypal: "PayPal", stripe: "Karte", lieferando: "Lieferando",
};
const TYPE_LABEL: Record<string, string> = { delivery: "Lieferung", pickup: "Abholung" };

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtMoney(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

// ── Customer badges ───────────────────────────────────────────────────────────
function CustomerBadges({ c }: { c: Pick<CrmCustomerListItem, "isGuest" | "vipStatus" | "isRegular" | "isBlocked"> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {c.isBlocked && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-500/20 text-red-400 font-bold uppercase tracking-wider">Gesperrt</span>}
      {c.vipStatus && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-400 font-bold uppercase tracking-wider">VIP</span>}
      {c.isRegular && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary font-bold uppercase tracking-wider">Stammkunde</span>}
      {c.isGuest && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground uppercase tracking-wider">Gast</span>}
    </div>
  );
}

// ── Section tabs for detail panel ─────────────────────────────────────────────
type Tab = "uebersicht" | "verhalten" | "favoriten" | "treue" | "kommunikation";
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "uebersicht", label: "Übersicht", icon: Users },
  { id: "verhalten", label: "Bestellverhalten", icon: TrendingUp },
  { id: "favoriten", label: "Favoriten & Notizen", icon: Heart },
  { id: "treue", label: "Treueprogramm", icon: Award },
  { id: "kommunikation", label: "Kommunikation", icon: MessageSquare },
];

// ── Guest detail panel (behavioral data only, no CRM features) ───────────────
function GuestDetailPanel({ customer, onClose }: { customer: CrmCustomerListItem; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-display font-bold uppercase text-white">{customer.name}</h2>
            <CustomerBadges c={customer} />
          </div>
          <p className="text-muted-foreground text-sm">{customer.phone}</p>
          {customer.email && <p className="text-muted-foreground text-sm">{customer.email}</p>}
          <p className="text-xs text-muted-foreground mt-1">Gastkunde · keine Registrierung</p>
        </div>
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-white shrink-0" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Bestellungen" value={String(customer.orderCount)} />
          <StatCard label="Umsatz" value={fmtMoney(customer.totalSpent)} accent />
          <StatCard label="Ø Bestellwert" value={fmtMoney(customer.avgOrderValue)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Erste Bestellung" value={fmt(customer.firstOrderAt)} />
          <StatCard label="Letzte Bestellung" value={fmt(customer.lastOrderAt)} />
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-none text-xs text-yellow-400 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Gastkunde: Keine CRM-Aktionen (Sperren, Notizen, Treueprogramm) verfügbar, da kein Kundenkonto existiert.</span>
        </div>
      </div>
    </div>
  );
}

// ── Registered customer detail panel ─────────────────────────────────────────
function RegisteredDetailPanel({ customerId, listItem, onClose }: {
  customerId: number;
  listItem: CrmCustomerListItem;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: detail, isLoading } = useGetCrmCustomer(customerId, {
    query: { queryKey: getGetCrmCustomerQueryKey(customerId) },
  });
  const updateCrm = useUpdateCrmCustomer();
  const createNote = useCreateCrmNote();
  const deleteNote = useDeleteCrmNote();

  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [newNoteText, setNewNoteText] = useState("");
  const [loyaltyInput, setLoyaltyInput] = useState<string | null>(null);
  const [birthdayInput, setBirthdayInput] = useState<string | null>(null);
  const [ordersExpanded, setOrdersExpanded] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetCrmCustomerQueryKey(customerId) });
    qc.invalidateQueries({ queryKey: getListCrmCustomersQueryKey() });
  };

  const toggle = (field: "isBlocked" | "isRegular" | "vipStatus", current: boolean) => {
    updateCrm.mutate(
      { id: customerId, data: { [field]: !current } },
      { onSuccess: invalidate },
    );
  };

  const saveLoyalty = () => {
    const n = parseInt(loyaltyInput ?? "", 10);
    if (isNaN(n) || n < 0) return;
    updateCrm.mutate({ id: customerId, data: { loyaltyPoints: n } }, { onSuccess: () => { setLoyaltyInput(null); invalidate(); } });
  };

  const saveBirthday = () => {
    updateCrm.mutate({ id: customerId, data: { birthday: birthdayInput ?? "" } }, { onSuccess: () => { setBirthdayInput(null); invalidate(); } });
  };

  const addCrmNote = () => {
    if (!newNoteText.trim()) return;
    createNote.mutate(
      { id: customerId, data: { text: newNoteText.trim() } },
      { onSuccess: () => { setNewNoteText(""); invalidate(); } },
    );
  };

  const removeCrmNote = (noteId: number) => {
    deleteNote.mutate(
      { id: customerId, noteId },
      { onSuccess: invalidate },
    );
  };

  if (isLoading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Lade Kundenkarte…</div>
      </div>
    );
  }

  const d = detail as CrmCustomerDetail;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-display font-bold uppercase text-white truncate">
                {d.firstName} {d.lastName}
              </h2>
              <CustomerBadges c={{ isGuest: false, vipStatus: d.vipStatus, isRegular: d.isRegular, isBlocked: d.isBlocked }} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{d.email}</p>
            {d.phone && <p className="text-muted-foreground text-sm">{d.phone}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">Kunde seit {fmt(d.createdAt)}</p>
          </div>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-white shrink-0 ml-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-3 text-xs mt-3">
          <div className="text-center">
            <div className="text-white font-bold text-lg leading-none">{d.orderCount}</div>
            <div className="text-muted-foreground">Bestellungen</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-primary font-bold text-lg leading-none">{fmtMoney(d.totalSpent)}</div>
            <div className="text-muted-foreground">Gesamtumsatz</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-white font-bold text-lg leading-none">{fmtMoney(d.avgOrderValue)}</div>
            <div className="text-muted-foreground">Ø Bestellwert</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-white font-bold text-lg leading-none">{d.loyaltyPoints}</div>
            <div className="text-muted-foreground">Punkte</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ── ÜBERSICHT ── */}
        {activeTab === "uebersicht" && (
          <>
            <Section title="Persönliche Daten" icon={Users}>
              <InfoRow label="Vorname" value={d.firstName} />
              <InfoRow label="Nachname" value={d.lastName || "—"} />
              <InfoRow label="E-Mail" value={d.email} />
              <InfoRow label="Telefon" value={d.phone || "—"} />
              <InfoRow
                label="Geburtstag"
                value={
                  birthdayInput !== null ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={birthdayInput}
                        onChange={(e) => setBirthdayInput(e.target.value)}
                        className="bg-secondary border border-border text-white text-xs px-2 py-1 rounded-none"
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={saveBirthday}>Speichern</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBirthdayInput(null)}>Abbrechen</Button>
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:text-white underline decoration-dashed"
                      onClick={() => setBirthdayInput(d.birthday ?? "")}
                    >
                      {d.birthday ? new Date(d.birthday).toLocaleDateString("de-DE") : "Nicht gesetzt — klicken zum Bearbeiten"}
                    </span>
                  )
                }
              />
              <InfoRow label="Registriert am" value={fmt(d.createdAt)} />
            </Section>

            <Section title="Bestellstatistiken" icon={ShoppingBag}>
              <InfoRow label="Anzahl Bestellungen" value={String(d.orderCount)} />
              <InfoRow label="Gesamtumsatz" value={fmtMoney(d.totalSpent)} accent />
              <InfoRow label="Ø Bestellwert" value={fmtMoney(d.avgOrderValue)} />
              <InfoRow label="Erste Bestellung" value={fmt(d.firstOrderAt)} />
              <InfoRow label="Letzte Bestellung" value={fmt(d.lastOrderAt)} />
            </Section>

            <Section title="Bestellverlauf" icon={ShoppingBag}>
              {d.orders.length === 0 ? (
                <p className="text-muted-foreground text-sm">Noch keine Bestellungen</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {(ordersExpanded ? d.orders : d.orders.slice(0, 4)).map((order) => (
                      <div key={order.id} className="bg-background border border-border px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${STATUS_COLOR[order.status] ?? ""}`}>
                              {STATUS_LABEL[order.status] ?? order.status}
                            </span>
                            <span className="text-white font-bold text-sm">{fmtMoney(Number(order.total))}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{fmt(order.createdAt)}</span>
                          <span>·</span>
                          <span>{TYPE_LABEL[order.orderType] ?? order.orderType}</span>
                          <span>·</span>
                          <span>{order.paymentMethod ? (PAY_LABEL[order.paymentMethod] ?? order.paymentMethod) : "—"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {order.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                  {d.orders.length > 4 && (
                    <button
                      onClick={() => setOrdersExpanded(!ordersExpanded)}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      {ordersExpanded ? <><ChevronUp className="h-3 w-3" />Weniger anzeigen</> : <><ChevronDown className="h-3 w-3" />{d.orders.length - 4} weitere anzeigen</>}
                    </button>
                  )}
                </>
              )}
            </Section>
          </>
        )}

        {/* ── BESTELLVERHALTEN ── */}
        {activeTab === "verhalten" && (
          <>
            <Section title="Lieblingsprodukte" icon={TrendingUp}>
              {d.topItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">Noch keine Daten</p>
              ) : (
                <div className="space-y-1.5">
                  {d.topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-background border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                        <span className="text-white text-sm">{item.itemName}</span>
                      </div>
                      <span className="text-primary font-mono text-sm font-bold">{item.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Meist bestellte Extras" icon={Plus}>
              {d.topExtras.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Extras bestellt</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {d.topExtras.map((extra, i) => (
                    <div key={i} className="flex items-center gap-1 bg-secondary border border-border px-2 py-1 text-xs">
                      <span className="text-white">{extra.name}</span>
                      <span className="text-primary">({extra.count}×)</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Bestellmuster" icon={Clock}>
              <InfoRow label="Häufigste Bestellzeit" value={d.preferredOrderTime ?? "—"} />
              <InfoRow label="Bevorzugte Zahlungsart" value={d.preferredPaymentMethod ? (PAY_LABEL[d.preferredPaymentMethod] ?? d.preferredPaymentMethod) : "—"} />
              <InfoRow label="Bevorzugter Bestelltyp" value={d.preferredOrderType ? (TYPE_LABEL[d.preferredOrderType] ?? d.preferredOrderType) : "—"} />
            </Section>
          </>
        )}

        {/* ── FAVORITEN & NOTIZEN ── */}
        {activeTab === "favoriten" && (
          <>
            <Section title="Gespeicherte Lieblingsbestellungen" icon={Heart}>
              {d.favorites.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Favoriten gespeichert</p>
              ) : (
                <div className="space-y-2">
                  {d.favorites.map((fav) => (
                    <div key={fav.id} className="bg-background border border-border px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold text-sm">{fav.name}</span>
                        <span className="text-xs text-muted-foreground">{fmt(fav.createdAt)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {fav.items.map((i: { quantity: number; itemName: string }) => `${i.quantity}× ${i.itemName}`).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Gespeicherte Notizen (Lieferhinweise)" icon={FileText}>
              {d.notes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Notizen</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {d.notes.map((n) => (
                    <div key={n.id} className="text-xs px-2 py-1 bg-secondary border border-border text-muted-foreground flex items-center gap-1">
                      <span>{n.text}</span>
                      {(n as { usageCount?: number }).usageCount ? (
                        <span className="text-primary">({(n as { usageCount?: number }).usageCount}×)</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ── TREUEPROGRAMM ── */}
        {activeTab === "treue" && (
          <>
            <Section title="Bonuspunkte" icon={Award}>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-primary">{d.loyaltyPoints}</div>
                <div>
                  <div className="text-white text-sm font-medium">Punkte</div>
                  <div className="text-muted-foreground text-xs">Entspricht {fmtMoney(d.loyaltyPoints * 0.01)} Rabatt</div>
                </div>
              </div>
              <div className="mt-3">
                {loyaltyInput !== null ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min={0}
                      value={loyaltyInput}
                      onChange={(e) => setLoyaltyInput(e.target.value)}
                      className="h-8 w-32 text-sm"
                      placeholder="Punkte"
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={saveLoyalty}>Speichern</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setLoyaltyInput(null)}>Abbrechen</Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setLoyaltyInput(String(d.loyaltyPoints))}
                  >
                    Punkte anpassen
                  </Button>
                )}
              </div>
            </Section>

            <Section title="Status & Privilegien" icon={Crown}>
              <div className="space-y-3">
                <ToggleRow
                  label="VIP-Status"
                  description="Sonderprivilegien und besondere Behandlung"
                  icon={Crown}
                  active={d.vipStatus}
                  activeColor="text-yellow-400"
                  activeBg="bg-yellow-500/10 border-yellow-500/30"
                  onToggle={() => toggle("vipStatus", d.vipStatus)}
                  loading={updateCrm.isPending}
                />
                <ToggleRow
                  label="Stammkunde"
                  description="Als Stammkunde markiert"
                  icon={Star}
                  active={d.isRegular}
                  activeColor="text-primary"
                  activeBg="bg-primary/10 border-primary/30"
                  onToggle={() => toggle("isRegular", d.isRegular)}
                  loading={updateCrm.isPending}
                />
              </div>
            </Section>

            <Section title="Geburtstagsgutschein" icon={Gift}>
              <div className="bg-secondary border border-border p-3 text-sm text-muted-foreground">
                {d.birthday ? (
                  <span>Geburtstag: <strong className="text-white">{new Date(d.birthday).toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}</strong> — Gutschein kann manuell ausgestellt werden.</span>
                ) : (
                  <span>Kein Geburtstag hinterlegt. Im Tab "Übersicht" eintragen.</span>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ── KOMMUNIKATION ── */}
        {activeTab === "kommunikation" && (
          <>
            <Section title="Interne Notizen (nur Admin sichtbar)" icon={MessageSquare}>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Neue interne Notiz eingeben…"
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addCrmNote()}
                />
                <Button
                  size="sm"
                  onClick={addCrmNote}
                  disabled={!newNoteText.trim() || createNote.isPending}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {d.crmNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Noch keine internen Notizen</p>
              ) : (
                <div className="space-y-2">
                  {d.crmNotes.map((note) => (
                    <div key={note.id} className="bg-background border border-border px-3 py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm">{note.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmt(note.createdAt)}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400 shrink-0"
                        onClick={() => removeCrmNote(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Kundenstatus" icon={Shield}>
              <ToggleRow
                label="Kunde sperren"
                description={d.isBlocked ? "Dieser Kunde ist aktuell gesperrt" : "Kunde ist aktiv und kann bestellen"}
                icon={Ban}
                active={d.isBlocked}
                activeColor="text-red-400"
                activeBg="bg-red-500/10 border-red-500/30"
                onToggle={() => toggle("isBlocked", d.isBlocked)}
                loading={updateCrm.isPending}
                dangerMode
              />
            </Section>

            <Section title="DSGVO" icon={Shield}>
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-none text-xs text-blue-300 space-y-1">
                <p className="font-semibold">Datenschutzhinweis (Art. 13 DSGVO)</p>
                <p>Die gespeicherten Kundendaten werden ausschließlich zur Auftragsabwicklung und Kundenpflege verwendet (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO).</p>
                <p>Kunden haben das Recht auf Auskunft, Berichtigung und Löschung ihrer Daten. Bei Anfragen wende dich an den Datenschutzbeauftragten.</p>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card border border-border p-3 text-center">
      <div className={`text-lg font-bold ${accent ? "text-primary" : "text-white"}`}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right ${accent ? "text-primary font-bold" : "text-white"}`}>{value}</span>
    </div>
  );
}

function ToggleRow({
  label, description, icon: Icon, active, activeColor, activeBg,
  onToggle, loading, dangerMode,
}: {
  label: string; description: string; icon: React.ComponentType<{ className?: string }>;
  active: boolean; activeColor: string; activeBg: string;
  onToggle: () => void; loading?: boolean; dangerMode?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 border ${active ? activeBg : "bg-background border-border"}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${active ? activeColor : "text-muted-foreground"}`} />
        <div>
          <div className={`text-sm font-medium ${active ? "text-white" : "text-muted-foreground"}`}>{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Button
        size="sm"
        variant={active ? (dangerMode ? "destructive" : "default") : "outline"}
        className="text-xs h-8 shrink-0"
        onClick={onToggle}
        disabled={loading}
      >
        {active ? "Deaktivieren" : "Aktivieren"}
      </Button>
    </div>
  );
}

// ── Main CRM Page ─────────────────────────────────────────────────────────────
type Filter = "all" | "vip" | "regular" | "blocked" | "guests";

export default function AdminCustomers() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: customers, isLoading } = useListCrmCustomers(
    debouncedSearch ? { search: debouncedSearch } : undefined,
    { query: { queryKey: getListCrmCustomersQueryKey(debouncedSearch ? { search: debouncedSearch } : undefined) } },
  );

  // All hooks must be called before any early return
  const filtered = useMemo(() => {
    const list = customers ?? [];
    switch (filter) {
      case "vip": return list.filter((c) => c.vipStatus);
      case "regular": return list.filter((c) => c.isRegular);
      case "blocked": return list.filter((c) => c.isBlocked);
      case "guests": return list.filter((c) => c.isGuest);
      default: return list;
    }
  }, [customers, filter]);

  const counts = useMemo(() => ({
    all: customers?.length ?? 0,
    vip: customers?.filter((c) => c.vipStatus).length ?? 0,
    regular: customers?.filter((c) => c.isRegular).length ?? 0,
    blocked: customers?.filter((c) => c.isBlocked).length ?? 0,
    guests: customers?.filter((c) => c.isGuest).length ?? 0,
  }), [customers]);

  useEffect(() => {
    if (!sl && !session?.authenticated) navigate("/backstage");
  }, [sl, session, navigate]);

  if (!sl && !session?.authenticated) return null;

  const selectedListItem = customers?.find((c) =>
    selectedId !== null ? c.id === selectedId : c.phone === selectedPhone,
  ) ?? null;

  const isDetailOpen = selectedId !== null || selectedPhone !== null;

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const handleSelectCustomer = (c: CrmCustomerListItem) => {
    if (c.id !== null && !c.isGuest) {
      setSelectedId(c.id ?? null);
      setSelectedPhone(null);
    } else {
      setSelectedPhone(c.phone);
      setSelectedId(null);
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    setSelectedPhone(null);
  };

  const handleExport = (format: "csv" | "xlsx") => {
    window.open(`/api/admin/crm/export?format=${format}`, "_blank");
  };

  const FILTERS: { id: Filter; label: string; color?: string }[] = [
    { id: "all", label: `Alle (${counts.all})` },
    { id: "vip", label: `VIP (${counts.vip})`, color: "text-yellow-400" },
    { id: "regular", label: `Stammkunden (${counts.regular})`, color: "text-primary" },
    { id: "blocked", label: `Gesperrt (${counts.blocked})`, color: "text-red-400" },
    { id: "guests", label: `Gäste (${counts.guests})` },
  ];

  return (
    <AdminLayout>
      <div className="flex gap-6 h-[calc(100vh-4rem)] -m-6 md:-m-8 overflow-hidden">

        {/* ── Left: list ── */}
        <div className={`${isDetailOpen ? "hidden lg:flex" : "flex"} flex-col flex-1 min-w-0 overflow-hidden p-6 md:p-8`}>

          {/* Header */}
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-display font-bold uppercase text-white flex items-center gap-2">
                <Users className="h-7 w-7 text-primary" />
                Kunden
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">{counts.all} Kunden insgesamt</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => handleExport("csv")}
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => handleExport("xlsx")}
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Suche nach Name, Telefon, E-Mail oder Bestellnummer…"
              className="pl-9 bg-card"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs px-3 py-1 border transition-colors ${
                  filter === f.id
                    ? "bg-primary border-primary text-white"
                    : "border-border text-muted-foreground hover:text-white hover:border-border/80 bg-card"
                } ${filter !== f.id && f.color ? f.color : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Customer table */}
          {isLoading ? (
            <div className="space-y-2 flex-1">
              {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border p-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? "Keine Kunden gefunden." : "Noch keine Kunden. Sie erscheinen nach der ersten Bestellung."}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border overflow-hidden flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="border-b border-border sticky top-0 bg-card z-10">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Telefon</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">E-Mail</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider text-right">Best.</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider text-right hidden sm:table-cell">Umsatz</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Letzte Best.</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c, i) => {
                    const isSelected = selectedId !== null ? c.id === selectedId : c.phone === selectedPhone;
                    return (
                      <tr
                        key={i}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-secondary/30"}`}
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white text-sm">{c.name}</div>
                          <CustomerBadges c={c} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{c.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden lg:table-cell">{c.email ?? "—"}</td>
                        <td className="px-4 py-3 text-white text-right font-mono text-sm">{c.orderCount}</td>
                        <td className="px-4 py-3 text-white text-right font-mono text-sm hidden sm:table-cell">{fmtMoney(c.totalSpent)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden xl:table-cell">{fmt(c.lastOrderAt)}</td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* DSGVO notice */}
          <div className="mt-4 text-xs text-muted-foreground flex items-start gap-2 bg-card border border-border/50 p-3">
            <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-400" />
            <span>
              <strong className="text-white">DSGVO:</strong> Kundendaten werden nur für die Auftragsabwicklung verwendet (Art. 6 Abs. 1 lit. b DSGVO). Beim Export sind die Datenschutzpflichten zu beachten. Nicht benötigte Daten sind zu löschen.
            </span>
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        {isDetailOpen && selectedListItem && (
          <div className="w-full lg:w-[480px] xl:w-[520px] bg-card border-l border-border flex flex-col overflow-hidden shrink-0">
            {selectedId !== null ? (
              <RegisteredDetailPanel
                key={selectedId}
                customerId={selectedId}
                listItem={selectedListItem}
                onClose={handleClose}
              />
            ) : (
              <GuestDetailPanel customer={selectedListItem} onClose={handleClose} />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
