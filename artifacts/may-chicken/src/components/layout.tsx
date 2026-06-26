import React from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu } from "lucide-react";
import { useGetRestaurantInfo } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { data: restaurant } = useGetRestaurantInfo();

  const links = [
    { href: "/", label: "Startseite" },
    { href: "/menu", label: "Speisekarte" },
    { href: "/opening-hours", label: "Öffnungszeiten" },
    { href: "/contact", label: "Kontakt" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-lg font-medium uppercase tracking-wider ${
                        location === link.href ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                {restaurant?.name || "MAY CHICKEN"}
                <span className="text-primary">.</span>
              </span>
            </Link>

            <nav className="hidden md:flex gap-6 ml-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold uppercase tracking-widest transition-colors hover:text-primary ${
                    location === link.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="outline" className="relative border-border bg-background/50">
                <ShoppingBag className="h-4 w-4 mr-2" />
                <span>Warenkorb</span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-secondary py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="text-2xl font-display font-bold uppercase tracking-tight text-white">
              {restaurant?.name || "MAY CHICKEN"}
              <span className="text-primary">.</span>
            </span>
            <p className="mt-4 text-muted-foreground text-sm">
              {restaurant?.tagline || "Unnachgiebig premium. Schnell & lecker."}
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase text-white mb-4">Standort</h4>
            <p className="text-muted-foreground text-sm">{restaurant?.address}</p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase text-white mb-4">Kontakt</h4>
            <p className="text-muted-foreground text-sm">{restaurant?.phone}</p>
            <p className="text-muted-foreground text-sm">{restaurant?.email}</p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase text-white mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/menu" className="hover:text-primary">Speisekarte</Link></li>
              <li><Link href="/opening-hours" className="hover:text-primary">Öffnungszeiten</Link></li>
              <li><Link href="/admin" className="hover:text-primary">Admin-Login</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
