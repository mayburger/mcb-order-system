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
  Archive,
  ChefHat,
  Truck,
  ScrollText,
  ShieldCheck,
  KeyRound,
  Calculator,
  FileCheck,
  BarChart3,
} from "lucide-react";
import { useAdminLogout } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAdminAuth } from "@/lib/admin-auth";
import { ROLE_LABELS, isRole, type Permission } from "@workspace/authz";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/backstage/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/backstage/orders", label: "Bestellungen", icon: ShoppingBag, perm: "orders.view" },
  { href: "/backstage/archive", label: "Archiv", icon: Archive, perm: "orders.archiveDelete" },
  { href: "/backstage/products", label: "Produkte", icon: UtensilsCrossed, perm: "products.manage" },
  { href: "/backstage/categories", label: "Kategorien", icon: Tags, perm: "products.manage" },
  { href: "/backstage/option-groups", label: "Optionsgruppen", icon: SlidersHorizontal, perm: "products.manage" },
  { href: "/backstage/customers", label: "Kunden", icon: Users, perm: "customers.manage" },
  { href: "/backstage/delivery-areas", label: "Liefergebiete", icon: MapPin, perm: "deliveryAreas.manage" },
  { href: "/backstage/opening-hours", label: "Öffnungszeiten", icon: Clock, perm: "openingHours.manage" },
  { href: "/backstage/coupons", label: "Gutscheine", icon: TicketPercent, perm: "coupons.manage" },
  { href: "/backstage/inventory", label: "Lager", icon: Package, perm: "products.manage" },
  { href: "/backstage/cash-register", label: "Tageskasse", icon: Calculator, perm: "cashRegister.view" },
  { href: "/backstage/cash-closing", label: "Kassenabschluss", icon: FileCheck, perm: "cashClosing.manage" },
  { href: "/backstage/reports", label: "Berichte", icon: BarChart3, perm: "dashboard.view" },
  { href: "/backstage/quick-order", label: "Schnellbestellung", icon: PhoneCall, perm: "quickOrders.create" },
  { href: "/kitchen", label: "Küchenmonitor", icon: ChefHat, perm: "kitchen.view" },
  { href: "/backstage/driver", label: "Fahrer-Ansicht", icon: Truck, perm: "driver.orders.view" },
  { href: "/backstage/print-settings", label: "Drucker & Bons", icon: Printer, perm: "printSettings.manage" },
  { href: "/backstage/payments", label: "Zahlungen", icon: CreditCard, perm: "payments.manage" },
  { href: "/backstage/activity-log", label: "Aktivitätsprotokoll", icon: ScrollText, perm: "activityLog.view" },
  { href: "/backstage/users", label: "Benutzer", icon: ShieldCheck, perm: "users.manage" },
  { href: "/backstage/settings", label: "Einstellungen", icon: Settings, perm: "settings.manage" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useAdminLogout();
  const { session, permissions } = useAdminAuth();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/backstage");
      }
    });
  };

  const navItems = NAV_ITEMS.filter((item) => permissions.includes(item.perm));
  const roleLabel = isRole(session?.role) ? ROLE_LABELS[session.role] : "";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6">
        <span className="text-xl font-display font-bold uppercase tracking-tight text-white">
          ADMIN
          <span className="text-primary">.</span>
        </span>
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
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
      <div className="p-4 border-t border-border space-y-1">
        {session?.username && (
          <div className="px-3 py-2">
            <p className="text-sm text-white font-medium truncate">{session.username}</p>
            {roleLabel && (
              <p className="text-xs text-primary uppercase tracking-wider">{roleLabel}</p>
            )}
          </div>
        )}
        <Link href="/backstage/change-password">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-muted-foreground hover:bg-secondary hover:text-white">
            <KeyRound className="h-5 w-5" />
            <span>Passwort ändern</span>
          </div>
        </Link>
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
