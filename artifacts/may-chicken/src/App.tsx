import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import { CustomerAuthProvider } from "@/lib/customer-auth-context";

import Home from "@/pages/home";
import MenuPage from "@/pages/menu";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrderStatusPage from "@/pages/order-status";
import OpeningHoursPage from "@/pages/opening-hours";
import ContactPage from "@/pages/contact";
import NotFound from "@/pages/not-found";

import AdminLoginPage from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminOrders from "@/pages/admin/orders";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminCustomers from "@/pages/admin/customers";
import AdminDeliveryAreas from "@/pages/admin/delivery-areas";
import AdminOpeningHours from "@/pages/admin/opening-hours";
import AdminCoupons from "@/pages/admin/coupons";
import AdminSettings from "@/pages/admin/settings";
import AdminOptionGroups from "@/pages/admin/option-groups";

import KitchenPage from "@/pages/kitchen";

import AccountLoginPage from "@/pages/account/login";
import AccountOrdersPage from "@/pages/account/orders";
import AccountFavoritesPage from "@/pages/account/favorites";
import AccountNotesPage from "@/pages/account/notes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Customer routes */}
      <Route path="/" component={Home} />
      <Route path="/menu" component={MenuPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/order/:id" component={OrderStatusPage} />
      <Route path="/opening-hours" component={OpeningHoursPage} />
      <Route path="/contact" component={ContactPage} />

      {/* Account routes */}
      <Route path="/account/login" component={AccountLoginPage} />
      <Route path="/account/orders" component={AccountOrdersPage} />
      <Route path="/account/favorites" component={AccountFavoritesPage} />
      <Route path="/account/notes" component={AccountNotesPage} />
      <Route path="/account">
        {() => { window.location.replace("/account/orders"); return null; }}
      </Route>

      {/* Kitchen display */}
      <Route path="/kitchen" component={KitchenPage} />

      {/* Admin routes */}
      <Route path="/backstage" component={AdminLoginPage} />
      <Route path="/backstage/dashboard" component={AdminDashboard} />
      <Route path="/backstage/orders" component={AdminOrders} />
      <Route path="/backstage/products" component={AdminProducts} />
      <Route path="/backstage/categories" component={AdminCategories} />
      <Route path="/backstage/customers" component={AdminCustomers} />
      <Route path="/backstage/delivery-areas" component={AdminDeliveryAreas} />
      <Route path="/backstage/opening-hours" component={AdminOpeningHours} />
      <Route path="/backstage/coupons" component={AdminCoupons} />
      <Route path="/backstage/settings" component={AdminSettings} />
      <Route path="/backstage/option-groups" component={AdminOptionGroups} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <CustomerAuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CustomerAuthProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
