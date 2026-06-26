import { useState } from "react";
import { useCart, SelectedOption, computeUnitPrice } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Plus, Minus, Check } from "lucide-react";
import { MenuItem, OptionGroup, OptionGroupItem } from "@workspace/api-client-react";

interface ProductDialogProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}

export function ProductDialog({ item, open, onClose }: ProductDialogProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const optionGroups: OptionGroup[] = item.optionGroups ?? [];

  const [selections, setSelections] = useState<Map<number, number[]>>(() => {
    const map = new Map<number, number[]>();
    for (const group of optionGroups) {
      if (group.inputType === "single" && group.items.length > 0) {
        map.set(group.id, [group.items[0].id]);
      } else {
        map.set(group.id, []);
      }
    }
    return map;
  });
  const [quantity, setQuantity] = useState(1);

  const toggleOption = (group: OptionGroup, optItem: OptionGroupItem) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(group.id) ?? [];
      if (group.inputType === "single") {
        next.set(group.id, [optItem.id]);
      } else {
        if (current.includes(optItem.id)) {
          next.set(group.id, current.filter((id) => id !== optItem.id));
        } else {
          next.set(group.id, [...current, optItem.id]);
        }
      }
      return next;
    });
  };

  function buildSelectedOptions(): SelectedOption[] {
    const result: SelectedOption[] = [];
    for (const group of optionGroups) {
      const selectedIds = selections.get(group.id) ?? [];
      for (const id of selectedIds) {
        const optItem = group.items.find((i) => i.id === id);
        if (!optItem) continue;
        let price = optItem.defaultPrice;
        if (group.priceType === "additive" && optItem.priceByVariant) {
          const sizeGroup = optionGroups.find((g) => g.priceType === "absolute");
          if (sizeGroup) {
            const sizeIds = selections.get(sizeGroup.id) ?? [];
            const sizeItem = sizeGroup.items.find((i) => i.id === sizeIds[0]);
            if (sizeItem && optItem.priceByVariant[sizeItem.name] !== undefined) {
              price = optItem.priceByVariant[sizeItem.name];
            }
          }
        }
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionItemId: optItem.id,
          optionItemName: optItem.name,
          price,
          inputType: group.inputType as "single" | "multiple",
          priceType: group.priceType as "absolute" | "additive",
        });
      }
    }
    return result;
  }

  function isValid(): boolean {
    return optionGroups
      .filter((g) => g.required)
      .every((g) => (selections.get(g.id) ?? []).length > 0);
  }

  const currentOptions = buildSelectedOptions();
  const unitPrice = computeUnitPrice(item, currentOptions);

  const handleAdd = () => {
    if (!isValid()) return;
    addItem(item, quantity, currentOptions);
    toast({ title: "Zum Warenkorb hinzugefügt", description: `${item.name} wurde hinzugefügt.` });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-white max-w-md w-[calc(100vw-2rem)] rounded-none p-0 overflow-hidden flex flex-col max-h-[90dvh]">
        {item.imageUrl && (
          <div className="aspect-video overflow-hidden shrink-0">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 md:p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-display font-bold uppercase text-white text-left">
              {item.name}
            </DialogTitle>
            {item.description && (
              <p className="text-muted-foreground text-sm text-left">{item.description}</p>
            )}
          </DialogHeader>

          {/* Option Groups */}
          {optionGroups.map((group) => {
            const selectedIds = selections.get(group.id) ?? [];
            const isMultiple = group.inputType === "multiple";

            const getSizeOptItem = () => {
              const sizeGroup = optionGroups.find((g) => g.priceType === "absolute");
              if (!sizeGroup) return undefined;
              const sizeIds = selections.get(sizeGroup.id) ?? [];
              return sizeGroup.items.find((i) => i.id === sizeIds[0]);
            };

            return (
              <div key={group.id}>
                <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                  {group.name}
                  {group.required && <span className="text-primary ml-1">*</span>}
                  {isMultiple && (
                    <span className="ml-2 text-muted-foreground font-normal">(optional)</span>
                  )}
                </h3>
                <div className="space-y-1.5">
                  {group.items.map((optItem) => {
                    const selected = selectedIds.includes(optItem.id);
                    let displayPrice = optItem.defaultPrice;
                    if (group.priceType === "additive" && optItem.priceByVariant) {
                      const sizeItem = getSizeOptItem();
                      if (sizeItem && optItem.priceByVariant[sizeItem.name] !== undefined) {
                        displayPrice = optItem.priceByVariant[sizeItem.name];
                      }
                    }

                    return (
                      <button
                        key={optItem.id}
                        onClick={() => toggleOption(group, optItem)}
                        className={`w-full flex items-center justify-between p-3 border transition-colors text-left ${
                          selected
                            ? "border-primary bg-primary/10 text-white"
                            : "border-border text-muted-foreground hover:border-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isMultiple ? (
                            <div
                              className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 ${
                                selected ? "border-primary bg-primary" : "border-muted-foreground"
                              }`}
                            >
                              {selected && <Check className="h-3 w-3 text-white" />}
                            </div>
                          ) : (
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selected ? "border-primary" : "border-muted-foreground"
                              }`}
                            >
                              {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                          )}
                          <span className="font-semibold text-sm truncate">{optItem.name}</span>
                        </div>
                        <span className="font-bold text-primary shrink-0 ml-2 text-sm">
                          {group.priceType === "absolute"
                            ? `${displayPrice.toFixed(2)} €`
                            : displayPrice > 0
                            ? `+${displayPrice.toFixed(2)} €`
                            : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border p-4 md:p-5 flex items-center gap-3 bg-card">
          <div className="flex items-center border border-border">
            <button
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-bold text-white">{quantity}</span>
            <button
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="flex-1 h-11 rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90 text-white disabled:opacity-50 text-sm"
            onClick={handleAdd}
            disabled={!isValid()}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {(unitPrice * quantity).toFixed(2)} € hinzufügen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
