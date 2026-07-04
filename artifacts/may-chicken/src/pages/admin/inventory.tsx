import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useListInventory,
  useCreateStockItem,
  useUpdateStockItem,
  useDeleteStockItem,
  useListStockMovements,
  useCreateStockMovement,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import type { StockItem, StockMovement } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  History,
  ArrowDownUp,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const MOVEMENT_LABELS: Record<string, string> = {
  sale: "Verkauf",
  restock: "Wareneingang",
  correction: "Korrektur",
  loss: "Verlust / Schwund",
  consumption: "Eigenverbrauch",
  cancellation: "Storno",
};

const UNITS = ["Stück", "kg", "g", "Liter", "ml", "Packung"];

export default function AdminInventory() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useListInventory();
  const createItem = useCreateStockItem();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();
  const createMovement = useCreateStockMovement();

  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const [form, setForm] = useState({
    menuItemId: "",
    name: "",
    category: "",
    currentStock: "0",
    minStock: "5",
    unit: "Stück",
    purchasePrice: "",
    supplier: "",
    active: true,
    trackStock: true,
  });

  const [movForm, setMovForm] = useState({
    stockItemId: "",
    movementType: "restock" as const,
    quantity: "",
    notes: "",
  });

  const { data: movements = [], isLoading: movLoading } = useListStockMovements(
    selectedItemId ? { stockItemId: selectedItemId, limit: 100 } : { limit: 100 }
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ menuItemId: "", name: "", category: "", currentStock: "0", minStock: "5", unit: "Stück", purchasePrice: "", supplier: "", active: true, trackStock: true });
    setShowItemDialog(true);
  };

  const openEdit = (si: StockItem) => {
    setEditItem(si);
    setForm({
      menuItemId: si.menuItemId ? String(si.menuItemId) : "",
      name: si.name,
      category: si.category ?? "",
      currentStock: String(si.currentStock),
      minStock: String(si.minStock),
      unit: si.unit,
      purchasePrice: si.purchasePrice != null ? String(si.purchasePrice) : "",
      supplier: si.supplier ?? "",
      active: si.active,
      trackStock: si.trackStock,
    });
    setShowItemDialog(true);
  };

  const openMovement = (si: StockItem) => {
    setSelectedItemId(si.id);
    setMovForm({ stockItemId: String(si.id), movementType: "restock", quantity: "", notes: "" });
    setShowMovementDialog(true);
  };

  const openHistory = (si: StockItem) => {
    setSelectedItemId(si.id);
    setShowHistoryDialog(true);
  };

  const handleSaveItem = () => {
    const payload = {
      name: form.name.trim(),
      menuItemId: form.menuItemId ? Number(form.menuItemId) : undefined,
      category: form.category.trim() || null,
      currentStock: Number(form.currentStock),
      minStock: Number(form.minStock),
      unit: form.unit,
      purchasePrice: form.purchasePrice.trim() ? Number(form.purchasePrice) : null,
      supplier: form.supplier.trim() || null,
      active: form.active,
      trackStock: form.trackStock,
    };
    if (!payload.name) { toast({ title: "Name erforderlich", variant: "destructive" }); return; }

    if (editItem) {
      updateItem.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Lagereintrag aktualisiert" });
            setShowItemDialog(false);
            qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          },
        }
      );
    } else {
      createItem.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Lagereintrag erstellt" });
            setShowItemDialog(false);
            qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          },
        }
      );
    }
  };

  const handleSaveMovement = () => {
    if (!movForm.quantity || Number(movForm.quantity) <= 0) {
      toast({ title: "Menge muss > 0 sein", variant: "destructive" }); return;
    }
    createMovement.mutate(
      {
        data: {
          stockItemId: Number(movForm.stockItemId),
          movementType: movForm.movementType,
          quantity: Number(movForm.quantity),
          notes: movForm.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lagerbewegung gebucht" });
          setShowMovementDialog(false);
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        },
      }
    );
  };

  const handleDelete = (si: StockItem) => {
    if (!confirm(`„${si.name}" wirklich löschen?`)) return;
    deleteItem.mutate(
      { id: si.id },
      {
        onSuccess: () => {
          toast({ title: "Gelöscht" });
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        },
      }
    );
  };

  const lowCount = items.filter((i) => i.isLow).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Lagerverwaltung
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Automatischer Abzug bei Bestellungen · Manuelle Korrekturen möglich
            </p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Neuer Eintrag
          </Button>
        </div>

        {/* Low-stock alert */}
        {lowCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-950/40 border border-amber-700/50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">{lowCount} Artikel</span> unter dem Mindestbestand
            </p>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-muted-foreground">Zutat / Artikel</TableHead>
                <TableHead className="text-muted-foreground">Kategorie</TableHead>
                <TableHead className="text-muted-foreground text-right">Bestand</TableHead>
                <TableHead className="text-muted-foreground text-right">Mindest</TableHead>
                <TableHead className="text-muted-foreground">Einheit</TableHead>
                <TableHead className="text-muted-foreground text-right">EK-Preis</TableHead>
                <TableHead className="text-muted-foreground">Lieferant</TableHead>
                <TableHead className="text-muted-foreground">Tracking</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                    Lade Lagerdaten…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                    Noch keine Lagereinträge — klicke „Neuer Eintrag" um loszulegen
                  </TableCell>
                </TableRow>
              )}
              {items.map((si) => {
                return (
                  <TableRow key={si.id} className={`hover:bg-secondary/20 ${si.active ? "" : "opacity-50"}`}>
                    <TableCell className="font-medium text-white">{si.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {si.category ? si.category : <span className="italic">–</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={si.isLow ? "text-amber-400 font-semibold" : "text-white"}>
                        {si.currentStock.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {si.minStock.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{si.unit}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {si.purchasePrice != null ? `${si.purchasePrice.toFixed(2)} €` : <span className="italic">–</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {si.supplier ? si.supplier : <span className="italic">–</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={si.trackStock ? "default" : "secondary"} className={si.trackStock ? "bg-emerald-700 text-white" : ""}>
                        {si.trackStock ? "Aktiv" : "Pausiert"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!si.active ? (
                        <Badge className="bg-secondary text-muted-foreground">Inaktiv</Badge>
                      ) : si.isLow ? (
                        <Badge className="bg-amber-700 text-white gap-1">
                          <AlertTriangle className="w-3 h-3" /> Niedrig
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-700/80 text-white">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openMovement(si)} title="Lagerbewegung buchen">
                          <ArrowDownUp className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-400" onClick={() => openHistory(si)} title="Verlauf">
                          <History className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEdit(si)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(si)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-display uppercase tracking-tight">
              {editItem ? "Lagereintrag bearbeiten" : "Neuer Lagereintrag"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Hähnchenbrustfilet"
                className="bg-secondary border-border text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Kategorie (optional)</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="z.B. Fleisch, Gemüse, Getränke"
                className="bg-secondary border-border text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Aktueller Bestand</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.currentStock}
                  onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
                  className="bg-secondary border-border text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Mindestbestand</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.minStock}
                  onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                  className="bg-secondary border-border text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Einheit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger className="bg-secondary border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(UNITS.includes(form.unit) ? UNITS : [form.unit, ...UNITS]).map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">EK-Preis / Einheit (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  placeholder="z.B. 4.50"
                  className="bg-secondary border-border text-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Lieferant (optional)</Label>
              <Input
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                placeholder="z.B. Metro, Großmarkt XY"
                className="bg-secondary border-border text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.trackStock}
                onCheckedChange={(v) => setForm((f) => ({ ...f, trackStock: v }))}
              />
              <Label className="text-muted-foreground cursor-pointer">Tracking aktiv (automatischer Abzug bei Bestellungen)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label className="text-muted-foreground cursor-pointer">Zutat aktiv (inaktive erscheinen nicht in Warnungen)</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setShowItemDialog(false)}>
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                onClick={handleSaveItem}
                disabled={createItem.isPending || updateItem.isPending}
              >
                {editItem ? "Speichern" : "Erstellen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-display uppercase tracking-tight">
              Lagerbewegung buchen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Artikel</Label>
              <Select value={movForm.stockItemId} onValueChange={(v) => setMovForm((f) => ({ ...f, stockItemId: v }))}>
                <SelectTrigger className="bg-secondary border-border text-white">
                  <SelectValue placeholder="Artikel wählen" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {items.map((si) => (
                    <SelectItem key={si.id} value={String(si.id)}>
                      {si.name} ({si.currentStock} {si.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Art der Bewegung</Label>
              <Select
                value={movForm.movementType}
                onValueChange={(v) => setMovForm((f) => ({ ...f, movementType: v as typeof movForm.movementType }))}
              >
                <SelectTrigger className="bg-secondary border-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="restock">Nachfüllung (+)</SelectItem>
                  <SelectItem value="cancellation">Stornierung (+)</SelectItem>
                  <SelectItem value="loss">Verlust (−)</SelectItem>
                  <SelectItem value="consumption">Verbrauch (−)</SelectItem>
                  <SelectItem value="correction">Korrektur (±, positiv = Zugang)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Menge *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={movForm.quantity}
                onChange={(e) => setMovForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="z.B. 10"
                className="bg-secondary border-border text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Notiz (optional)</Label>
              <Input
                value={movForm.notes}
                onChange={(e) => setMovForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="z.B. Lieferung von Großmarkt"
                className="bg-secondary border-border text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setShowMovementDialog(false)}>
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                onClick={handleSaveMovement}
                disabled={createMovement.isPending}
              >
                Buchen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-display uppercase tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Bewegungsverlauf — {items.find((i) => i.id === selectedItemId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {movLoading && (
              <p className="text-center text-muted-foreground py-8">Lade Verlauf…</p>
            )}
            {!movLoading && movements.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Noch keine Bewegungen</p>
            )}
            {!movLoading && movements.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="text-muted-foreground">Datum</TableHead>
                    <TableHead className="text-muted-foreground">Art</TableHead>
                    <TableHead className="text-muted-foreground text-right">Menge</TableHead>
                    <TableHead className="text-muted-foreground text-right">Vorher</TableHead>
                    <TableHead className="text-muted-foreground text-right">Nachher</TableHead>
                    <TableHead className="text-muted-foreground">Notiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((sm: StockMovement) => (
                    <TableRow key={sm.id} className="hover:bg-secondary/20">
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(sm.createdAt), "dd.MM.yy HH:mm", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sm.movementType === "sale" ? "bg-red-800 text-white" :
                            sm.movementType === "restock" || sm.movementType === "cancellation" ? "bg-emerald-800 text-white" :
                            "bg-secondary text-muted-foreground"
                          }
                        >
                          {MOVEMENT_LABELS[sm.movementType] ?? sm.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${sm.quantity >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {sm.quantity >= 0 ? "+" : ""}{sm.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {sm.previousStock.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-white">
                        {sm.newStock.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {sm.notes ?? (sm.orderId ? `Bestellung #${sm.orderId}` : "–")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
