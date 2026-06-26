import { Layout } from "@/components/layout";
import { useListMenuItems, useListMenuCategories } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MenuPage() {
  const { data: categories, isLoading: categoriesLoading } = useListMenuCategories();
  const { data: items, isLoading: itemsLoading } = useListMenuItems();
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (item: any) => {
    addItem(item);
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`
    });
  };

  const fallbackImages: Record<string, string> = {
    "Burgers": "/hero-burger.png",
    "Chicken": "/chicken-sandwich.png",
    "Pizza": "/pizza.png",
    "Sides": "/fries.png"
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
          <h1 className="text-5xl md:text-6xl font-display font-bold uppercase tracking-tight text-white">Our Menu</h1>
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
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-0 py-4 text-lg uppercase font-bold tracking-wider text-muted-foreground hover:text-white"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories?.map((cat) => {
            const categoryItems = items?.filter(item => item.categoryId === cat.id) || [];
            const fallbackImg = fallbackImages[cat.name] || "/hero-burger.png";

            return (
              <TabsContent key={cat.id} value={cat.slug} className="mt-0 outline-none">
                {categoryItems.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    No items found in this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="group bg-card border border-border overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                        <div className="aspect-[4/3] relative overflow-hidden bg-secondary">
                          <img 
                            src={item.imageUrl || fallbackImg} 
                            alt={item.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-display font-bold uppercase text-white pr-4">{item.name}</h3>
                            <span className="text-primary font-bold whitespace-nowrap">
                              ${(item.price / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm flex-1 mb-6">{item.description}</p>
                          <Button 
                            variant="default" 
                            className="w-full uppercase tracking-wider font-bold rounded-none bg-white text-black hover:bg-primary hover:text-white transition-colors"
                            onClick={() => handleAddToCart(item)}
                            disabled={!item.available}
                          >
                            {item.available ? (
                              <>
                                <ShoppingBag className="mr-2 h-4 w-4" /> Add
                              </>
                            ) : (
                              "Sold Out"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Layout>
  );
}
