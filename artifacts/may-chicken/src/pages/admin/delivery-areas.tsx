import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminDeliveryAreas,
  getListAdminDeliveryAreasQueryKey,
  useCreateDeliveryArea,
  useUpdateDeliveryArea,
  useDeleteDeliveryArea,
  DeliveryArea,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, MapPin, Clock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FormState {
  postalCode: string;
  name: string;
  deliveryFee: string;
  minOrder: string;
  deliveryTime: string;
  active: boolean;
}

const EMPTY: FormState = {
  postalCode: "",
  name: "",
  deliveryFee: "2.99",
  minOrder: "10.00",
  deliveryTime: "30-45 Min.",
  active: true,
};

function areaToForm(a: DeliveryArea): FormState {
  return {
    postalCode: a.postalCode,
    name: a.name,
    deliveryFee: String(a.deliveryFee),
    minOrder: String(a.minOrder),
    deliveryTime: a.deliveryTime ?? "30-45 Min.",
    active: a.active,
  };
}

export default function AdminDeliveryAreas() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);

  const { data: areas, isLoading } = useListAdminDeliveryAreas({
    query: { queryKey: getListAdminDeliveryAreasQueryKey() },
  });
  const createArea = useCreateDeliveryArea();
  const updateArea = useUpdateDeliveryArea();
  const deleteArea = useDeleteDeliveryArea();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminDeliveryAreasQueryKey() });

  const handleSave = () => {
    if (!dialog) return;
    const { postalCode, name, deliveryFee, minOrder, deliveryTime, active } = dialog.form;
    if (!postalCode.trim() || !name.trim()) {
      toast({ title: "PLZ und Gebietsname sind erforderlich", variant: "destructive" });
      return;
    }
    const data = {
      postalCode: postalCode.trim(),
      name: name.trim(),
      deliveryFee: parseFloat(deliveryFee) || 0,
      minOrder: parseFloat(minOrder) || 0,
      deliveryTime: deliveryTime.trim() || "30-45 Min.",
      active,
    };
    if (dialog.mode === "create") {
      createArea.mutate(
        { data },
        {
          onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Liefergebiet hinzugefügt" }); },
          onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
        }
      );
    } else {
      updateArea.mutate(
        { id: dialog.id!, data },
        {
          onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Liefergebiet aktualisiert" }); },
          onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    deleteArea.mutate(
      { id },
      {
        onSuccess: () => { invalidate(); toast({ title: "Liefergebiet gelöscht" }); },
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  const handleToggleActive = (area: DeliveryArea) => {
    updateArea.mutate(
      { id: area.id, data: { active: !area.active } },
      { onSuccess: invalidate }
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase text-white">Liefergebiete</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lege fest, in welche PLZ-Gebiete geliefert wird, inklusive Lieferkosten und Mindestbestellwert.
            </p>
          </div>
          <Button
            className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
            onClick={() => setDialog({ mode: "create", form: EMPTY })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Gebiet hinzufügen
          </Button>
        </div>

        {/* Info box */}
        <div className="bg-secondary/20 border border-border p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-white text-xs uppercase tracking-widest mb-2">Wie funktioniert das?</p>
          <p>• Der Kunde gibt beim Checkout seine PLZ ein — das System prüft automatisch ob wir liefern</p>
          <p>• Bei nicht erreichter Mindestbestellung erscheint ein Hinweis</p>
          <p>• Inaktive Gebiete werden im Checkout nicht angeboten</p>
          <p>• Bei Abholung gelten keine Lieferkosten und kein Mindestbestellwert</p>
        </div>

        {/* Areas table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-card border border-border animate-pulse" />)}
          </div>
        ) : !areas || areas.length === 0 ? (
          <div className="bg-card border border-border p-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-semibold">Noch keine Liefergebiete</p>
            <p className="text-xs text-muted-foreground mt-1">Füge das erste Liefergebiet hinzu.</p>
          </div>
        ) : (
          <div className="bg-card border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/20">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">PLZ</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Gebiet</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Liefergebühr</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Mindestbestellung</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Lieferzeit</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {areas.map((area) => (
                  <tr key={area.id} className={`hover:bg-secondary/10 transition-colors ${!area.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-white font-mono font-bold">{area.postalCode}</td>
                    <td className="px-4 py-3 text-white">{area.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {area.deliveryFee === 0 ? (
                        <span className="text-green-400 font-semibold text-xs">Kostenlos</span>
                      ) : (
                        <span>{area.deliveryFee.toFixed(2)} €</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {area.minOrder === 0 ? (
                        <span className="text-muted-foreground text-xs">Kein Minimum</span>
                      ) : (
                        <span>{area.minOrder.toFixed(2)} €</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {area.deliveryTime ?? "30-45 Min."}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(area)} title={area.active ? "Klicken zum Deaktivieren" : "Klicken zum Aktivieren"}>
                        <Badge className={`text-xs cursor-pointer ${area.active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-secondary text-muted-foreground border-border"}`}>
                          {area.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-white"
                          onClick={() => setDialog({ mode: "edit", id: area.id, form: areaToForm(area) })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(area.id, area.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary stats */}
        {areas && areas.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Gebiete gesamt", value: areas.length },
              { label: "Aktiv", value: areas.filter((a) => a.active).length },
              { label: "Inaktiv", value: areas.filter((a) => !a.active).length },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border p-4 text-center">
                <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Erstellen / Bearbeiten */}
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="bg-card border-border text-white max-w-lg rounded-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold uppercase">
              {dialog?.mode === "create" ? "Gebiet hinzufügen" : "Gebiet bearbeiten"}
            </DialogTitle>
          </DialogHeader>

          {dialog && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">PLZ *</label>
                  <Input
                    value={dialog.form.postalCode}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, postalCode: e.target.value } })}
                    className="rounded-none border-border bg-background text-white font-mono"
                    placeholder="12345"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Gebietsname *</label>
                  <Input
                    value={dialog.form.name}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })}
                    className="rounded-none border-border bg-background text-white"
                    placeholder="z.B. Berlin Mitte"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Liefergebühr (€)</label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={dialog.form.deliveryFee}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, deliveryFee: e.target.value } })}
                    className="rounded-none border-border bg-background text-white"
                    placeholder="2.99"
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = kostenlose Lieferung</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Mindestbestellung (€)</label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={dialog.form.minOrder}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, minOrder: e.target.value } })}
                    className="rounded-none border-border bg-background text-white"
                    placeholder="10.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = kein Minimum</p>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Lieferzeit</label>
                <Input
                  value={dialog.form.deliveryTime}
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, deliveryTime: e.target.value } })}
                  className="rounded-none border-border bg-background text-white"
                  placeholder="30-45 Min."
                />
                <p className="text-xs text-muted-foreground mt-1">Wird dem Kunden beim Checkout angezeigt</p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDialog({ ...dialog, form: { ...dialog.form, active: !dialog.form.active } })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${dialog.form.active ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dialog.form.active ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-white">
                  {dialog.form.active ? "Aktiv — wird Kunden angeboten" : "Inaktiv — nicht im Checkout sichtbar"}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
                <Button
                  className="flex-1 rounded-none bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={createArea.isPending || updateArea.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {createArea.isPending || updateArea.isPending ? "Speichern…" : "Speichern"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
