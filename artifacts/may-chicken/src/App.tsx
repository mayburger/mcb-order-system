import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";

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

import KitchenPage from "@/pages/kitchen";

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

      {/* Kitchen display */}
      <Route path="/kitchen" component={KitchenPage} />

      {/* Admin routes */}
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/delivery-areas" component={AdminDeliveryAreas} />
      <Route path="/admin/opening-hours" component={AdminOpeningHours} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/admin/settings" component={AdminSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
