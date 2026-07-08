import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetCashToday,
  getGetCashTodayQueryKey,
  useCreateCashMovement,
  useDeleteCashMovement,
} from "@workspace/api-client-react";
import type { CashMovementInputType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Euro, Banknote, ShoppingBag, XCircle, Plus, Trash2, Wallet, HandCoins, Undo2, PenLine, PiggyBank,
} from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Strikte Zahl-Parsung mit deutscher Kommaeingabe; null bei ungültiger Eingabe. */
function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const MOVEMENT_OPTIONS: { value: CashMovementInputType; label: string }[] = [
  { value: "deposit", label: "Einlage" },
  { value: "payout", label: "Entnahme" },
  { value: "tip", label: "Trinkgeld" },
  { value: "refund", label: "Rückerstattung" },
  { value: "correction", label: "Korrektur" },
];

const MOVEMENT_ICONS: Record<string, React.ElementType> = {
  deposit: PiggyBank,
  payout: HandCoins,
  tip: Euro,
  refund: Undo2,
  correction: PenLine,
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-md p-4 ${accent ? "border-primary" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`p-1.5 rounded ${accent ? "bg-primary/20" : "bg-secondary"}`}>
          <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminCashRegister() {
  const [date, setDate] = useState(todayStr());
  const qc = useQueryClient();
  const { toast } = useToast();
  const { permissions } = useAdminAuth();
  const isToday = date === todayStr();

  const { data, isLoading } = useGetCashToday(isToday ? undefined : { date });
  const createMovement = useCreateCashMovement();
  const deleteMovement = useDeleteCashMovement();

  const [showDialog, setShowDialog] = useState(false);
  const [mvType, setMvType] = useState<CashMovementInputType>("deposit");
  const [mvAmount, setMvAmount] = useState("");
  const [mvNote, setMvNote] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getGetCashTodayQueryKey(isToday ? undefined : { date }) });

  const handleBook = () => {
    const parsed = parseAmount(mvAmount);
    if (parsed === null || parsed === 0) {
      toast({ title: "Bitte gültigen Betrag eingeben", description: "z. B. 20,00", variant: "destructive" });
      return;
    }
    const amount = parsed;
    if (mvType !== "correction" && amount < 0) {
      toast({ title: "Betrag muss positiv sein", description: "Nur Korrekturen dürfen negativ sein.", variant: "destructive" });
      return;
    }
    createMovement.mutate(
      { data: { type: mvType, amount, note: mvNote.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Kassenbewegung gebucht" });
          setShowDialog(false);
          setMvAmount(""); setMvNote("");
          invalidate();
        },
        onError: () => toast({ title: "Buchung fehlgeschlagen", variant: "destructive" }),
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Diese Kassenbewegung wirklich löschen?")) return;
    deleteMovement.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Bewegung gelöscht" }); invalidate(); },
        onError: () => toast({ title: "Löschen fehlgeschlagen", variant: "destructive" }),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
              Tageskasse<span className="text-primary">.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Bar-Übersicht und Kassenbewegungen{data?.lastClosingAt ? ` · Letzter Abschluss: ${new Date(data.lastClosingAt).toLocaleString("de-DE")}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayStr())}
              className="w-40 bg-secondary border-border"
            />
            <Button onClick={() => setShowDialog(true)} className="gap-2" disabled={!isToday} title={!isToday ? "Buchen nur am heutigen Tag möglich" : undefined}>
              <Plus className="w-4 h-4" /> Bewegung buchen
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground py-12 text-center">Lade Kassendaten…</p>}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Umsatz gesamt" value={fmt(data.totalRevenue)} sub={`${data.ordersCount} Bestellungen`} icon={Euro} accent />
              <KpiCard label="Bar-Umsatz" value={fmt(data.cashRevenue)} icon={Banknote} />
              <KpiCard
                label="Erwarteter Bar-Bestand"
                value={fmt(data.expectedCashBase)}
                sub="ohne Wechselgeld-Anfangsbestand"
                icon={Wallet}
              />
              <KpiCard
                label="Stornos"
                value={`${data.cancellationsCount}`}
                sub={data.cancellationsTotal > 0 ? fmt(data.cancellationsTotal) : undefined}
                icon={XCircle}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-md p-4">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Einnahmen nach Zahlungsart
                </h2>
                {data.incomeByMethod.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Noch keine Einnahmen</p>
                ) : (
                  <div className="space-y-2">
                    {data.incomeByMethod.map((row) => (
                      <div key={row.method} className="flex items-center justify-between text-sm">
                        <span className="text-white">{row.label} <span className="text-muted-foreground">({row.count})</span></span>
                        <span className="font-mono text-white">{fmt(row.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-md p-4">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Kassenbewegungen (Summen)</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white">Einlagen</span><span className="font-mono text-emerald-400">+{fmt(data.deposits)}</span></div>
                  <div className="flex justify-between"><span className="text-white">Entnahmen</span><span className="font-mono text-red-400">−{fmt(data.payouts)}</span></div>
                  <div className="flex justify-between"><span className="text-white">Trinkgeld</span><span className="font-mono text-white">{fmt(data.tips)}</span></div>
                  <div className="flex justify-between"><span className="text-white">Rückerstattungen</span><span className="font-mono text-red-400">−{fmt(data.refunds)}</span></div>
                  <div className="flex justify-between"><span className="text-white">Korrekturen</span><span className="font-mono text-white">{fmt(data.corrections)}</span></div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-md p-4">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Rabatte</h2>
                <p className="text-2xl font-bold font-mono text-white">{fmt(data.discountsTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">gewährte Rabatte am {new Date(`${data.date}T00:00:00`).toLocaleDateString("de-DE")}</p>
                {permissions.includes("cashClosing.manage") && (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => { window.location.href = "/backstage/cash-closing"; }}>
                    Zum Kassenabschluss
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-md">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Bewegungen am {new Date(`${data.date}T00:00:00`).toLocaleDateString("de-DE")}</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Art</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead>Gebucht von</TableHead>
                    <TableHead>Uhrzeit</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Keine Kassenbewegungen an diesem Tag
                      </TableCell>
                    </TableRow>
                  )}
                  {data.movements.map((m) => {
                    const Icon = MOVEMENT_ICONS[m.type] ?? PenLine;
                    const negative = m.type === "payout" || m.type === "refund" || m.amount < 0;
                    return (
                      <TableRow key={m.id} className="hover:bg-secondary/20">
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Icon className="w-3 h-3" /> {m.typeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono ${negative ? "text-red-400" : "text-emerald-400"}`}>
                          {negative ? "−" : "+"}{fmt(Math.abs(m.amount))}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.note || <span className="italic">–</span>}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.createdByUsername || <span className="italic">–</span>}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(m.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kassenbewegung buchen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Art</Label>
              <Select value={mvType} onValueChange={(v) => setMvType(v as CashMovementInputType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Betrag (€)</Label>
              <Input
                inputMode="decimal"
                placeholder={mvType === "correction" ? "z. B. -5,00 oder 5,00" : "z. B. 20,00"}
                value={mvAmount}
                onChange={(e) => setMvAmount(e.target.value)}
              />
              {mvType === "correction" && (
                <p className="text-xs text-muted-foreground">Korrekturen dürfen auch negativ sein.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Input value={mvNote} onChange={(e) => setMvNote(e.target.value)} placeholder="z. B. Wechselgeld geholt" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={handleBook} disabled={createMovement.isPending}>
              {createMovement.isPending ? "Bucht…" : "Buchen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
