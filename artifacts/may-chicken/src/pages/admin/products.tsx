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
  useListAdminOptionGroups, getListAdminOptionGroupsQueryKey,
  useLinkMenuItemToOptionGroup, useUnlinkMenuItemFromOptionGroup,
  useBulkSortMenuItems,
  useGetItemRecipe, getGetItemRecipeQueryKey, useUpdateItemRecipe,
  useListInventory,
  MenuItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight,
  Layers, Star, Sparkles, ThumbsUp, GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ───────────────────────────────────────────────────────────────────
interface FormState {
  name: string; description: string; price: string; categoryId: number;
  available: boolean; featured: boolean; isNew: boolean; isRecommended: boolean;
  imageUrl: string; sortOrder: number;
}
const EMPTY: FormState = {
  name: "", description: "", price: "", categoryId: 0,
  available: true, featured: false, isNew: false, isRecommended: false,
  imageUrl: "", sortOrder: 0,
};

// ── Toggle Badge ─────────────────────────────────────────────────────────────
function ToggleBadge({ active, label, icon, onClick, color }: {
  active: boolean; label: string; icon: React.ReactNode; onClick: () => void; color: string;
}) {
  return (
    <button onClick={onClick} title={label} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border transition-colors ${active ? color : "border-border/50 text-muted-foreground/50 bg-transparent hover:border-border"}`}>
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

// ── Variants Editor ─────────────────────────────────────────────────────────
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

  return (
    <div className="space-y-2">
      {variants?.map((v) => (
        <div key={v.id} className="flex items-center gap-2 bg-secondary/30 border border-border p-2">
          {editId === v.id ? (
            <>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm rounded-none border-border bg-background text-white flex-1" />
              <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" step="0.01" className="h-7 text-sm rounded-none border-border bg-background text-white w-24" />
              <span className="text-muted-foreground text-sm">€</span>
              <Button size="sm" className="h-7 text-xs rounded-none bg-primary" onClick={() => {
                const price = parseFloat(editPrice);
                if (!editName.trim() || isNaN(price)) return;
                update.mutate({ id: v.id, data: { name: editName.trim(), price } }, { onSuccess: () => { invalidate(); setEditId(null); } });
              }}>OK</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>✕</Button>
            </>
          ) : (
            <>
              <span className="text-white font-medium text-sm flex-1">{v.name}</span>
              <span className="text-primary font-bold text-sm">{v.price.toFixed(2)} €</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => { setEditId(v.id); setEditName(v.name); setEditPrice(v.price.toFixed(2)); }}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: v.id }, { onSuccess: invalidate })}><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. 29 cm" className="h-8 text-sm rounded-none border-border bg-background text-white flex-1" />
        <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" step="0.01" placeholder="Preis" className="h-8 text-sm rounded-none border-border bg-background text-white w-28" />
        <span className="text-muted-foreground text-sm">€</span>
        <Button size="sm" className="h-8 rounded-none bg-primary text-xs" onClick={() => {
          const price = parseFloat(newPrice);
          if (!newName.trim() || isNaN(price)) { toast({ title: "Name und Preis erforderlich", variant: "destructive" }); return; }
          create.mutate({ id: itemId, data: { name: newName.trim(), price, sortOrder: variants?.length ?? 0 } }, { onSuccess: () => { invalidate(); setNewName(""); setNewPrice(""); } });
        }} disabled={create.isPending}><Plus className="h-3 w-3 mr-1" />Hinzufügen</Button>
      </div>
    </div>
  );
}

// ── Extras Editor ─────────────────────────────────────────────────────────────
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

  return (
    <div className="space-y-2">
      {extras?.map((e) => (
        <div key={e.id} className="flex items-center gap-2 bg-secondary/30 border border-border p-2">
          {editId === e.id ? (
            <>
              <Input value={editName} onChange={(ev) => setEditName(ev.target.value)} className="h-7 text-sm rounded-none border-border bg-background text-white flex-1" />
              <Input value={editPrice} onChange={(ev) => setEditPrice(ev.target.value)} type="number" step="0.01" className="h-7 text-sm rounded-none border-border bg-background text-white w-24" />
              <span className="text-muted-foreground text-sm">€</span>
              <Button size="sm" className="h-7 text-xs rounded-none bg-primary" onClick={() => {
                update.mutate({ id: e.id, data: { name: editName.trim(), price: parseFloat(editPrice) || 0 } }, { onSuccess: () => { invalidate(); setEditId(null); } });
              }}>OK</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>✕</Button>
            </>
          ) : (
            <>
              <span className={`text-sm flex-1 ${e.available ? "text-white" : "text-muted-foreground line-through"}`}>{e.name}</span>
              <span className="text-primary text-sm font-bold">{e.price > 0 ? `+${e.price.toFixed(2)} €` : "Gratis"}</span>
              <button onClick={() => update.mutate({ id: e.id, data: { available: !e.available } }, { onSuccess: invalidate })}
                className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${e.available ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${e.available ? "right-0.5" : "left-0.5"}`} />
              </button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => { setEditId(e.id); setEditName(e.name); setEditPrice(e.price.toFixed(2)); }}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: e.id }, { onSuccess: invalidate })}><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. Extra Käse" className="h-8 text-sm rounded-none border-border bg-background text-white flex-1" />
        <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" step="0.01" className="h-8 text-sm rounded-none border-border bg-background text-white w-28" />
        <span className="text-muted-foreground text-sm">€</span>
        <Button size="sm" className="h-8 rounded-none bg-primary text-xs" onClick={() => {
          if (!newName.trim()) { toast({ title: "Name erforderlich", variant: "destructive" }); return; }
          create.mutate({ id: itemId, data: { name: newName.trim(), price: parseFloat(newPrice) || 0, sortOrder: extras?.length ?? 0 } }, { onSuccess: () => { invalidate(); setNewName(""); setNewPrice("0"); } });
        }} disabled={create.isPending}><Plus className="h-3 w-3 mr-1" />Hinzufügen</Button>
      </div>
    </div>
  );
}

// ── Recipe Editor ─────────────────────────────────────────────────────────────
function RecipeEditor({ itemId }: { itemId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const qKey = getGetItemRecipeQueryKey(itemId);
  const { data: recipe } = useGetItemRecipe(itemId, { query: { queryKey: qKey } });
  const { data: inventory } = useListInventory();
  const update = useUpdateItemRecipe();
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });
  const lines = recipe ?? [];
  const usedIds = new Set(lines.map((l) => l.stockItemId));
  const availableIngredients = (inventory ?? []).filter((i) => i.active && !usedIds.has(i.id));
  const selectedIngredient = (inventory ?? []).find((i) => String(i.id) === newIngredientId);

  const saveLines = (
    nextLines: { stockItemId: number; quantity: number }[],
    onDone?: () => void,
  ) => {
    update.mutate(
      { id: itemId, data: { lines: nextLines } },
      {
        onSuccess: () => { invalidate(); onDone?.(); },
        onError: () => toast({ title: "Fehler beim Speichern der Rezeptur", variant: "destructive" }),
      },
    );
  };

  const baseLines = () => lines.map((l) => ({ stockItemId: l.stockItemId, quantity: l.quantity }));

  const handleAdd = () => {
    const sid = parseInt(newIngredientId, 10);
    const q = parseFloat(newQuantity);
    if (!sid || isNaN(q) || q <= 0) {
      toast({ title: "Zutat und Menge (> 0) erforderlich", variant: "destructive" });
      return;
    }
    saveLines([...baseLines(), { stockItemId: sid, quantity: q }], () => {
      setNewIngredientId("");
      setNewQuantity("");
    });
  };

  const handleEditSave = (stockItemId: number) => {
    const q = parseFloat(editQuantity);
    if (isNaN(q) || q <= 0) { toast({ title: "Menge muss > 0 sein", variant: "destructive" }); return; }
    saveLines(
      baseLines().map((l) => (l.stockItemId === stockItemId ? { ...l, quantity: q } : l)),
      () => setEditId(null),
    );
  };

  const handleDelete = (stockItemId: number) => {
    saveLines(baseLines().filter((l) => l.stockItemId !== stockItemId));
  };

  return (
    <div className="space-y-2">
      {lines.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2">
          Noch keine Zutaten hinterlegt. Beim Verkauf wird dann nichts automatisch vom Lager abgezogen.
        </p>
      )}
      {lines.map((l) => (
        <div key={l.id} className="flex items-center gap-2 bg-secondary/30 border border-border p-2">
          {editId === l.id ? (
            <>
              <span className="text-white font-medium text-sm flex-1">{l.stockItemName ?? `#${l.stockItemId}`}</span>
              <Input value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} type="number" step="0.01" min="0" className="h-7 text-sm rounded-none border-border bg-background text-white w-24" />
              <span className="text-muted-foreground text-sm w-12">{l.unit ?? ""}</span>
              <Button size="sm" className="h-7 text-xs rounded-none bg-primary" onClick={() => handleEditSave(l.stockItemId)} disabled={update.isPending}>OK</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>✕</Button>
            </>
          ) : (
            <>
              <span className="text-white font-medium text-sm flex-1">{l.stockItemName ?? `#${l.stockItemId}`}</span>
              <span className="text-primary font-bold text-sm">{l.quantity} {l.unit ?? ""}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => { setEditId(l.id); setEditQuantity(String(l.quantity)); }}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(l.stockItemId)} disabled={update.isPending}><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Select value={newIngredientId} onValueChange={setNewIngredientId}>
          <SelectTrigger className="h-8 text-sm rounded-none border-border bg-background text-white flex-1">
            <SelectValue placeholder="Zutat auswählen…" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {availableIngredients.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Keine weiteren Zutaten verfügbar</div>
            )}
            {availableIngredients.map((i) => (
              <SelectItem key={i.id} value={String(i.id)}>
                {i.name}{i.category ? ` · ${i.category}` : ""} ({i.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} type="number" step="0.01" min="0" placeholder="Menge" className="h-8 text-sm rounded-none border-border bg-background text-white w-28" />
        <span className="text-muted-foreground text-sm w-12">{selectedIngredient?.unit ?? ""}</span>
        <Button size="sm" className="h-8 rounded-none bg-primary text-xs" onClick={handleAdd} disabled={update.isPending}><Plus className="h-3 w-3 mr-1" />Hinzufügen</Button>
      </div>
    </div>
  );
}

// ── Option Groups Tab ─────────────────────────────────────────────────────────
function OptionGroupsTab({ item }: { item: MenuItem }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ogKey = getListAdminOptionGroupsQueryKey();
  const { data: allGroups } = useListAdminOptionGroups({ query: { queryKey: ogKey } });
  const linkGroup = useLinkMenuItemToOptionGroup();
  const unlinkGroup = useUnlinkMenuItemFromOptionGroup();
  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminItemsQueryKey({}) });

  const linkedIds = new Set(
    allGroups?.flatMap((g) => (g.linkedItemIds ?? []).includes(item.id) ? [g.id] : []) ?? []
  );

  const handleLink = (groupId: number) => {
    linkGroup.mutate({ id: groupId, data: { menuItemId: item.id } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ogKey }); toast({ title: "Optionsgruppe verknüpft" }); },
      onError: () => toast({ title: "Fehler beim Verknüpfen", variant: "destructive" }),
    });
  };

  const handleUnlink = (groupId: number) => {
    unlinkGroup.mutate({ groupId, menuItemId: item.id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ogKey }); toast({ title: "Verknüpfung entfernt" }); },
      onError: () => toast({ title: "Fehler beim Entfernen", variant: "destructive" }),
    });
  };

  void invalidate;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Verknüpfe globale Optionsgruppen direkt mit diesem Artikel. Diese haben Vorrang vor Kategorie-Zuweisungen.
      </p>
      <div className="space-y-1.5">
        {allGroups?.map((g) => {
          const linked = linkedIds.has(g.id);
          return (
            <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div>
                <span className={`text-sm font-medium ${linked ? "text-white" : "text-muted-foreground"}`}>{g.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({g.inputType === "single" ? "Einzelauswahl" : "Mehrfachauswahl"} · {g.items.length} Optionen)
                </span>
              </div>
              {linked ? (
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-none border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleUnlink(g.id)} disabled={unlinkGroup.isPending}>
                  Entfernen
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-none border-border hover:border-primary"
                  onClick={() => handleLink(g.id)} disabled={linkGroup.isPending}>
                  Verknüpfen
                </Button>
              )}
            </div>
          );
        })}
        {(!allGroups || allGroups.length === 0) && (
          <p className="text-sm text-muted-foreground italic">Noch keine Optionsgruppen vorhanden. Erstelle zuerst eine unter "Optionsgruppen".</p>
        )}
      </div>
    </div>
  );
}

// ── Sortable Product Row ───────────────────────────────────────────────────────
function SortableProductRow({
  item, cats, expandedId, expandedTab, onToggleExpand, onSetExpandedTab,
  onEdit, onDelete, onToggleField,
}: {
  item: MenuItem;
  cats: Array<{ id: number; name: string }>;
  expandedId: number | null;
  expandedTab: string;
  onToggleExpand: (id: number) => void;
  onSetExpandedTab: (tab: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleField: (field: "available" | "featured" | "isNew" | "isRecommended") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const catName = cats.find((c) => c.id === item.categoryId)?.name;
  const isExpanded = expandedId === item.id;

  return (
    <>
      <tr ref={setNodeRef} style={style} className={`${isExpanded ? "bg-secondary/10" : "hover:bg-secondary/5"} transition-colors border-b border-border`}>
        {/* DnD handle */}
        <td className="px-2 py-3 w-8">
          <button {...attributes} {...listeners} className="text-muted-foreground/30 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
        {/* Expand */}
        <td className="px-2 py-3 w-8">
          <button onClick={() => onToggleExpand(item.id)} className="text-muted-foreground hover:text-white">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        {/* Image + Name */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-3">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-9 h-9 object-cover border border-border shrink-0" />
            ) : (
              <div className="w-9 h-9 bg-secondary/30 border border-border shrink-0" />
            )}
            <div>
              <p className="text-white font-medium text-sm">{item.name}</p>
              {item.description && <p className="text-muted-foreground text-xs truncate max-w-[220px]">{item.description}</p>}
            </div>
          </div>
        </td>
        {/* Category */}
        <td className="px-3 py-3 text-muted-foreground text-sm hidden md:table-cell">{catName ?? "—"}</td>
        {/* Price */}
        <td className="px-3 py-3 text-white font-medium text-sm">
          {(item.variants?.length ?? 0) > 0
            ? <span className="text-muted-foreground text-xs">ab {Math.min(...(item.variants ?? []).map((v) => v.price)).toFixed(2)} €</span>
            : <span>{item.price.toFixed(2)} €</span>}
        </td>
        {/* Flags */}
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            <ToggleBadge active={item.available} label="Aktiv" icon={null} onClick={() => onToggleField("available")}
              color="bg-green-500/15 border-green-500/40 text-green-400" />
            <ToggleBadge active={item.featured} label="Bestseller" icon={<Star className="h-2.5 w-2.5" />} onClick={() => onToggleField("featured")}
              color="bg-amber-500/15 border-amber-500/40 text-amber-400" />
            <ToggleBadge active={item.isNew} label="Neu" icon={<Sparkles className="h-2.5 w-2.5" />} onClick={() => onToggleField("isNew")}
              color="bg-blue-500/15 border-blue-500/40 text-blue-400" />
            <ToggleBadge active={item.isRecommended} label="Empfohlen" icon={<ThumbsUp className="h-2.5 w-2.5" />} onClick={() => onToggleField("isRecommended")}
              color="bg-purple-500/15 border-purple-500/40 text-purple-400" />
          </div>
        </td>
        {/* Actions */}
        <td className="px-3 py-3">
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded sub-tabs */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-secondary/10 border-b border-border px-6 py-4">
            <div className="flex gap-4 mb-4 border-b border-border">
              {(["variants", "extras", "options", "recipe"] as const).map((tab) => (
                <button key={tab} onClick={() => onSetExpandedTab(tab)}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${expandedTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"}`}
                >
                  {tab === "variants" ? "Größen / Varianten" : tab === "extras" ? "Extras / Zutaten" : tab === "options" ? "Optionsgruppen" : "Rezeptur"}
                </button>
              ))}
            </div>
            {expandedTab === "variants" && (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Wenn Größen definiert sind, wählt der Kunde eine Größe aus. Der Preis der Größe wird verwendet.</p>
                <VariantsEditor itemId={item.id} />
              </div>
            )}
            {expandedTab === "extras" && (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Extras werden dem Kunden als optionale Zusätze angezeigt.</p>
                <ExtrasEditor itemId={item.id} />
              </div>
            )}
            {expandedTab === "options" && <OptionGroupsTab item={item} />}
            {expandedTab === "recipe" && (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Lege fest, welche Zutaten pro Verkauf dieses Produkts vom Lager abgezogen werden. Die Mengen beziehen sich auf die Einheit der jeweiligen Zutat.</p>
                <RecipeEditor itemId={item.id} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [catFilter, setCatFilter] = useState<number | undefined>();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: number; form: FormState } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedTab, setExpandedTab] = useState<string>("variants");
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);

  const params = catFilter ? { categoryId: catFilter } : {};
  const itemsKey = getListAdminItemsQueryKey(params);
  const { data: items, isLoading } = useListAdminItems(params, { query: { queryKey: itemsKey } });
  const { data: cats } = useListAdminCategories({ query: { queryKey: getListAdminCategoriesQueryKey() } });
  const createItem = useCreateAdminMenuItem();
  const updateItem = useUpdateAdminMenuItem();
  const deleteItem = useDeleteAdminMenuItem();
  const sortItems = useBulkSortMenuItems();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: itemsKey });
    setLocalOrder(null);
  };

  const orderedItems = (() => {
    if (!items) return [];
    if (!localOrder) return items;
    const map = new Map(items.map((i) => [i.id, i]));
    return localOrder.map((id) => map.get(id)).filter(Boolean) as typeof items;
  })();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const currentIds = orderedItems.map((i) => i.id);
    const oldIdx = currentIds.indexOf(Number(active.id));
    const newIdx = currentIds.indexOf(Number(over.id));
    const newOrder = arrayMove(currentIds, oldIdx, newIdx);
    setLocalOrder(newOrder);
    sortItems.mutate({ data: { ids: newOrder } }, { onSuccess: invalidate });
  };

  const handleSave = () => {
    if (!dialog) return;
    const { name, description, price, categoryId, available, featured, isNew, isRecommended, imageUrl, sortOrder } = dialog.form;
    if (!name.trim() || !price || !categoryId) { toast({ title: "Name, Preis und Kategorie erforderlich", variant: "destructive" }); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) { toast({ title: "Ungültiger Preis", variant: "destructive" }); return; }
    const data = { name, description, price: priceNum, categoryId, available, featured, isNew, isRecommended, imageUrl: imageUrl || undefined, sortOrder };
    if (dialog.mode === "create") {
      createItem.mutate({ data }, { onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Artikel erstellt" }); }, onError: () => toast({ title: "Fehler", variant: "destructive" }) });
    } else {
      updateItem.mutate({ id: dialog.id!, data }, { onSuccess: () => { invalidate(); setDialog(null); toast({ title: "Artikel aktualisiert" }); }, onError: () => toast({ title: "Fehler", variant: "destructive" }) });
    }
  };

  const handleToggle = (item: MenuItem, field: "available" | "featured" | "isNew" | "isRecommended") => {
    updateItem.mutate({ id: item.id, data: { [field]: !item[field] } }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`„${name}" wirklich löschen?`)) return;
    deleteItem.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Artikel gelöscht" }); } });
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
    setExpandedTab("variants");
  };

  const catList = cats ?? [];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase text-white">Produkte</h1>
            <p className="text-xs text-muted-foreground mt-1">Drag & Drop zum Sortieren · Badge-Klick zum Umschalten</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={catFilter ?? ""} onChange={(e) => { setCatFilter(e.target.value ? Number(e.target.value) : undefined); setLocalOrder(null); }}
              className="bg-card border border-border text-white text-sm px-3 py-2 rounded-none focus:outline-none focus:border-primary">
              <option value="">Alle Kategorien</option>
              {catList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90 shrink-0"
              onClick={() => setDialog({ mode: "create", form: { ...EMPTY, categoryId: catFilter ?? (catList[0]?.id ?? 0), sortOrder: orderedItems.length } })}>
              <Plus className="h-4 w-4 mr-2" /> Neuer Artikel
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full inline-block" />Aktiv</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />Bestseller</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-blue-400" />Neu</span>
          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-purple-400" />Empfohlen</span>
          <span className="text-muted-foreground/60">— Klicke auf Badges zum Umschalten</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-card border border-border animate-pulse" />)}</div>
        ) : orderedItems.length === 0 ? (
          <div className="bg-card border border-border p-16 text-center">
            <p className="text-muted-foreground">Keine Artikel{catFilter ? " in dieser Kategorie" : ""} vorhanden.</p>
          </div>
        ) : (
          <div className="bg-card border border-border overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="border-b border-border bg-secondary/10">
                <tr className="text-left">
                  <th className="px-2 py-3 w-8" />
                  <th className="px-2 py-3 w-8" />
                  <th className="px-3 py-3 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-3 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Kategorie</th>
                  <th className="px-3 py-3 text-xs text-muted-foreground uppercase tracking-wider">Preis</th>
                  <th className="px-3 py-3 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={orderedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {orderedItems.map((item) => (
                      <SortableProductRow
                        key={item.id}
                        item={item}
                        cats={catList}
                        expandedId={expandedId}
                        expandedTab={expandedTab}
                        onToggleExpand={toggleExpand}
                        onSetExpandedTab={setExpandedTab}
                        onEdit={() => setDialog({
                          mode: "edit", id: item.id,
                          form: { name: item.name, description: item.description ?? "", price: item.price.toFixed(2), categoryId: item.categoryId, available: item.available, featured: item.featured, isNew: item.isNew, isRecommended: item.isRecommended, imageUrl: item.imageUrl ?? "", sortOrder: item.sortOrder },
                        })}
                        onDelete={() => handleDelete(item.id, item.name)}
                        onToggleField={(field) => handleToggle(item, field)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold uppercase text-white text-lg">
                {dialog.mode === "create" ? "Neuer Artikel" : "Artikel bearbeiten"}
              </h2>
              <button onClick={() => setDialog(null)}><X className="h-5 w-5 text-muted-foreground hover:text-white" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Name *</label>
                <Input value={dialog.form.name} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })} autoFocus />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Beschreibung</label>
                <Input value={dialog.form.description} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })} placeholder="Kurze Produktbeschreibung" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Preis (€) *</label>
                <Input type="number" step="0.01" value={dialog.form.price} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, price: e.target.value } })} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Kategorie *</label>
                <select value={dialog.form.categoryId} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, categoryId: Number(e.target.value) } })}
                  className="w-full h-9 rounded-none border border-border bg-background text-white text-sm px-2 focus:outline-none focus:border-primary">
                  <option value={0}>Bitte wählen</option>
                  {catList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bild-URL</label>
                <Input value={dialog.form.imageUrl} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, imageUrl: e.target.value } })} placeholder="https://example.com/bild.jpg" />
                {dialog.form.imageUrl && (
                  <div className="mt-2 h-24 border border-border overflow-hidden">
                    <img src={dialog.form.imageUrl} alt="Vorschau" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Reihenfolge</label>
                <Input type="number" value={dialog.form.sortOrder} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, sortOrder: Number(e.target.value) } })} />
              </div>
            </div>

            {/* Flags */}
            <div className="pt-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Markierungen</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { field: "available" as const, label: "Aktiv — im Shop bestellbar" },
                    { field: "featured" as const, label: "⭐ Bestseller" },
                    { field: "isNew" as const, label: "✨ Neu" },
                    { field: "isRecommended" as const, label: "👍 Empfohlen" },
                  ]
                ).map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <button type="button" onClick={() => setDialog({ ...dialog, form: { ...dialog.form, [field]: !dialog.form[field] } })}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${dialog.form[field] ? "bg-primary" : "bg-secondary"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dialog.form[field] ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className="text-sm text-white">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1 rounded-none uppercase font-bold bg-primary hover:bg-primary/90" onClick={handleSave} disabled={createItem.isPending || updateItem.isPending}>
                <Check className="h-4 w-4 mr-2" />{createItem.isPending || updateItem.isPending ? "Speichern…" : "Speichern"}
              </Button>
              <Button variant="outline" className="flex-1 rounded-none border-border" onClick={() => setDialog(null)}>
                <X className="h-4 w-4 mr-2" />Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
