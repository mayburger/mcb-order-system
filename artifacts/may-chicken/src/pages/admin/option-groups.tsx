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
import { Trash2, Plus, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Inline item editor ─────────────────────────────────────────────────────────
function OptionItemRow({
  item,
  group,
  onUpdated,
}: {
  item: OptionGroupItem;
  group: OptionGroup;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.defaultPrice));
  const updateItem = useUpdateAdminOptionItem();
  const deleteItem = useDeleteAdminOptionItem();

  const handleSave = () => {
    updateItem.mutate(
      { id: item.id, data: { name: name.trim(), defaultPrice: parseFloat(price) || 0 } },
      {
        onSuccess: () => { setEditing(false); onUpdated(); },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deleteItem.mutate(
      { id: item.id },
      {
        onSuccess: onUpdated,
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-sm rounded-none border-border bg-background text-white flex-1"
        />
        {group.priceType === "absolute" && (
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.01"
            className="h-7 text-sm rounded-none border-border bg-background text-white w-24"
            placeholder="Preis €"
          />
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-500" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5 group/item">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white">{item.name}</span>
        {group.priceType === "absolute" && (
          <span className="text-xs text-primary font-bold">{item.defaultPrice.toFixed(2)} €</span>
        )}
        {group.priceType === "additive" && item.priceByVariant && (
          <span className="text-xs text-muted-foreground">
            {Object.entries(item.priceByVariant).map(([k, v]) => `${k}: +${(v as number).toFixed(2)} €`).join(" / ")}
          </span>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Add option item form ───────────────────────────────────────────────────────
function AddItemForm({ groupId, priceType, onAdded }: { groupId: number; priceType: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const createItem = useCreateAdminOptionItem();

  const handleAdd = () => {
    if (!name.trim()) return;
    createItem.mutate(
      {
        id: groupId,
        data: {
          name: name.trim(),
          defaultPrice: parseFloat(price) || 0,
          available: true,
        },
      },
      {
        onSuccess: () => { setName(""); setPrice(""); onAdded(); },
        onError: () => toast({ title: "Fehler beim Hinzufügen", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-border">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name des Eintrags"
        className="h-8 text-sm rounded-none border-border bg-background text-white flex-1"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      {priceType === "absolute" && (
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          step="0.01"
          placeholder="Preis €"
          className="h-8 text-sm rounded-none border-border bg-background text-white w-24"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
      )}
      <Button size="sm" className="h-8 rounded-none bg-primary hover:bg-primary/90 shrink-0" onClick={handleAdd} disabled={!name.trim() || createItem.isPending}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Option group card ──────────────────────────────────────────────────────────
function OptionGroupCard({ group, onRefetch }: { group: OptionGroup; onRefetch: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [editName, setEditName] = useState(group.name);
  const [editingName, setEditingName] = useState(false);
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
    if (!confirm(`Optionsgruppe "${group.name}" wirklich löschen?`)) return;
    deleteGroup.mutate(
      { id: group.id },
      {
        onSuccess: onRefetch,
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-card border border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-white">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 rounded-none border-border bg-background text-white text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setEditingName(false)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white uppercase tracking-wide">{group.name}</h3>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => setEditingName(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            {group.inputType === "single" ? "Einzelauswahl" : "Mehrfachauswahl"}
          </Badge>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            {group.priceType === "absolute" ? "Absoluter Preis" : "Aufpreis"}
          </Badge>
          {group.required && (
            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Pflichtfeld</Badge>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {group.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Keine Einträge. Ersten Eintrag unten hinzufügen.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {group.items.map((item) => (
                <OptionItemRow key={item.id} item={item} group={group} onUpdated={onRefetch} />
              ))}
            </div>
          )}
          <AddItemForm groupId={group.id} priceType={group.priceType} onAdded={onRefetch} />
          {group.linkedCategoryIds && group.linkedCategoryIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Verknüpfte Kategorien: {group.linkedCategoryIds.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── New group dialog ───────────────────────────────────────────────────────────
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
          <DialogTitle className="text-xl font-display font-bold uppercase text-white">
            Neue Optionsgruppe
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Name</label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} className="rounded-none border-border bg-background text-white" placeholder="z.B. Pizza-Extras" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Slug</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-none border-border bg-background text-white font-mono text-sm" placeholder="z.B. pizza-extras" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Auswahltyp</label>
              <select value={inputType} onChange={(e) => setInputType(e.target.value as "single" | "multiple")} className="w-full h-9 rounded-none border border-border bg-background text-white text-sm px-2">
                <option value="single">Einzelauswahl</option>
                <option value="multiple">Mehrfachauswahl</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Preistyp</label>
              <select value={priceType} onChange={(e) => setPriceType(e.target.value as "absolute" | "additive")} className="w-full h-9 rounded-none border border-border bg-background text-white text-sm px-2">
                <option value="absolute">Absoluter Preis (z.B. Größe)</option>
                <option value="additive">Aufpreis (z.B. Extras)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-primary" />
            <label htmlFor="required" className="text-sm text-white cursor-pointer">Pflichtfeld (Auswahl erforderlich)</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-none border-border" onClick={onClose}>Abbrechen</Button>
            <Button className="flex-1 rounded-none bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={createGroup.isPending}>
              Erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OptionGroupsPage() {
  const { data: groups, isLoading, refetch } = useListAdminOptionGroups();
  const [showNew, setShowNew] = useState(false);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">
              Optionsgruppen
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Globale Optionen für Pizzagrößen, Extras, etc. — Änderungen gelten sofort für alle Artikel.
            </p>
          </div>
          <Button
            className="rounded-none bg-primary hover:bg-primary/90 uppercase tracking-wider font-bold"
            onClick={() => setShowNew(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Neue Gruppe
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Lädt…</div>
        ) : !groups || groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-border">
            Noch keine Optionsgruppen. Erstelle die erste Gruppe.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <OptionGroupCard key={group.id} group={group} onRefetch={() => refetch()} />
            ))}
          </div>
        )}

        <div className="bg-secondary/30 border border-border p-4 rounded">
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">So funktioniert das System</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong className="text-white">Absoluter Preis</strong>: Ersetzt den Grundpreis des Artikels (z.B. Pizzagrößen 29cm / 32cm)</li>
            <li>• <strong className="text-white">Aufpreis</strong>: Wird zum Grundpreis addiert (z.B. Extras). Bei Pizzas: preisvariabel je nach gewählter Größe (+0,70 € für 29cm / +0,90 € für 32cm)</li>
            <li>• Kategorien werden automatisch mit den Pizzagruppen verknüpft — alle Pizzen erhalten die Optionen</li>
            <li>• Änderungen hier wirken sofort auf alle verknüpften Artikel</li>
          </ul>
        </div>
      </div>

      <NewGroupDialog open={showNew} onClose={() => setShowNew(false)} onCreated={() => refetch()} />
    </AdminLayout>
  );
}
