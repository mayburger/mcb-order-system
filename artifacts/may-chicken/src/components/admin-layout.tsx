import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Tags,
  Users,
  MapPin,
  Clock,
  TicketPercent,
  Settings,
  LogOut,
  Menu,
  SlidersHorizontal,
  Package,
  PhoneCall,
  Printer,
  CreditCard,
} from "lucide-react";
import { useAdminLogout } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useAdminLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/backstage");
      }
    });
  };

  const navItems = [
    { href: "/backstage/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/backstage/orders", label: "Bestellungen", icon: ShoppingBag },
    { href: "/backstage/products", label: "Produkte", icon: UtensilsCrossed },
    { href: "/backstage/categories", label: "Kategorien", icon: Tags },
    { href: "/backstage/option-groups", label: "Optionsgruppen", icon: SlidersHorizontal },
    { href: "/backstage/customers", label: "Kunden", icon: Users },
    { href: "/backstage/delivery-areas", label: "Liefergebiete", icon: MapPin },
    { href: "/backstage/opening-hours", label: "Öffnungszeiten", icon: Clock },
    { href: "/backstage/coupons", label: "Gutscheine", icon: TicketPercent },
    { href: "/backstage/inventory", label: "Lager", icon: Package },
    { href: "/backstage/quick-order", label: "Schnellbestellung", icon: PhoneCall },
    { href: "/backstage/print-settings", label: "Drucker & Bons", icon: Printer },
    { href: "/backstage/payments", label: "Zahlungen", icon: CreditCard },
    { href: "/backstage/settings", label: "Einstellungen", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6">
        <span className="text-xl font-display font-bold uppercase tracking-tight text-white">
          ADMIN
          <span className="text-primary">.</span>
        </span>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-white"
              }`}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-3" />
          Abmelden
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-64 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card z-50 flex items-center px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-card border-r-border">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="ml-4 text-lg font-display font-bold uppercase tracking-tight text-white">
          ADMIN<span className="text-primary">.</span>
        </span>
      </div>

      <main className="flex-1 p-6 md:p-8 pt-20 md:pt-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
