import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminCategories, getListAdminCategoriesQueryKey,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormState { name: string; slug: string; description: string; sortOrder: number; }
const EMPTY: FormState = { name: "", slug: "", description: "", sortOrder: 0 };

export default function AdminCategories() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: cats, isLoading } = useListAdminCategories({ query: { queryKey: getListAdminCategoriesQueryKey() } });
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  if (!sl && !session?.authenticated) { navigate("/backstage"); return null; }

  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });

  const handleSave = () => {
    if (!dialog) return;
    const { name, slug, description, sortOrder } = dialog.form;
    if (!name.trim() || !slug.trim()) { toast({ title: "Name und Slug erforderlich", variant: "destructive" }); return; }

    if (dialog.mode === "create") {
      createCat.mutate({ data: { name, slug, description, sortOrder } }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Kategorie erstellt" }); },
        onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
      });
    } else {
      updateCat.mutate({ id: dialog.id!, data: { name, slug, description, sortOrder } }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Kategorie aktualisiert" }); },
        onError: () => toast({ title: "Fehler beim Aktualisieren", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Diese Kategorie wirklich löschen? Alle Artikel darin werden entfernt.")) return;
    deleteCat.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Kategorie gelöscht" }); },
      onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
    });
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Kategorien</h1>
        <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
          onClick={() => setDialog({ mode: "create", form: EMPTY })}>
          <Plus className="h-4 w-4 mr-2" /> Neue Kategorie
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Artikel</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Reihenfolge</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cats?.map((cat) => (
                <tr key={cat.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 text-white font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-sm">{cat.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.itemCount ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white"
                        onClick={() => setDialog({ mode: "edit", id: cat.id, form: { name: cat.name, slug: cat.slug, description: cat.description ?? "", sortOrder: cat.sortOrder } })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(cat.id)}>
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
              <h2 className="font-display font-bold uppercase text-white">{dialog.mode === "create" ? "Neue Kategorie" : "Kategorie bearbeiten"}</h2>
              <button onClick={() => setDialog(null)}><X className="h-5 w-5 text-muted-foreground hover:text-white" /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Name *</label>
              <Input value={dialog.form.name} className="rounded-none border-border bg-background text-white"
                onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value, slug: dialog.mode === "create" ? autoSlug(e.target.value) : dialog.form.slug } })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Slug *</label>
              <Input value={dialog.form.slug} className="rounded-none border-border bg-background text-white font-mono"
                onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, slug: e.target.value } })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Beschreibung</label>
              <Input value={dialog.form.description} className="rounded-none border-border bg-background text-white"
                onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Reihenfolge</label>
              <Input type="number" value={dialog.form.sortOrder} className="rounded-none border-border bg-background text-white"
                onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, sortOrder: Number(e.target.value) } })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 rounded-none uppercase font-bold bg-primary hover:bg-primary/90" onClick={handleSave}
                disabled={createCat.isPending || updateCat.isPending}>Speichern</Button>
              <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
