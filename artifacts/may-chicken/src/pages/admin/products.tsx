import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminItems, getListAdminItemsQueryKey,
  useListAdminCategories, getListAdminCategoriesQueryKey,
  useCreateAdminMenuItem, useUpdateAdminMenuItem, useDeleteAdminMenuItem,
  useListItemVariants, getListItemVariantsQueryKey,
  useCreateItemVariant, useUpdateItemVariant, useDeleteItemVariant,
  useListItemExtras, getListItemExtrasQueryKey,
  useCreateItemExtra, useUpdateItemExtra, useDeleteItemExtra,
  useGetAdminSession, getGetAdminSessionQueryKey,
  MenuItem,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  name: string; description: string; price: string; categoryId: number;
  available: boolean; featured: boolean; imageUrl: string; sortOrder: number;
}
const EMPTY: FormState = {
  name: "", description: "", price: "", categoryId: 0,
  available: true, featured: false, imageUrl: "", sortOrder: 0,
};

// ── Variants Editor ──────────────────────────────────────────────────────────
function VariantsEditor({ itemId }: { itemId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const qKey = getListItemVariantsQueryKey(itemId);
  const { data: variants } = useListItemVariants(itemId, { query: { queryKey: qKey } });
  const create = useCreateItemVariant();
  const update = useUpdateItemVariant();
  const del = useDeleteItemVariant();

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });

  const handleAdd = () => {
    const price = parseFloat(newPrice);
    if (!newName.trim() || isNaN(price)) {
      toast({ title: "Name und Preis erforderlich", variant: "destructive" });
      return;
    }
    create.mutate(
      { id: itemId, data: { name: newName.trim(), price, sortOrder: variants?.length ?? 0 } },
      {
        onSuccess: () => { invalidate(); setNewName(""); setNewPrice(""); toast({ title: "Variante hinzugefügt" }); },
        onError: () => toast({ title: "Fehler", variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (id: number) => {
    const price = parseFloat(editPrice);
    if (!editName.trim() || isNaN(price)) return;
    update.mutate(
      { id, data: { name: editName.trim(), price } },
      {
        onSuccess: () => { invalidate(); setEditId(null); toast({ title: "Variante aktualisiert" }); },
        onError: () => toast({ title: "Fehler", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, { onSuccess: () => invalidate() });
  };

  return (
    <div className="space-y-2">
      {variants?.map((v) => (
        <div key={v.id} className="flex items-center gap-2 bg-secondary/30 border border-border p-2">
          {editId === v.id ? (
            <>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="h-7 text-sm rounded-none border-border bg-background text-white flex-1" placeholder="Name" />
              <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                type="number" step="0.01" className="h-7 text-sm rounded-none border-border bg-background text-white w-24" placeholder="Preis" />
              <span className="text-muted-foreground text-sm">€</span>
              <Button size="sm" className="h-7 text-xs rounded-none bg-primary hover:bg-primary/90" onClick={() => handleUpdate(v.id)}>OK</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>✕</Button>
            </>
          ) : (
            <>
              <span className="text-white font-medium text-sm flex-1">{v.name}</span>
              <span className="text-primary font-bold text-sm">{v.price.toFixed(2)} €</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white"
                onClick={() => { setEditId(v.id); setEditName(v.name); setEditPrice(v.price.toFixed(2)); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(v.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}
      {/* Neue Variante */}
      <div className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="z.B. 29 cm" className="h-8 text-sm rounded-none border-border bg-background text-white flex-1" />
        <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
          type="number" step="0.01" placeholder="Preis" className="h-8 text-sm rounded-none border-border bg-background text-white w-28" />
        <span className="text-muted-foreground text-sm">€</span>
        <Button size="sm" className="h-8 rounded-none bg-primary hover:bg-primary/90 text-xs"
          onClick={handleAdd} disabled={create.isPending}>
          <Plus className="h-3 w-3 mr-1" /> Hinzufügen
        </Button>
      </div>
    </div>
  );
}

// ── Extras Editor ────────────────────────────────────────────────────────────
function ExtrasEditor({ itemId }: { itemId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const qKey = getListItemExtrasQueryKey(itemId);
  const { data: extras } = useListItemExtras(itemId, { query: { queryKey: qKey } });
  const create = useCreateItemExtra();
  const update = useUpdateItemExtra();
  const del = useDeleteItemExtra();

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });

  const handleAdd = () => {
    if (!newName.trim()) { toast({ title: "Name erforderlich", variant: "destructive" }); return; }
    const price = parseFloat(newPrice) || 0;
    create.mutate(
      { id: itemId, data: { name: newName.trim(), price, sortOrder: extras?.length ?? 0 } },
      {
        onSuccess: () => { invalidate(); setNewName(""); setNewPrice("0"); toast({ title: "Extra hinzugefügt" }); },
        onError: () => toast({ title: "Fehler", variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (id: number) => {
    if (!editName.trim()) return;
    const price = parseFloat(editPrice) || 0;
    update.mutate(
      { id, data: { name: editName.trim(), price } },
      {
        onSuccess: () => { invalidate(); setEditId(null); toast({ title: "Extra aktualisiert" }); },
        onError: () => toast({ title: "Fehler", variant: "destructive" }),
      }
    );
  };

  const handleToggleAvailable = (id: number, available: boolean) => {
    update.mutate({ id, data: { available: !available } }, { onSuccess: () => invalidate() });
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, { onSuccess: () => invalidate() });
  };

  return (
    <div className="space-y-2">
      {extras?.map((e) => (
        <div key={e.id} className="flex items-center gap-2 bg-secondary/30 border border-border p-2">
          {editId === e.id ? (
            <>
              <Input value={editName} onChange={(ev) => setEditName(ev.target.value)}
                className="h-7 text-sm rounded-none border-border bg-background text-white flex-1" placeholder="Name" />
              <Input value={editPrice} onChange={(ev) => setEditPrice(ev.target.value)}
                type="number" step="0.01" className="h-7 text-sm rounded-none border-border bg-background text-white w-24" placeholder="Preis" />
              <span className="text-muted-foreground text-sm">€</span>
              <Button size="sm" className="h-7 text-xs rounded-none bg-primary hover:bg-primary/90" onClick={() => handleUpdate(e.id)}>OK</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>✕</Button>
            </>
          ) : (
            <>
              <span className={`text-sm flex-1 ${e.available ? "text-white" : "text-muted-foreground line-through"}`}>{e.name}</span>
              <span className="text-primary text-sm font-bold">{e.price > 0 ? `+${e.price.toFixed(2)} €` : "Gratis"}</span>
              <button onClick={() => handleToggleAvailable(e.id, e.available)}
                className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${e.available ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${e.available ? "right-0.5" : "left-0.5"}`} />
              </button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white"
                onClick={() => { setEditId(e.id); setEditName(e.name); setEditPrice(e.price.toFixed(2)); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(e.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="z.B. Extra Käse" className="h-8 text-sm rounded-none border-border bg-background text-white flex-1" />
        <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
          type="number" step="0.01" placeholder="0.00" className="h-8 text-sm rounded-none border-border bg-background text-white w-28" />
        <span className="text-muted-foreground text-sm">€</span>
        <Button size="sm" className="h-8 rounded-none bg-primary hover:bg-primary/90 text-xs"
          onClick={handleAdd} disabled={create.isPending}>
          <Plus className="h-3 w-3 mr-1" /> Hinzufügen
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [catFilter, setCatFilter] = useState<number | undefined>();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedTab, setExpandedTab] = useState<"variants" | "extras">("variants");

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const params = catFilter ? { categoryId: catFilter } : {};
  const { data: items, isLoading } = useListAdminItems(params, { query: { queryKey: getListAdminItemsQueryKey(params) } });
  const { data: cats } = useListAdminCategories({ query: { queryKey: getListAdminCategoriesQueryKey() } });
  const createItem = useCreateAdminMenuItem();
  const updateItem = useUpdateAdminMenuItem();
  const deleteItem = useDeleteAdminMenuItem();

  if (!sl && !session?.authenticated) { navigate("/admin"); return null; }

  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminItemsQueryKey(params) });

  const handleSave = () => {
    if (!dialog) return;
    const { name, description, price, categoryId, available, featured, imageUrl, sortOrder } = dialog.form;
    if (!name.trim() || !price || !categoryId) {
      toast({ title: "Name, Preis und Kategorie erforderlich", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) { toast({ title: "Ungültiger Preis", variant: "destructive" }); return; }

    const data = { name, description, price: priceNum, categoryId, available, featured, imageUrl: imageUrl || undefined, sortOrder };
    if (dialog.mode === "create") {
      createItem.mutate({ data }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Artikel erstellt" }); },
        onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
      });
    } else {
      updateItem.mutate({ id: dialog.id!, data }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Artikel aktualisiert" }); },
        onError: () => toast({ title: "Fehler beim Aktualisieren", variant: "destructive" }),
      });
    }
  };

  const handleToggleAvailable = (id: number, available: boolean) => {
    updateItem.mutate({ id, data: { available: !available } }, { onSuccess: () => invalidate() });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`„${name}" wirklich löschen?`)) return;
    deleteItem.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Artikel gelöscht" }); },
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
    setExpandedTab("variants");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Produkte</h1>
        <div className="flex items-center gap-3">
          <select value={catFilter ?? ""} onChange={(e) => setCatFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-card border border-border text-white text-sm px-3 py-2 rounded-none focus:outline-none focus:border-primary">
            <option value="">Alle Kategorien</option>
            {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90 shrink-0"
            onClick={() => setDialog({ mode: "create", form: { ...EMPTY, categoryId: catFilter ?? (cats?.[0]?.id ?? 0) } })}>
            <Plus className="h-4 w-4 mr-2" /> Neuer Artikel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider w-8" />
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Kategorie</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Preis</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Varianten</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Verfügbar</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Empfohlen</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items?.map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleExpand(item.id)} className="text-muted-foreground hover:text-white">
                        {expandedId === item.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-muted-foreground text-xs truncate max-w-xs">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{item.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      {(item.variants?.length ?? 0) > 0 ? (
                        <span className="text-muted-foreground text-xs">ab {Math.min(...(item.variants ?? []).map(v => v.price)).toFixed(2)} €</span>
                      ) : (
                        <span>{item.price.toFixed(2)} €</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(item.variants?.length ?? 0) > 0 ? (
                        <button onClick={() => toggleExpand(item.id)}
                          className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 hover:bg-primary/30">
                          <Layers className="h-3 w-3" />
                          {item.variants!.length} Größen
                        </button>
                      ) : (
                        <button onClick={() => { setExpandedId(item.id); setExpandedTab("variants"); }}
                          className="text-xs text-muted-foreground hover:text-white border border-border px-2 py-0.5">
                          + Größen
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleAvailable(item.id, item.available)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${item.available ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${item.available ? "right-0.5" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 ${item.featured ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>
                        {item.featured ? "Ja" : "Nein"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white"
                          onClick={() => setDialog({
                            mode: "edit", id: item.id,
                            form: {
                              name: item.name, description: item.description ?? "",
                              price: item.price.toFixed(2), categoryId: item.categoryId,
                              available: item.available, featured: item.featured,
                              imageUrl: item.imageUrl ?? "", sortOrder: item.sortOrder,
                            },
                          })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item.id, item.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Variants/Extras Editor */}
                  {expandedId === item.id && (
                    <tr key={`${item.id}-expanded`}>
                      <td colSpan={8} className="bg-secondary/10 border-b border-border px-6 py-4">
                        {/* Tabs */}
                        <div className="flex gap-4 mb-4 border-b border-border">
                          <button
                            onClick={() => setExpandedTab("variants")}
                            className={`pb-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${expandedTab === "variants" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"}`}
                          >
                            Größen / Varianten
                          </button>
                          <button
                            onClick={() => setExpandedTab("extras")}
                            className={`pb-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${expandedTab === "extras" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"}`}
                          >
                            Extras / Zutaten
                          </button>
                        </div>

                        {expandedTab === "variants" ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Wenn Größen definiert sind, wählt der Kunde im Shop eine Größe aus. Der Preis der Größe wird verwendet.
                            </p>
                            <VariantsEditor itemId={item.id} />
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Extras werden dem Kunden als optionale Zusätze angezeigt.
                            </p>
                            <ExtrasEditor itemId={item.id} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Artikel-Dialog */}
      {dialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold uppercase text-white">
                {dialog.mode === "create" ? "Neuer Artikel" : "Artikel bearbeiten"}
              </h2>
              <button onClick={() => setDialog(null)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-white" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Name *</label>
                <Input value={dialog.form.name} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Grundpreis (€) *</label>
                <Input type="number" step="0.01" value={dialog.form.price} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, price: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Kategorie *</label>
                <select value={dialog.form.categoryId} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, categoryId: Number(e.target.value) } })}
                  className="w-full bg-background border border-border text-white text-sm px-3 py-2 rounded-none focus:outline-none focus:border-primary">
                  <option value={0}>Auswählen...</option>
                  {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Beschreibung</label>
                <textarea value={dialog.form.description}
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })}
                  className="w-full rounded-none border border-border bg-background text-white p-3 h-20 resize-none focus:outline-none focus:border-primary text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bild-URL</label>
                <Input value={dialog.form.imageUrl} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, imageUrl: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Reihenfolge</label>
                <Input type="number" value={dialog.form.sortOrder} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, sortOrder: Number(e.target.value) } })} />
              </div>
              <div className="flex flex-col gap-3 justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dialog.form.available}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, available: e.target.checked } })} className="accent-primary" />
                  <span className="text-sm text-white">Verfügbar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dialog.form.featured}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, featured: e.target.checked } })} className="accent-primary" />
                  <span className="text-sm text-white">Empfohlen</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 rounded-none uppercase font-bold bg-primary hover:bg-primary/90"
                onClick={handleSave} disabled={createItem.isPending || updateItem.isPending}>
                Speichern
              </Button>
              <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
