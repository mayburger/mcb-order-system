import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminDeliveryAreas, getListAdminDeliveryAreasQueryKey,
  useCreateDeliveryArea, useUpdateDeliveryArea, useDeleteDeliveryArea,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormState { postalCode: string; name: string; deliveryFee: string; minOrder: string; }
const EMPTY: FormState = { postalCode: "", name: "", deliveryFee: "", minOrder: "" };

export default function AdminDeliveryAreas() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: areas, isLoading } = useListAdminDeliveryAreas({ query: { queryKey: getListAdminDeliveryAreasQueryKey() } });
  const createArea = useCreateDeliveryArea();
  const updateArea = useUpdateDeliveryArea();
  const deleteArea = useDeleteDeliveryArea();

  if (!sl && !session?.authenticated) { navigate("/backstage"); return null; }

  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminDeliveryAreasQueryKey() });

  const handleSave = () => {
    if (!dialog) return;
    const { postalCode, name, deliveryFee, minOrder } = dialog.form;
    if (!postalCode.trim() || !name.trim()) { toast({ title: "PLZ und Gebietsname erforderlich", variant: "destructive" }); return; }
    const data = { postalCode: postalCode.trim(), name: name.trim(), deliveryFee: parseFloat(deliveryFee) || 0, minOrder: parseFloat(minOrder) || 0 };

    if (dialog.mode === "create") {
      createArea.mutate({ data }, { onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Gebiet hinzugefügt" }); }, onError: () => toast({ title: "Fehler", variant: "destructive" }) });
    } else {
      updateArea.mutate({ id: dialog.id!, data }, { onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Gebiet aktualisiert" }); }, onError: () => toast({ title: "Fehler", variant: "destructive" }) });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Dieses Liefergebiet wirklich löschen?")) return;
    deleteArea.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Gebiet gelöscht" }); } });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase text-white">Liefergebiete</h1>
          <p className="text-muted-foreground mt-1">Lege fest, in welche Postleitzahlgebiete geliefert wird.</p>
        </div>
        <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
          onClick={() => setDialog({ mode: "create", form: EMPTY })}>
          <Plus className="h-4 w-4 mr-2" /> Gebiet hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
      ) : areas?.length === 0 ? (
        <div className="bg-card border border-border p-16 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Liefergebiete konfiguriert.</p>
        </div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">PLZ</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Gebiet</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Liefergebühr</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Mind. Bestellung</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Aktiv</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {areas?.map((a) => (
                <tr key={a.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 text-white font-mono font-medium">{a.postalCode}</td>
                  <td className="px-4 py-3 text-white">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.deliveryFee.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.minOrder.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold uppercase ${a.active ? "text-green-400" : "text-muted-foreground"}`}>{a.active ? "Ja" : "Nein"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white"
                        onClick={() => setDialog({ mode: "edit", id: a.id, form: { postalCode: a.postalCode, name: a.name, deliveryFee: String(a.deliveryFee), minOrder: String(a.minOrder) } })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(a.id)}>
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

      {dialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold uppercase text-white">{dialog.mode === "create" ? "Gebiet hinzufügen" : "Gebiet bearbeiten"}</h2>
              <button onClick={() => setDialog(null)}><X className="h-5 w-5 text-muted-foreground hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "PLZ *", key: "postalCode" as const, type: "text" },
                { label: "Gebietsname *", key: "name" as const, type: "text" },
                { label: "Liefergebühr (€)", key: "deliveryFee" as const, type: "number" },
                { label: "Mind. Bestellung (€)", key: "minOrder" as const, type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
                  <Input type={type} step={type === "number" ? "0.01" : undefined} value={dialog.form[key]}
                    className="rounded-none border-border bg-background text-white"
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, [key]: e.target.value } })} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 rounded-none uppercase font-bold bg-primary hover:bg-primary/90" onClick={handleSave}
                disabled={createArea.isPending || updateArea.isPending}>Speichern</Button>
              <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
