import React from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { Button } from "@/components/ui/button";
import { User, ShoppingBag, Heart, FileText, LogOut } from "lucide-react";

const tabs = [
  { href: "/account/orders", label: "Bestellungen", icon: ShoppingBag },
  { href: "/account/favorites", label: "Favoriten", icon: Heart },
  { href: "/account/notes", label: "Meine Notizen", icon: FileText },
];

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { customer, isAuthenticated, isLoading, logout } = useCustomerAuth();

  if (!isLoading && !isAuthenticated) {
    navigate("/account/login");
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Mein Konto</p>
              <h1 className="text-xl font-display font-bold uppercase text-white leading-tight">
                {customer ? `${customer.firstName} ${customer.lastName}`.trim() : "…"}
              </h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-white gap-2 text-xs uppercase tracking-wider"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-border mb-6 md:mb-8 overflow-x-auto">
          {tabs.map((tab) => {
            const active = location.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <button
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors -mb-px ${
                    active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </Layout>
  );
}
