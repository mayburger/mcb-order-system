import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminItems, getListAdminItemsQueryKey,
  useListAdminCategories, getListAdminCategoriesQueryKey,
  useCreateAdminMenuItem, useUpdateAdminMenuItem, useDeleteAdminMenuItem,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  name: string; description: string; price: string; categoryId: number;
  available: boolean; featured: boolean; imageUrl: string; sortOrder: number;
}
const EMPTY: FormState = { name: "", description: "", price: "", categoryId: 0, available: true, featured: false, imageUrl: "", sortOrder: 0 };

export default function AdminProducts() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [catFilter, setCatFilter] = useState<number | undefined>();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);

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
    if (!name.trim() || !price || !categoryId) { toast({ title: "Name, price and category required", variant: "destructive" }); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) { toast({ title: "Invalid price", variant: "destructive" }); return; }

    const data = { name, description, price: priceNum, categoryId, available, featured, imageUrl: imageUrl || undefined, sortOrder };
    if (dialog.mode === "create") {
      createItem.mutate({ data }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Item created" }); },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    } else {
      updateItem.mutate({ id: dialog.id!, data }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Item updated" }); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    }
  };

  const handleToggleAvailable = (id: number, available: boolean) => {
    updateItem.mutate({ id, data: { available: !available } }, {
      onSuccess: () => invalidate(),
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    deleteItem.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Item deleted" }); },
    });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Products</h1>
        <div className="flex items-center gap-3">
          <select value={catFilter ?? ""} onChange={(e) => setCatFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-card border border-border text-white text-sm px-3 py-2 rounded-none focus:outline-none focus:border-primary">
            <option value="">All Categories</option>
            {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90 shrink-0"
            onClick={() => setDialog({ mode: "create", form: { ...EMPTY, categoryId: catFilter ?? (cats?.[0]?.id ?? 0) } })}>
            <Plus className="h-4 w-4 mr-2" /> New Item
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
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Available</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Featured</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items?.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{item.name}</p>
                    {item.description && <p className="text-muted-foreground text-xs truncate max-w-xs">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{item.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-white font-medium">£{item.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleAvailable(item.id, item.available)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${item.available ? "bg-primary" : "bg-border"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${item.available ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 ${item.featured ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>{item.featured ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white"
                        onClick={() => setDialog({ mode: "edit", id: item.id, form: { name: item.name, description: item.description ?? "", price: item.price.toFixed(2), categoryId: item.categoryId, available: item.available, featured: item.featured, imageUrl: item.imageUrl ?? "", sortOrder: item.sortOrder } })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item.id, item.name)}>
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

      {/* Dialog */}
      {dialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold uppercase text-white">{dialog.mode === "create" ? "New Item" : "Edit Item"}</h2>
              <button onClick={() => setDialog(null)}><X className="h-5 w-5 text-muted-foreground hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Name *</label>
                <Input value={dialog.form.name} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Price (£) *</label>
                <Input type="number" step="0.01" value={dialog.form.price} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, price: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Category *</label>
                <select value={dialog.form.categoryId} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, categoryId: Number(e.target.value) } })}
                  className="w-full bg-background border border-border text-white text-sm px-3 py-2 rounded-none focus:outline-none focus:border-primary">
                  <option value={0}>Select...</option>
                  {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Description</label>
                <textarea value={dialog.form.description} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })}
                  className="w-full rounded-none border border-border bg-background text-white p-3 h-20 resize-none focus:outline-none focus:border-primary text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Image URL</label>
                <Input value={dialog.form.imageUrl} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, imageUrl: e.target.value } })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Sort Order</label>
                <Input type="number" value={dialog.form.sortOrder} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, sortOrder: Number(e.target.value) } })} />
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dialog.form.available} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, available: e.target.checked } })} className="accent-primary" />
                  <span className="text-sm text-white">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dialog.form.featured} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, featured: e.target.checked } })} className="accent-primary" />
                  <span className="text-sm text-white">Featured</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 rounded-none uppercase font-bold bg-primary hover:bg-primary/90" onClick={handleSave}
                disabled={createItem.isPending || updateItem.isPending}>Save</Button>
              <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
