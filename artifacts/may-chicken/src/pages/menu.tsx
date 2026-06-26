import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListMenuItems, useListMenuCategories } from "@workspace/api-client-react";
import { useCart, SelectedOption, computeUnitPrice } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Plus, Minus, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItem, OptionGroup, OptionGroupItem } from "@workspace/api-client-react";

interface ProductDialogProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}

function ProductDialog({ item, open, onClose }: ProductDialogProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const optionGroups: OptionGroup[] = item.optionGroups ?? [];
  const hasOptions = optionGroups.length > 0;

  // Initialize selections: for each group, track selected option item IDs
  const [selections, setSelections] = useState<Map<number, number[]>>(() => {
    const map = new Map<number, number[]>();
    for (const group of optionGroups) {
      if (group.inputType === "single" && group.items.length > 0) {
        // Pre-select first option for required single-select groups
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

  // Build SelectedOption[] from current selections
  function buildSelectedOptions(): SelectedOption[] {
    const result: SelectedOption[] = [];
    for (const group of optionGroups) {
      const selectedIds = selections.get(group.id) ?? [];
      for (const id of selectedIds) {
        const optItem = group.items.find((i) => i.id === id);
        if (!optItem) continue;
        // For additive groups, resolve price from priceByVariant if available
        let price = optItem.defaultPrice;
        if (group.priceType === "additive" && optItem.priceByVariant) {
          // Find the selected size name for the "absolute" group
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

  // Validation: all required groups must have a selection
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
    toast({
      title: "Zum Warenkorb hinzugefügt",
      description: `${item.name} wurde hinzugefügt.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-white max-w-md rounded-none p-0 overflow-hidden">
        {item.imageUrl && (
          <div className="aspect-video overflow-hidden">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold uppercase text-white text-left">
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

            // For additive groups: resolve prices based on selected size
            const getSizeOptItem = () => {
              const sizeGroup = optionGroups.find((g) => g.priceType === "absolute");
              if (!sizeGroup) return undefined;
              const sizeIds = selections.get(sizeGroup.id) ?? [];
              return sizeGroup.items.find((i) => i.id === sizeIds[0]);
            };

            return (
              <div key={group.id}>
                <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">
                  {group.name}
                  {group.required && <span className="text-primary ml-1">*</span>}
                  {isMultiple && (
                    <span className="ml-2 text-muted-foreground font-normal">(optional)</span>
                  )}
                </h3>
                <div className="space-y-2">
                  {group.items.map((optItem) => {
                    const selected = selectedIds.includes(optItem.id);
                    // Resolve display price
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
                        className={`w-full flex items-center justify-between p-3 border transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-white"
                            : "border-border text-muted-foreground hover:border-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
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
                          <span className="font-semibold text-left">{optItem.name}</span>
                        </div>
                        <span className="font-bold text-primary shrink-0 ml-2">
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

          {/* Menge + Hinzufügen */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-border">
              <button
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold text-white">{quantity}</span>
              <button
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              className="flex-1 h-12 rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
              onClick={handleAdd}
              disabled={!isValid()}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {(unitPrice * quantity).toFixed(2)} € hinzufügen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MenuPage() {
  const { data: categories, isLoading: categoriesLoading } = useListMenuCategories();
  const { data: items, isLoading: itemsLoading } = useListMenuItems();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null);

  const handleCardClick = (item: MenuItem) => {
    const hasOptions = (item.optionGroups?.length ?? 0) > 0;
    if (hasOptions) {
      setDialogItem(item);
    } else {
      addItem(item, 1, []);
      toast({
        title: "Zum Warenkorb hinzugefügt",
        description: `${item.name} wurde zum Warenkorb hinzugefügt.`,
      });
    }
  };

  const fallbackImages: Record<string, string> = {
    Burger: "/hero-burger.png",
    Pizza: "/pizza.png",
    Hähnchen: "/chicken-sandwich.png",
    Beilagen: "/fries.png",
  };

  if (categoriesLoading || itemsLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-16 w-48 mb-8" />
          <Skeleton className="h-12 w-full max-w-2xl mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-card py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-display font-bold uppercase tracking-tight text-white">
            Unsere Speisekarte
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue={categories?.[0]?.slug} className="w-full">
          <div className="overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 flex space-x-8">
              {categories?.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.slug}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-0 py-4 text-lg uppercase font-bold tracking-wider text-muted-foreground hover:text-white whitespace-nowrap"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories?.map((cat) => {
            const categoryItems = items?.filter((item) => item.categoryId === cat.id) ?? [];
            const fallbackImg = fallbackImages[cat.name] ?? "/hero-burger.png";

            return (
              <TabsContent key={cat.id} value={cat.slug} className="mt-0 outline-none">
                {cat.description && (
                  <p className="text-muted-foreground mb-6 text-sm">{cat.description}</p>
                )}
                {categoryItems.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    Keine Artikel in dieser Kategorie.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categoryItems.map((item) => {
                      const hasOptions = (item.optionGroups?.length ?? 0) > 0;
                      // Find the absolute price group (e.g. pizza size) to show price range
                      const absoluteGroup = item.optionGroups?.find(
                        (g) => g.priceType === "absolute",
                      );
                      const minPrice = absoluteGroup
                        ? Math.min(...absoluteGroup.items.map((i) => i.defaultPrice))
                        : item.price;

                      return (
                        <div
                          key={item.id}
                          className="group bg-card border border-border overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
                        >
                          <div className="aspect-[4/3] relative overflow-hidden bg-secondary">
                            <img
                              src={item.imageUrl || fallbackImg}
                              alt={item.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            />
                            {absoluteGroup && (
                              <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold uppercase px-2 py-1 tracking-wider">
                                Größe wählbar
                              </div>
                            )}
                          </div>
                          <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-xl font-display font-bold uppercase text-white pr-4">
                                {item.name}
                              </h3>
                              <div className="text-right shrink-0">
                                {absoluteGroup ? (
                                  <div>
                                    <span className="text-xs text-muted-foreground block">ab</span>
                                    <span className="text-primary font-bold">
                                      {minPrice.toFixed(2)} €
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-primary font-bold">
                                    {item.price.toFixed(2)} €
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-muted-foreground text-sm flex-1 mb-6">
                                {item.description}
                              </p>
                            )}
                            {absoluteGroup && (
                              <div className="flex gap-2 mb-4 flex-wrap">
                                {absoluteGroup.items.map((v) => (
                                  <span
                                    key={v.id}
                                    className="text-xs border border-border px-2 py-1 text-muted-foreground"
                                  >
                                    {v.name}: {v.defaultPrice.toFixed(2)} €
                                  </span>
                                ))}
                              </div>
                            )}
                            <Button
                              variant="default"
                              className="w-full uppercase tracking-wider font-bold rounded-none bg-white text-black hover:bg-primary hover:text-white transition-colors"
                              onClick={() => handleCardClick(item)}
                              disabled={!item.available}
                            >
                              {item.available ? (
                                <>
                                  <ShoppingBag className="mr-2 h-4 w-4" />
                                  {hasOptions ? "Auswählen" : "Hinzufügen"}
                                </>
                              ) : (
                                "Ausverkauft"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {dialogItem && (
        <ProductDialog
          item={dialogItem}
          open={!!dialogItem}
          onClose={() => setDialogItem(null)}
        />
      )}
    </Layout>
  );
}
