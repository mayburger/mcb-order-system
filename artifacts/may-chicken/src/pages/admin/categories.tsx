import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminCategories, getListAdminCategoriesQueryKey,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useBulkSortCategories,
  Category,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check, Eye, EyeOff, GripVertical, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FormState {
  name: string; slug: string; description: string;
  imageUrl: string; icon: string; visible: boolean; sortOrder: number;
}
const EMPTY: FormState = { name: "", slug: "", description: "", imageUrl: "", icon: "", visible: true, sortOrder: 0 };
const autoSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function catToForm(c: Category): FormState {
  return {
    name: c.name, slug: c.slug, description: c.description ?? "",
    imageUrl: c.imageUrl ?? "", icon: c.icon ?? "", visible: c.visible, sortOrder: c.sortOrder,
  };
}

// ── Sortable Row ───────────────────────────────────────────────────────────────
function SortableRow({
  cat, onEdit, onDelete, onToggleVisible, isUpdating,
}: {
  cat: Category;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  isUpdating: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 border-b border-border bg-card hover:bg-secondary/10 transition-colors ${!cat.visible ? "opacity-60" : ""}`}
    >
      {/* Drag handle */}
      <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icon/Image */}
      <div className="w-10 h-10 border border-border bg-secondary/20 flex items-center justify-center shrink-0 overflow-hidden">
        {cat.imageUrl ? (
          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
        ) : cat.icon ? (
          <span className="text-xl">{cat.icon}</span>
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      {/* Name + info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-sm">{cat.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{cat.slug}</span>
          {!cat.visible && (
            <Badge className="text-xs bg-secondary/40 text-muted-foreground border-border">Ausgeblendet</Badge>
          )}
        </div>
        {cat.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{cat.description}</p>
        )}
      </div>

      {/* Item count */}
      <span className="text-xs text-muted-foreground hidden sm:block shrink-0">
        {(cat as Category & { itemCount?: number }).itemCount ?? 0} Artikel
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleVisible}
          disabled={isUpdating}
          title={cat.visible ? "Ausblenden" : "Einblenden"}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-50"
        >
          {cat.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminCategories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);

  const { data: cats, isLoading } = useListAdminCategories({ query: { queryKey: getListAdminCategoriesQueryKey() } });
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const sortCats = useBulkSortCategories();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });
    setLocalOrder(null);
  };

  // Ordered list of categories
  const orderedCats = (() => {
    if (!cats) return [];
    if (!localOrder) return cats;
    const map = new Map(cats.map((c) => [c.id, c]));
    return localOrder.map((id) => map.get(id)).filter(Boolean) as typeof cats;
  })();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const currentIds = orderedCats.map((c) => c.id);
    const oldIndex = currentIds.indexOf(Number(active.id));
    const newIndex = currentIds.indexOf(Number(over.id));
    const newOrder = arrayMove(currentIds, oldIndex, newIndex);
    setLocalOrder(newOrder);
    sortCats.mutate({ data: { ids: newOrder } }, { onSuccess: invalidate });
  };

  const handleSave = () => {
    if (!dialog) return;
    const { name, slug, description, imageUrl, icon, visible, sortOrder } = dialog.form;
    if (!name.trim() || !slug.trim()) { toast({ title: "Name und Slug erforderlich", variant: "destructive" }); return; }
    const data = { name, slug, description: description || undefined, imageUrl: imageUrl || undefined, icon: icon || undefined, visible, sortOrder };
    if (dialog.mode === "create") {
      createCat.mutate({ data }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Kategorie erstellt" }); },
        onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
      });
    } else {
      updateCat.mutate({ id: dialog.id!, data }, {
        onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Kategorie aktualisiert" }); },
        onError: () => toast({ title: "Fehler beim Aktualisieren", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`"${name}" wirklich löschen? Alle Artikel darin werden entfernt.`)) return;
    deleteCat.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Kategorie gelöscht" }); },
      onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
    });
  };

  const handleToggleVisible = (cat: Category) => {
    updateCat.mutate({ id: cat.id, data: { visible: !cat.visible } }, { onSuccess: invalidate });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase text-white">Kategorien</h1>
            <p className="text-xs text-muted-foreground mt-1">Drag & Drop zum Sortieren · Augensymbol zum Ein-/Ausblenden</p>
          </div>
          <Button
            className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90"
            onClick={() => setDialog({ mode: "create", form: { ...EMPTY, sortOrder: orderedCats.length } })}
          >
            <Plus className="h-4 w-4 mr-2" /> Neue Kategorie
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-1">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-card border border-border animate-pulse" />)}</div>
        ) : orderedCats.length === 0 ? (
          <div className="bg-card border border-border p-16 text-center">
            <p className="text-muted-foreground">Noch keine Kategorien vorhanden.</p>
          </div>
        ) : (
          <div className="bg-card border border-border overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedCats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {orderedCats.map((cat) => (
                  <SortableRow
                    key={cat.id}
                    cat={cat}
                    onEdit={() => setDialog({ mode: "edit", id: cat.id, form: catToForm(cat) })}
                    onDelete={() => handleDelete(cat.id, cat.name)}
                    onToggleVisible={() => handleToggleVisible(cat)}
                    isUpdating={updateCat.isPending}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-secondary/10 border border-border p-3">
          <span className="font-semibold text-white">Hinweis:</span> Ausgeblendete Kategorien sind im Shop für Kunden nicht sichtbar, bleiben aber für Bestellungen und Statistiken erhalten.
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="bg-card border-border text-white max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold uppercase">
              {dialog?.mode === "create" ? "Neue Kategorie" : "Kategorie bearbeiten"}
            </DialogTitle>
          </DialogHeader>

          {dialog && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Name *</label>
                  <Input
                    value={dialog.form.name}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value, slug: dialog.mode === "create" ? autoSlug(e.target.value) : dialog.form.slug } })}
                    className="rounded-none border-border bg-background text-white"
                    placeholder="z.B. Pizza"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Slug *</label>
                  <Input
                    value={dialog.form.slug}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, slug: e.target.value } })}
                    className="rounded-none border-border bg-background text-white font-mono text-sm"
                    placeholder="z.B. pizza"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Beschreibung</label>
                <Input
                  value={dialog.form.description}
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })}
                  className="rounded-none border-border bg-background text-white"
                  placeholder="Kurze Beschreibung (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Icon (Emoji oder Text)</label>
                  <Input
                    value={dialog.form.icon}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, icon: e.target.value } })}
                    className="rounded-none border-border bg-background text-white"
                    placeholder="z.B. 🍕"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Wird angezeigt wenn kein Bild vorhanden</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Reihenfolge</label>
                  <Input
                    type="number"
                    value={dialog.form.sortOrder}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, sortOrder: Number(e.target.value) } })}
                    className="rounded-none border-border bg-background text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Bild-URL</label>
                <Input
                  value={dialog.form.imageUrl}
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, imageUrl: e.target.value } })}
                  className="rounded-none border-border bg-background text-white"
                  placeholder="https://example.com/kategorie.jpg"
                />
                {dialog.form.imageUrl && (
                  <div className="mt-2 h-24 w-full overflow-hidden border border-border">
                    <img src={dialog.form.imageUrl} alt="Vorschau" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>

              {/* Visible toggle */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDialog({ ...dialog, form: { ...dialog.form, visible: !dialog.form.visible } })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${dialog.form.visible ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dialog.form.visible ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-white">
                  {dialog.form.visible ? "Sichtbar im Shop" : "Ausgeblendet (nicht im Shop sichtbar)"}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>
                  <X className="h-4 w-4 mr-2" /> Abbrechen
                </Button>
                <Button
                  className="flex-1 rounded-none bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={createCat.isPending || updateCat.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {createCat.isPending || updateCat.isPending ? "Speichern…" : "Speichern"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
