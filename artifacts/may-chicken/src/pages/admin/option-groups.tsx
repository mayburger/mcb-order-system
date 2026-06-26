import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListAdminOptionGroups,
  useCreateAdminOptionGroup,
  useUpdateAdminOptionGroup,
  useDeleteAdminOptionGroup,
  useCreateAdminOptionItem,
  useUpdateAdminOptionItem,
  useDeleteAdminOptionItem,
  useLinkCategoryToOptionGroup,
  useListAdminCategories,
  OptionGroup,
  OptionGroupItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, Plus, ChevronDown, ChevronUp, Pencil,
  Check, X, ArrowUp, ArrowDown, Link, GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getVariantKeys(group: OptionGroup): string[] {
  for (const item of group.items) {
    if (item.priceByVariant && Object.keys(item.priceByVariant).length > 0) {
      return Object.keys(item.priceByVariant);
    }
  }
  return [];
}

function hasVariantPricing(group: OptionGroup): boolean {
  return group.priceType === "additive" && getVariantKeys(group).length > 0;
}

// ── Einzelne Option-Zeile ──────────────────────────────────────────────────────
function OptionItemRow({
  item,
  group,
  index,
  totalItems,
  onUpdated,
}: {
  item: OptionGroupItem;
  group: OptionGroup;
  index: number;
  totalItems: number;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.defaultPrice));
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>(() => {
    if (item.priceByVariant) {
      return Object.fromEntries(
        Object.entries(item.priceByVariant).map(([k, v]) => [k, String(v)])
      );
    }
    return {};
  });

  const updateItem = useUpdateAdminOptionItem();
  const deleteItem = useDeleteAdminOptionItem();
  const variantKeys = getVariantKeys(group);
  const useVariants = hasVariantPricing(group);

  const handleSave = () => {
    const parsed: Record<string, number> = {};
    let defaultP = parseFloat(price) || 0;

    if (useVariants) {
      for (const k of variantKeys) {
        parsed[k] = parseFloat(variantPrices[k] ?? "0") || 0;
      }
      // defaultPrice = smallest variant price
      defaultP = Math.min(...Object.values(parsed));
    }

    updateItem.mutate(
      {
        id: item.id,
        data: {
          name: name.trim(),
          defaultPrice: defaultP,
          ...(useVariants ? { priceByVariant: parsed } : {}),
        },
      },
      {
        onSuccess: () => { setEditing(false); onUpdated(); },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm(`"${item.name}" wirklich löschen?`)) return;
    deleteItem.mutate(
      { id: item.id },
      {
        onSuccess: onUpdated,
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  const handleMove = (direction: "up" | "down") => {
    const sibling = group.items[direction === "up" ? index - 1 : index + 1];
    if (!sibling) return;

    // Swap sortOrders
    const thisNewOrder = sibling.sortOrder;
    const siblingNewOrder = item.sortOrder === sibling.sortOrder
      ? item.sortOrder + (direction === "up" ? -1 : 1)
      : item.sortOrder;

    Promise.all([
      updateItem.mutateAsync({ id: item.id, data: { sortOrder: thisNewOrder } }),
      updateItem.mutateAsync({ id: sibling.id, data: { sortOrder: siblingNewOrder } }),
    ])
      .then(onUpdated)
      .catch(() => toast({ title: "Fehler beim Verschieben", variant: "destructive" }));
  };

  if (editing) {
    return (
      <div className="py-2 space-y-2 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm rounded-none border-border bg-background text-white flex-1"
            placeholder="Name"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500" onClick={handleSave} disabled={updateItem.isPending}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {useVariants ? (
          <div className="flex flex-wrap gap-2 pl-1">
            {variantKeys.map((k) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground w-14">{k}:</span>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">+</span>
                  <Input
                    value={variantPrices[k] ?? ""}
                    onChange={(e) => setVariantPrices((p) => ({ ...p, [k]: e.target.value }))}
                    type="number" step="0.01" min="0"
                    className="h-7 w-20 text-sm rounded-none border-border bg-background text-white"
                    placeholder="0.00"
                  />
                  <span className="text-xs text-muted-foreground ml-1">€</span>
                </div>
              </div>
            ))}
          </div>
        ) : group.priceType === "absolute" ? (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs text-muted-foreground">Preis:</span>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number" step="0.01"
              className="h-7 w-24 text-sm rounded-none border-border bg-background text-white"
              placeholder="0.00"
            />
            <span className="text-xs text-muted-foreground">€</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 group/item">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => handleMove("up")}
            disabled={index === 0 || updateItem.isPending}
            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleMove("down")}
            disabled={index === totalItems - 1 || updateItem.isPending}
            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>

        <span className="text-sm text-muted-foreground shrink-0 w-5 text-right">{index + 1}.</span>

        <span className="text-sm text-white truncate">{item.name}</span>

        {/* Preis-Badge */}
        {group.priceType === "absolute" && (
          <span className="text-xs text-primary font-bold shrink-0">{item.defaultPrice.toFixed(2)} €</span>
        )}
        {useVariants && item.priceByVariant && (
          <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
            {Object.entries(item.priceByVariant).map(([k, v]) => `${k}: +${(v as number).toFixed(2)} €`).join(" · ")}
          </span>
        )}
        {group.priceType === "additive" && !useVariants && item.defaultPrice > 0 && (
          <span className="text-xs text-primary font-bold shrink-0">+{item.defaultPrice.toFixed(2)} €</span>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Option-Item hinzufügen ─────────────────────────────────────────────────────
function AddItemForm({ groupId, group, onAdded }: { groupId: number; group: OptionGroup; onAdded: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});
  const createItem = useCreateAdminOptionItem();
  const variantKeys = getVariantKeys(group);
  const useVariants = hasVariantPricing(group);

  // For new additive groups without items yet: default variant keys
  const effectiveKeys = useVariants ? variantKeys : (group.priceType === "additive" && variantKeys.length === 0 ? [] : []);

  const handleAdd = () => {
    if (!name.trim()) return;

    let defaultP = parseFloat(price) || 0;
    let pbv: Record<string, number> | undefined;

    if (useVariants) {
      pbv = {};
      for (const k of variantKeys) {
        pbv[k] = parseFloat(variantPrices[k] ?? "0") || 0;
      }
      defaultP = Math.min(...Object.values(pbv));
    }

    createItem.mutate(
      {
        id: groupId,
        data: {
          name: name.trim(),
          defaultPrice: defaultP,
          available: true,
          ...(pbv ? { priceByVariant: pbv } : {}),
        },
      },
      {
        onSuccess: () => {
          setName(""); setPrice(""); setVariantPrices({});
          onAdded();
        },
        onError: () => toast({ title: "Fehler beim Hinzufügen", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name der neuen Option"
          className="h-8 text-sm rounded-none border-border bg-background text-white flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        {!useVariants && group.priceType !== "additive" && group.priceType === "absolute" && (
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number" step="0.01"
            placeholder="Preis €"
            className="h-8 text-sm rounded-none border-border bg-background text-white w-24"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        )}
        {!useVariants && group.priceType === "additive" && variantKeys.length === 0 && (
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number" step="0.01"
            placeholder="+Preis €"
            className="h-8 text-sm rounded-none border-border bg-background text-white w-24"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        )}
        <Button
          size="sm"
          className="h-8 rounded-none bg-primary hover:bg-primary/90 shrink-0"
          onClick={handleAdd}
          disabled={!name.trim() || createItem.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {useVariants && (
        <div className="flex flex-wrap gap-3 pl-1">
          {variantKeys.map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{k} Aufpreis:</span>
              <Input
                value={variantPrices[k] ?? ""}
                onChange={(e) => setVariantPrices((p) => ({ ...p, [k]: e.target.value }))}
                type="number" step="0.01" min="0"
                placeholder="0.00"
                className="h-7 w-20 text-sm rounded-none border-border bg-background text-white"
              />
              <span className="text-xs text-muted-foreground">€</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kategorie-Verknüpfungs-Dialog ─────────────────────────────────────────────
function LinkCategoryDialog({
  group,
  open,
  onClose,
  onLinked,
}: {
  group: OptionGroup;
  open: boolean;
  onClose: () => void;
  onLinked: () => void;
}) {
  const { toast } = useToast();
  const { data: categories } = useListAdminCategories();
  const linkCategory = useLinkCategoryToOptionGroup();

  const linkedIds = new Set(group.linkedCategoryIds ?? []);

  const handleLink = (catId: number) => {
    linkCategory.mutate(
      { id: group.id, data: { categoryId: catId } },
      {
        onSuccess: () => { onLinked(); },
        onError: () => toast({ title: "Fehler beim Verknüpfen", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-white max-w-sm rounded-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold uppercase">Kategorie verknüpfen</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mt-1">
          Alle Artikel der gewählten Kategorie erhalten automatisch diese Optionsgruppe.
        </p>
        <div className="space-y-2 mt-3">
          {categories?.map((cat) => {
            const linked = linkedIds.has(cat.id);
            return (
              <div key={cat.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className={`text-sm ${linked ? "text-white font-semibold" : "text-muted-foreground"}`}>{cat.name}</span>
                {linked ? (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Verknüpft</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-none" onClick={() => handleLink(cat.id)} disabled={linkCategory.isPending}>
                    Verknüpfen
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Optionsgruppen-Karte ───────────────────────────────────────────────────────
function OptionGroupCard({
  group,
  categories,
  onRefetch,
}: {
  group: OptionGroup;
  categories: Array<{ id: number; name: string }>;
  onRefetch: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [editName, setEditName] = useState(group.name);
  const [editingName, setEditingName] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const updateGroup = useUpdateAdminOptionGroup();
  const deleteGroup = useDeleteAdminOptionGroup();

  const handleSaveName = () => {
    updateGroup.mutate(
      { id: group.id, data: { name: editName.trim() } },
      {
        onSuccess: () => { setEditingName(false); onRefetch(); },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm(`Optionsgruppe "${group.name}" wirklich löschen? Alle verknüpften Optionen werden entfernt.`)) return;
    deleteGroup.mutate(
      { id: group.id },
      {
        onSuccess: onRefetch,
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  const linkedCategoryNames = (group.linkedCategoryIds ?? [])
    .map((id) => categories.find((c) => c.id === id)?.name ?? `#${id}`)
    .join(", ");

  return (
    <div className="bg-card border border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-white shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 rounded-none border-border bg-background text-white text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 shrink-0" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground shrink-0" onClick={() => setEditingName(false)}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-bold text-white uppercase tracking-wide truncate">{group.name}</h3>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-white shrink-0" onClick={() => setEditingName(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Badge variant="outline" className="text-xs border-border text-muted-foreground hidden sm:flex">
            {group.inputType === "single" ? "Einzelwahl" : "Mehrfachwahl"}
          </Badge>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground hidden sm:flex">
            {group.priceType === "absolute" ? "Festpreis" : "Aufpreis"}
          </Badge>
          {group.required && (
            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Pflicht</Badge>
          )}
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-white"
            onClick={() => setShowLinkDialog(true)}
            title="Mit Kategorie verknüpfen"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Linked categories bar */}
      {linkedCategoryNames && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Gilt für:</span>
          <span className="text-xs text-primary font-semibold">{linkedCategoryNames}</span>
        </div>
      )}

      {/* Items */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              {group.items.length} Option{group.items.length !== 1 ? "en" : ""}
            </span>
            {hasVariantPricing(group) && (
              <span className="text-xs text-muted-foreground">
                Aufpreis je Größe: {getVariantKeys(group).join(" / ")}
              </span>
            )}
          </div>

          {group.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">Noch keine Optionen. Erste Option unten hinzufügen.</p>
          ) : (
            <div>
              {group.items.map((item, index) => (
                <OptionItemRow
                  key={item.id}
                  item={item}
                  group={group}
                  index={index}
                  totalItems={group.items.length}
                  onUpdated={onRefetch}
                />
              ))}
            </div>
          )}

          <AddItemForm groupId={group.id} group={group} onAdded={onRefetch} />
        </div>
      )}

      <LinkCategoryDialog
        group={group}
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onLinked={() => { setShowLinkDialog(false); onRefetch(); }}
      />
    </div>
  );
}

// ── Dialog: Neue Optionsgruppe erstellen ──────────────────────────────────────
function NewGroupDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inputType, setInputType] = useState<"single" | "multiple">("single");
  const [priceType, setPriceType] = useState<"absolute" | "additive">("additive");
  const [required, setRequired] = useState(false);
  const createGroup = useCreateAdminOptionGroup();

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: "Name und Slug erforderlich", variant: "destructive" });
      return;
    }
    createGroup.mutate(
      { data: { name: name.trim(), slug: slug.trim(), inputType, priceType, required } },
      {
        onSuccess: () => {
          setName(""); setSlug(""); setInputType("single"); setPriceType("additive"); setRequired(false);
          onCreated(); onClose();
        },
        onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-white max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold uppercase text-white">Neue Optionsgruppe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/[^a-z0-9-]/g, ""));
              }}
              className="rounded-none border-border bg-background text-white"
              placeholder="z.B. Beilagen-Extras"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Slug (technisch)</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-none border-border bg-background text-white font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Auswahltyp</label>
              <select value={inputType} onChange={(e) => setInputType(e.target.value as "single" | "multiple")} className="w-full h-9 rounded-none border border-border bg-background text-white text-sm px-2">
                <option value="single">Einzelauswahl (Radio)</option>
                <option value="multiple">Mehrfachauswahl (Checkbox)</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Preistyp</label>
              <select value={priceType} onChange={(e) => setPriceType(e.target.value as "absolute" | "additive")} className="w-full h-9 rounded-none border border-border bg-background text-white text-sm px-2">
                <option value="absolute">Festpreis (z.B. Größe)</option>
                <option value="additive">Aufpreis (z.B. Extras)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-primary" />
            <label htmlFor="required" className="text-sm text-white cursor-pointer">Pflichtfeld — Kunde muss auswählen</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-none border-border" onClick={onClose}>Abbrechen</Button>
            <Button className="flex-1 rounded-none bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={createGroup.isPending}>
              {createGroup.isPending ? "Erstelle…" : "Erstellen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function OptionGroupsPage() {
  const { data: groups, isLoading, refetch } = useListAdminOptionGroups();
  const { data: categories } = useListAdminCategories();
  const [showNew, setShowNew] = useState(false);

  const cats = categories?.map((c) => ({ id: c.id, name: c.name })) ?? [];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">Optionsgruppen</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Globale Optionen — Änderungen gelten sofort für alle verknüpften Kategorien.
            </p>
          </div>
          <Button className="rounded-none bg-primary hover:bg-primary/90 uppercase tracking-wider font-bold" onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Gruppe
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-card border border-border animate-pulse" />)}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-border">
            <GripVertical className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Noch keine Optionsgruppen. Erstelle die erste Gruppe.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <OptionGroupCard key={group.id} group={group} categories={cats} onRefetch={() => refetch()} />
            ))}
          </div>
        )}

        {/* Legende */}
        <div className="bg-secondary/20 border border-border p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-white text-xs uppercase tracking-widest mb-2">Wie funktioniert das System?</p>
          <p>• <strong className="text-white">Festpreis</strong>: Ersetzt den Artikelpreis vollständig (Pizzagrößen 29cm / 32cm)</p>
          <p>• <strong className="text-white">Aufpreis</strong>: Wird zum Artikelpreis addiert. Bei Pizzas je nach Größe (+0,70 € / +0,90 €)</p>
          <p>• <strong className="text-white">Kategorie verknüpfen</strong> (🔗): Alle Artikel dieser Kategorie erhalten die Optionen automatisch</p>
          <p>• <strong className="text-white">Reihenfolge</strong>: Pfeile ↑↓ in jeder Zeile zum Verschieben</p>
        </div>
      </div>

      <NewGroupDialog open={showNew} onClose={() => setShowNew(false)} onCreated={() => refetch()} />
    </AdminLayout>
  );
}
