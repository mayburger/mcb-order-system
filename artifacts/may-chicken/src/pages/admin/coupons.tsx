import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListCoupons, getListCouponsQueryKey,
  useCreateCoupon, useUpdateCoupon, useDeleteCoupon,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, TicketPercent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  code: string; description: string; discountType: "percentage" | "fixed";
  discountValue: string; minOrder: string; maxUsage: string;
  expiresAt: string; active: boolean;
}
const EMPTY: FormState = { code: "", description: "", discountType: "percentage", discountValue: "", minOrder: "", maxUsage: "", expiresAt: "", active: true };

export default function AdminCoupons() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: coupons, isLoading } = useListCoupons({ query: { queryKey: getListCouponsQueryKey() } });
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  if (!sl && !session?.authenticated) { navigate("/backstage"); return null; }

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCouponsQueryKey() });

  const handleSave = () => {
    if (!dialog) return;
    const { code, description, discountType, discountValue, minOrder, maxUsage, expiresAt, active } = dialog.form;
    if (!code.trim() || !discountValue) { toast({ title: "Code und Rabattwert erforderlich", variant: "destructive" }); return; }
    const data = {
      code: code.trim().toUpperCase(), description, discountType, discountValue: parseFloat(discountValue),
      minOrder: parseFloat(minOrder) || 0, maxUsage: maxUsage ? parseInt(maxUsage) : undefined,
      expiresAt: expiresAt || undefined, active,
    };
    if (dialog.mode === "create") {
      createCoupon.mutate({ data }, { onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Gutschein erstellt" }); }, onError: () => toast({ title: "Fehler", variant: "destructive" }) });
    } else {
      updateCoupon.mutate({ id: dialog.id!, data }, { onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Gutschein aktualisiert" }); }, onError: () => toast({ title: "Fehler", variant: "destructive" }) });
    }
  };

  const handleToggle = (id: number, active: boolean) => {
    updateCoupon.mutate({ id, data: { active: !active } }, { onSuccess: () => invalidate() });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Gutschein wirklich löschen?")) return;
    deleteCoupon.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Gelöscht" }); } });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Gutscheine</h1>
        <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
          onClick={() => setDialog({ mode: "create", form: EMPTY })}>
          <Plus className="h-4 w-4 mr-2" /> Neuer Gutschein
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
      ) : coupons?.length === 0 ? (
        <div className="bg-card border border-border p-16 text-center">
          <TicketPercent className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Gutscheine. Erstelle einen für Rabatte.</p>
        </div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Rabatt</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Mind. Bestellung</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Verwendungen</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Gültig bis</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Aktiv</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons?.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-white">{c.code}</span>
                    {c.description && <p className="text-muted-foreground text-xs">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-primary font-semibold">
                    {c.discountType === "percentage" ? `${c.discountValue}%` : `${c.discountValue.toFixed(2)} €`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{(c.minOrder ?? 0).toFixed(2)} €</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.usageCount}{c.maxUsage ? `/${c.maxUsage}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("de-DE") : "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(c.id, c.active)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${c.active ? "bg-primary" : "bg-border"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${c.active ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white"
                        onClick={() => setDialog({ mode: "edit", id: c.id, form: { code: c.code, description: c.description ?? "", discountType: c.discountType as any, discountValue: String(c.discountValue), minOrder: String(c.minOrder ?? 0), maxUsage: c.maxUsage ? String(c.maxUsage) : "", expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "", active: c.active } })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c.id)}>
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
          <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold uppercase text-white">{dialog.mode === "create" ? "Neuer Gutschein" : "Gutschein bearbeiten"}</h2>
              <button onClick={() => setDialog(null)}><X className="h-5 w-5 text-muted-foreground hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Code *</label>
                <Input value={dialog.form.code} className="rounded-none border-border bg-background text-white font-mono uppercase"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, code: e.target.value.toUpperCase() } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Rabattart</label>
                <select value={dialog.form.discountType} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, discountType: e.target.value as any } })}
                  className="w-full bg-background border border-border text-white text-sm px-3 py-2 rounded-none focus:outline-none focus:border-primary">
                  <option value="percentage">Prozent (%)</option>
                  <option value="fixed">Festbetrag (€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Wert *</label>
                <Input type="number" step="0.01" value={dialog.form.discountValue} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, discountValue: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Mind. Bestellung (€)</label>
                <Input type="number" step="0.01" value={dialog.form.minOrder} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, minOrder: e.target.value } })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Beschreibung</label>
                <Input value={dialog.form.description} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Max. Verwendungen</label>
                <Input type="number" value={dialog.form.maxUsage} placeholder="Unbegrenzt" className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, maxUsage: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Gültig bis</label>
                <Input type="date" value={dialog.form.expiresAt} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, expiresAt: e.target.value } })} />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dialog.form.active} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, active: e.target.checked } })} className="accent-primary" />
                  <span className="text-sm text-white">Aktiv</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 rounded-none uppercase font-bold bg-primary hover:bg-primary/90" onClick={handleSave}
                disabled={createCoupon.isPending || updateCoupon.isPending}>Speichern</Button>
              <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
