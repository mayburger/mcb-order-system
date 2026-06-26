import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu, X, User } from "lucide-react";
import { useGetRestaurantInfo } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { customer, isAuthenticated } = useCustomerAuth();
  const { data: restaurant } = useGetRestaurantInfo();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Startseite" },
    { href: "/menu", label: "Speisekarte" },
    { href: "/opening-hours", label: "Öffnungszeiten" },
    { href: "/contact", label: "Kontakt" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-white"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menü öffnen"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/" className="flex items-center">
              <span className="text-lg md:text-2xl font-display font-bold uppercase tracking-tight text-white leading-tight">
                {restaurant?.name || "MAY CHICKEN & BURGER"}
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

          {/* Right: account icon + cart */}
          <div className="flex items-center gap-2">
            <Link href={isAuthenticated ? "/account/profile" : "/account/login"}>
              <Button
                variant="ghost"
                size="icon"
                className={`relative w-9 h-9 ${location.startsWith("/account") ? "text-primary" : "text-muted-foreground hover:text-white"}`}
                title={isAuthenticated ? `Mein Konto (${customer?.firstName})` : "Anmelden"}
              >
                <User className="h-4 w-4" />
                {isAuthenticated && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
            </Link>

            <Link href="/cart">
              <Button
                variant="outline"
                className="relative border-border bg-background/50 px-3 md:px-4"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Warenkorb</span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Mobile drawer ─────────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="flex flex-col px-4 py-4 gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`py-3 px-2 text-base font-bold uppercase tracking-wider border-b border-border/50 last:border-0 transition-colors ${
                    location === link.href ? "text-primary" : "text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={isAuthenticated ? "/account/orders" : "/account/login"}
                onClick={() => setMobileOpen(false)}
                className={`py-3 px-2 text-base font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                  location.startsWith("/account") ? "text-primary" : "text-white"
                }`}
              >
                <User className="h-4 w-4" />
                {isAuthenticated ? `Mein Konto (${customer?.firstName})` : "Anmelden"}
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-secondary py-10 md:py-12">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-display font-bold uppercase tracking-tight text-white">
              {restaurant?.name || "MAY CHICKEN"}
              <span className="text-primary">.</span>
            </span>
            <p className="mt-3 text-muted-foreground text-sm">
              {restaurant?.tagline || "Unnachgiebig premium. Schnell & lecker."}
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase text-white mb-3 text-sm">Standort</h4>
            <p className="text-muted-foreground text-sm">{restaurant?.address}</p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase text-white mb-3 text-sm">Kontakt</h4>
            <p className="text-muted-foreground text-sm">{restaurant?.phone}</p>
            <p className="text-muted-foreground text-sm">{restaurant?.email}</p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase text-white mb-3 text-sm">Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/menu" className="hover:text-primary">Speisekarte</Link></li>
              <li><Link href="/opening-hours" className="hover:text-primary">Öffnungszeiten</Link></li>
              <li><Link href="/account/orders" className="hover:text-primary">Mein Konto</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
