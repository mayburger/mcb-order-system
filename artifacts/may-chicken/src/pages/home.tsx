import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { useListMenuItems } from "@workspace/api-client-react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import importHeroImg from "@assets/hero-burger.png";

export default function Home() {
  const { data: featuredItems } = useListMenuItems({ featured: true });
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (item: any) => {
    addItem(item);
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`
    });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden border-b border-border">
        {/* Background Image / Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent z-10" />
          <img src="/hero-burger.png" alt="Premium Burger" className="w-full h-full object-cover object-right opacity-80" />
        </div>

        <div className="container mx-auto px-4 relative z-20 pt-20">
          <div className="max-w-2xl">
            <h1 className="text-6xl md:text-8xl font-display font-bold uppercase tracking-tighter text-white leading-none mb-6">
              Fast Food, <br />
              <span className="text-primary">Done Right.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
              Premium ingredients, unapologetic flavors. Experience the fast food you deserve.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/menu">
                <Button size="lg" className="text-lg uppercase tracking-wider font-bold h-14 px-8 bg-primary hover:bg-primary/90 text-white rounded-none">
                  Order Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-24 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight text-white">Featured</h2>
              <p className="text-muted-foreground mt-2 text-lg">Our undisputed champions.</p>
            </div>
            <Link href="/menu">
              <Button variant="ghost" className="hidden md:flex uppercase tracking-widest font-bold text-muted-foreground hover:text-white">
                View Full Menu <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredItems?.map((item) => (
              <div key={item.id} className="group bg-background border border-border overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                <div className="aspect-square relative overflow-hidden bg-secondary">
                  <img 
                    src={item.imageUrl || "/chicken-sandwich.png"} 
                    alt={item.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-primary text-white font-bold py-1 px-3 text-sm uppercase tracking-wider">
                    ${(item.price / 100).toFixed(2)}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-display font-bold uppercase text-white mb-2">{item.name}</h3>
                  <p className="text-muted-foreground text-sm flex-1 mb-6">{item.description}</p>
                  <Button 
                    variant="outline" 
                    className="w-full uppercase tracking-wider font-bold rounded-none border-border hover:bg-white hover:text-black transition-colors"
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.available}
                  >
                    {item.available ? (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4" /> Add to Order
                      </>
                    ) : (
                      "Sold Out"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/menu">
              <Button variant="outline" className="uppercase tracking-widest font-bold w-full rounded-none">
                View Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-5xl md:text-7xl font-display font-bold uppercase tracking-tight text-white mb-6">
            Hungry?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium">
            Don't settle for average. Get premium burgers and chicken delivered hot and fast to your door.
          </p>
          <Link href="/menu">
            <Button size="lg" variant="secondary" className="text-lg uppercase tracking-wider font-bold h-14 px-10 rounded-none bg-black text-white hover:bg-black/80 border-none">
              Start Your Order
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
