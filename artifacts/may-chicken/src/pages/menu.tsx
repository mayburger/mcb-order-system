import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListMenuItems, useListMenuCategories } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItem } from "@workspace/api-client-react";
import { ProductDialog } from "@/components/product-dialog";

export default function MenuPage() {
  const { data: categories, isLoading: categoriesLoading } = useListMenuCategories();
  const { data: items, isLoading: itemsLoading } = useListMenuItems();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const activeCategory = activeTab ?? categories?.[0]?.slug ?? null;

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
        <div className="container mx-auto px-4 py-10">
          <Skeleton className="h-12 w-48 mb-6" />
          <Skeleton className="h-10 w-full max-w-xl mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Page header */}
      <div className="bg-card py-8 md:py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-6xl font-display font-bold uppercase tracking-tight text-white">
            Unsere Speisekarte
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* ── Category tabs — horizontal scroll on mobile ─────────────── */}
        <div className="mb-6 md:mb-8 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex border-b border-border min-w-max md:min-w-0 gap-1 md:gap-0">
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.slug)}
                  className={`px-3 md:px-4 py-3 text-sm md:text-base font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                    activeCategory === cat.slug
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Items grid ─────────────────────────────────────────────────── */}
        {categories?.map((cat) => {
          if (activeCategory !== cat.slug) return null;
          const categoryItems = items?.filter((item) => item.categoryId === cat.id) ?? [];
          const fallbackImg = fallbackImages[cat.name] ?? "/hero-burger.png";

          return (
            <div key={cat.id}>
              {cat.description && (
                <p className="text-muted-foreground mb-5 text-sm">{cat.description}</p>
              )}
              {categoryItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  Keine Artikel in dieser Kategorie.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                  {categoryItems.map((item) => {
                    const hasOptions = (item.optionGroups?.length ?? 0) > 0;
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
                            <div className="absolute top-2 left-2 bg-primary text-white text-xs font-bold uppercase px-2 py-0.5 tracking-wider">
                              Größe wählbar
                            </div>
                          )}
                        </div>
                        <div className="p-4 md:p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-1 md:mb-2">
                            <h3 className="text-base md:text-xl font-display font-bold uppercase text-white pr-3 leading-tight">
                              {item.name}
                            </h3>
                            <div className="text-right shrink-0">
                              {absoluteGroup ? (
                                <div>
                                  <span className="text-xs text-muted-foreground block">ab</span>
                                  <span className="text-primary font-bold text-sm md:text-base">
                                    {minPrice.toFixed(2)} €
                                  </span>
                                </div>
                              ) : (
                                <span className="text-primary font-bold text-sm md:text-base">
                                  {item.price.toFixed(2)} €
                                </span>
                              )}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-muted-foreground text-xs md:text-sm flex-1 mb-4 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {absoluteGroup && (
                            <div className="flex gap-1.5 mb-3 flex-wrap">
                              {absoluteGroup.items.map((v) => (
                                <span
                                  key={v.id}
                                  className="text-xs border border-border px-1.5 py-0.5 text-muted-foreground"
                                >
                                  {v.name}: {v.defaultPrice.toFixed(2)} €
                                </span>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="default"
                            className="w-full uppercase tracking-wider font-bold rounded-none bg-white text-black hover:bg-primary hover:text-white transition-colors text-xs md:text-sm h-10 md:h-11"
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
            </div>
          );
        })}
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
