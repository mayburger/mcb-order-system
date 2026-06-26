import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListMenuItems, useListMenuCategories } from "@workspace/api-client-react";
import { useCart, SelectedExtra } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Plus, Minus, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItem, ItemVariant, ItemExtra } from "@workspace/api-client-react";

interface ProductDialogProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}

function ProductDialog({ item, open, onClose }: ProductDialogProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const hasVariants = (item.variants?.length ?? 0) > 0;
  const hasExtras = (item.extras?.length ?? 0) > 0;

  const sortedVariants = [...(item.variants ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(
    sortedVariants[0]
  );
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [quantity, setQuantity] = useState(1);

  const toggleExtra = (extra: ItemExtra) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((e) => e.name === extra.name);
      if (exists) return prev.filter((e) => e.name !== extra.name);
      return [...prev, { name: extra.name, price: extra.price }];
    });
  };

  const basePrice = selectedVariant ? selectedVariant.price : item.price;
  const extrasTotal = selectedExtras.reduce((s, e) => s + e.price, 0);
  const unitPrice = basePrice + extrasTotal;

  const handleAdd = () => {
    addItem(item, quantity, selectedVariant, selectedExtras);
    toast({
      title: "Zum Warenkorb hinzugefügt",
      description: `${item.name}${selectedVariant ? ` (${selectedVariant.name})` : ""} wurde hinzugefügt.`,
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

          {/* Größenauswahl */}
          {hasVariants && (
            <div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">
                Größe auswählen *
              </h3>
              <div className="space-y-2">
                {sortedVariants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`w-full flex items-center justify-between p-3 border transition-colors ${
                      selectedVariant?.id === v.id
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-muted-foreground hover:border-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedVariant?.id === v.id ? "border-primary" : "border-muted-foreground"}`}>
                        {selectedVariant?.id === v.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="font-semibold">{v.name}</span>
                    </div>
                    <span className="font-bold text-primary">{v.price.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extras */}
          {hasExtras && (
            <div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">
                Extras (optional)
              </h3>
              <div className="space-y-2">
                {(item.extras ?? [])
                  .filter((e) => e.available)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((extra) => {
                    const selected = selectedExtras.some((e) => e.name === extra.name);
                    return (
                      <button
                        key={extra.id}
                        onClick={() => toggleExtra(extra)}
                        className={`w-full flex items-center justify-between p-3 border transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-white"
                            : "border-border text-muted-foreground hover:border-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 border-2 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="font-semibold">{extra.name}</span>
                        </div>
                        {extra.price > 0 && (
                          <span className="font-bold text-primary">+{extra.price.toFixed(2)} €</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

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
              className="flex-1 h-12 rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90 text-white"
              onClick={handleAdd}
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
    const hasVariants = (item.variants?.length ?? 0) > 0;
    const hasExtras = (item.extras?.length ?? 0) > 0;
    if (hasVariants || hasExtras) {
      setDialogItem(item);
    } else {
      addItem(item, 1, undefined, []);
      toast({
        title: "Zum Warenkorb hinzugefügt",
        description: `${item.name} wurde zum Warenkorb hinzugefügt.`,
      });
    }
  };

  const fallbackImages: Record<string, string> = {
    "Burger": "/hero-burger.png",
    "Pizza": "/pizza.png",
    "Hähnchen": "/chicken-sandwich.png",
    "Beilagen": "/fries.png",
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
                      const hasVariants = (item.variants?.length ?? 0) > 0;
                      const sortedVariants = [...(item.variants ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
                      const displayPrice = hasVariants ? sortedVariants[0]?.price ?? item.price : item.price;

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
                            {hasVariants && (
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
                                {hasVariants ? (
                                  <div>
                                    <span className="text-xs text-muted-foreground block">ab</span>
                                    <span className="text-primary font-bold">{displayPrice.toFixed(2)} €</span>
                                  </div>
                                ) : (
                                  <span className="text-primary font-bold">{item.price.toFixed(2)} €</span>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-muted-foreground text-sm flex-1 mb-6">{item.description}</p>
                            )}
                            {hasVariants && (
                              <div className="flex gap-2 mb-4 flex-wrap">
                                {sortedVariants.map((v) => (
                                  <span key={v.id} className="text-xs border border-border px-2 py-1 text-muted-foreground">
                                    {v.name}: {v.price.toFixed(2)} €
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
                                  {hasVariants ? "Auswählen" : "Hinzufügen"}
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

      {/* Produkt-Dialog mit Größenwahl */}
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
