import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetCashToday,
  useListCashClosings,
  getListCashClosingsQueryKey,
  useCreateCashClosing,
  useDeleteCashClosing,
  getGetCashTodayQueryKey,
} from "@workspace/api-client-react";
import type { CashClosing, CashClosingInputType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
import { Printer, Trash2, Eye, FileCheck, AlertTriangle } from "lucide-react";

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

function dt(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ClosingDetail({ closing }: { closing: CashClosing }) {
  return (
    <div className="space-y-4 text-sm" id="closing-print-area">
      <div className="print:block hidden text-center mb-4">
        <p className="text-lg font-bold">May Chicken &amp; Burger</p>
        <p>{closing.type === "day" ? "Tagesabschluss" : "Schichtabschluss"} Nr. {closing.id}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <span className="text-muted-foreground print:text-black">Zeitraum</span>
        <span className="text-white print:text-black text-right">{dt(closing.periodStart)} – {dt(closing.periodEnd)}</span>
        <span className="text-muted-foreground print:text-black">Abgeschlossen von</span>
        <span className="text-white print:text-black text-right">{closing.closedByUsername || "–"}</span>
        <span className="text-muted-foreground print:text-black">Bestellungen</span>
        <span className="text-white print:text-black text-right">{closing.ordersCount}</span>
        <span className="text-muted-foreground print:text-black">Stornos</span>
        <span className="text-white print:text-black text-right">{closing.cancellationsCount} ({fmt(closing.cancellationsTotal)})</span>
      </div>
      <hr className="border-border" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <span className="text-muted-foreground print:text-black">Umsatz gesamt</span>
        <span className="text-white print:text-black text-right font-mono">{fmt(closing.totalRevenue)}</span>
        <span className="text-muted-foreground print:text-black">davon Bar</span>
        <span className="text-white print:text-black text-right font-mono">{fmt(closing.cashRevenue)}</span>
        <span className="text-muted-foreground print:text-black">Trinkgeld</span>
        <span className="text-white print:text-black text-right font-mono">{fmt(closing.tipsTotal)}</span>
        <span className="text-muted-foreground print:text-black">Einlagen</span>
        <span className="text-white print:text-black text-right font-mono">+{fmt(closing.depositsTotal)}</span>
        <span className="text-muted-foreground print:text-black">Entnahmen</span>
        <span className="text-white print:text-black text-right font-mono">−{fmt(closing.payoutsTotal)}</span>
        <span className="text-muted-foreground print:text-black">Rückerstattungen</span>
        <span className="text-white print:text-black text-right font-mono">−{fmt(closing.refundsTotal)}</span>
      </div>
      {closing.incomeByMethod.length > 0 && (
        <>
          <hr className="border-border" />
          <p className="text-muted-foreground print:text-black uppercase text-xs tracking-wider">Einnahmen nach Zahlungsart</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {closing.incomeByMethod.map((row) => (
              <div key={row.method} className="contents">
                <span className="text-white print:text-black">{row.label} ({row.count})</span>
                <span className="text-white print:text-black text-right font-mono">{fmt(row.revenue)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <hr className="border-border" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <span className="text-muted-foreground print:text-black">Wechselgeld (Anfangsbestand)</span>
        <span className="text-white print:text-black text-right font-mono">{fmt(closing.openingFloat)}</span>
        <span className="text-muted-foreground print:text-black">Erwarteter Kassenbestand</span>
        <span className="text-white print:text-black text-right font-mono">{fmt(closing.expectedCash)}</span>
        <span className="text-muted-foreground print:text-black">Gezählter Kassenbestand</span>
        <span className="text-white print:text-black text-right font-mono">{fmt(closing.countedCash)}</span>
        <span className="font-semibold text-white print:text-black">Differenz</span>
        <span className={`text-right font-mono font-semibold ${Math.abs(closing.difference) < 0.005 ? "text-emerald-400" : "text-red-400"} print:text-black`}>
          {closing.difference > 0 ? "+" : ""}{fmt(closing.difference)}
        </span>
      </div>
      {closing.notes && (
        <>
          <hr className="border-border" />
          <p className="text-muted-foreground print:text-black">Notiz: <span className="text-white print:text-black">{closing.notes}</span></p>
        </>
      )}
    </div>
  );
}

export default function AdminCashClosing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: today } = useGetCashToday();
  const { data: closings, isLoading } = useListCashClosings();
  const createClosing = useCreateCashClosing();
  const deleteClosing = useDeleteCashClosing();

  const [type, setType] = useState<CashClosingInputType>("day");
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [detail, setDetail] = useState<CashClosing | null>(null);

  const openingParsed = openingFloat.trim() ? parseAmount(openingFloat) : 0;
  const countedParsed = parseAmount(countedCash);
  const openingInvalid = openingFloat.trim() !== "" && openingParsed === null;
  const countedInvalid = countedCash.trim() !== "" && countedParsed === null;
  const expected = useMemo(
    () => (today && openingParsed !== null ? openingParsed + today.expectedCashBase : null),
    [today, openingParsed],
  );
  const difference =
    expected !== null && countedParsed !== null ? countedParsed - expected : null;

  const handleCreate = () => {
    if (openingParsed === null) {
      toast({ title: "Ungültiger Anfangsbestand", description: "Bitte gültigen Betrag eingeben, z. B. 100,00", variant: "destructive" });
      return;
    }
    if (countedParsed === null) {
      toast({ title: "Ungültiger Kassenbestand", description: "Bitte gezählten Betrag eingeben, z. B. 385,50", variant: "destructive" });
      return;
    }
    if (openingParsed < 0 || countedParsed < 0) {
      toast({ title: "Beträge dürfen nicht negativ sein", variant: "destructive" });
      return;
    }
    createClosing.mutate(
      { data: { type, openingFloat: openingParsed, countedCash: countedParsed, notes: notes.trim() || undefined } },
      {
        onSuccess: (created) => {
          toast({ title: type === "day" ? "Tagesabschluss erstellt" : "Schichtabschluss erstellt" });
          setOpeningFloat(""); setCountedCash(""); setNotes("");
          qc.invalidateQueries({ queryKey: getListCashClosingsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetCashTodayQueryKey() });
          setDetail(created);
        },
        onError: () => toast({ title: "Abschluss fehlgeschlagen", variant: "destructive" }),
      },
    );
  };

  const handleDelete = (c: CashClosing) => {
    if (!window.confirm(`${c.type === "day" ? "Tagesabschluss" : "Schichtabschluss"} Nr. ${c.id} wirklich löschen?`)) return;
    deleteClosing.mutate(
      { id: c.id },
      {
        onSuccess: () => {
          toast({ title: "Abschluss gelöscht" });
          qc.invalidateQueries({ queryKey: getListCashClosingsQueryKey() });
        },
        onError: () => toast({ title: "Löschen fehlgeschlagen", variant: "destructive" }),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
            Kassenabschluss<span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">Tages- oder Schichtabschluss erstellen und Historie einsehen</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-md p-5 space-y-4">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4" /> Neuer Abschluss
            </h2>
            <div className="space-y-2">
              <Label>Art</Label>
              <Select value={type} onValueChange={(v) => setType(v as CashClosingInputType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Tagesabschluss (seit 00:00 Uhr)</SelectItem>
                  <SelectItem value="shift">Schichtabschluss (seit letztem Abschluss)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wechselgeld / Anfangsbestand (€)</Label>
              <Input inputMode="decimal" placeholder="z. B. 100,00" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} className={openingInvalid ? "border-red-500" : ""} />
              {openingInvalid && <p className="text-xs text-red-400">Ungültiger Betrag – z. B. 100,00</p>}
            </div>
            <div className="space-y-2">
              <Label>Gezählter Kassenbestand (€)</Label>
              <Input inputMode="decimal" placeholder="z. B. 385,50" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} className={countedInvalid ? "border-red-500" : ""} />
              {countedInvalid && <p className="text-xs text-red-400">Ungültiger Betrag – z. B. 385,50</p>}
            </div>
            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. Besonderheiten der Schicht" />
            </div>

            {type === "day" && expected !== null && (
              <div className="bg-secondary/40 rounded-md p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Erwarteter Bestand (heute)</span>
                  <span className="font-mono text-white">{fmt(expected)}</span>
                </div>
                {difference !== null && (
                  <div className="flex justify-between font-semibold">
                    <span className="text-muted-foreground">Differenz</span>
                    <span className={`font-mono ${Math.abs(difference) < 0.005 ? "text-emerald-400" : "text-red-400"}`}>
                      {difference > 0 ? "+" : ""}{fmt(difference)}
                    </span>
                  </div>
                )}
                {difference !== null && Math.abs(difference) >= 0.005 && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Kassendifferenz — bitte prüfen
                  </p>
                )}
              </div>
            )}

            <Button className="w-full" onClick={handleCreate} disabled={createClosing.isPending}>
              {createClosing.isPending ? "Erstellt…" : "Abschluss erstellen"}
            </Button>
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Bisherige Abschlüsse</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr.</TableHead>
                  <TableHead>Art</TableHead>
                  <TableHead>Abgeschlossen am</TableHead>
                  <TableHead className="text-right">Umsatz</TableHead>
                  <TableHead className="text-right">Differenz</TableHead>
                  <TableHead>Von</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Lade Abschlüsse…</TableCell></TableRow>
                )}
                {!isLoading && (!closings || closings.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Noch keine Abschlüsse vorhanden</TableCell></TableRow>
                )}
                {closings?.map((c) => (
                  <TableRow key={c.id} className="hover:bg-secondary/20">
                    <TableCell className="font-mono text-muted-foreground">#{c.id}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.type === "day" ? "Tag" : "Schicht"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-white">{dt(c.closedAt)}</TableCell>
                    <TableCell className="text-right font-mono text-white">{fmt(c.totalRevenue)}</TableCell>
                    <TableCell className={`text-right font-mono ${Math.abs(c.difference) < 0.005 ? "text-emerald-400" : "text-red-400"}`}>
                      {c.difference > 0 ? "+" : ""}{fmt(c.difference)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.closedByUsername || "–"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => setDetail(c)} title="Ansehen">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(c)} title="Löschen">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-lg print:max-w-full print:border-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>
              {detail?.type === "day" ? "Tagesabschluss" : "Schichtabschluss"} Nr. {detail?.id}
            </DialogTitle>
          </DialogHeader>
          {detail && <ClosingDetail closing={detail} />}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setDetail(null)}>Schließen</Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> Drucken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
