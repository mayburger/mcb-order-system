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
import AdminArchive from "@/pages/admin/archive";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminCustomers from "@/pages/admin/customers";
import AdminDeliveryAreas from "@/pages/admin/delivery-areas";
import AdminOpeningHours from "@/pages/admin/opening-hours";
import AdminCoupons from "@/pages/admin/coupons";
import AdminSettings from "@/pages/admin/settings";
import AdminOptionGroups from "@/pages/admin/option-groups";
import AdminInventory from "@/pages/admin/inventory";
import AdminQuickOrder from "@/pages/admin/quick-order";
import AdminPrintSettings from "@/pages/admin/print-settings";
import AdminPayments from "@/pages/admin/payments";
import AdminUsers from "@/pages/admin/users";
import AdminActivityLog from "@/pages/admin/activity-log";
import AdminDriver from "@/pages/admin/driver";
import ChangePasswordPage from "@/pages/admin/change-password";
import AdminCashRegister from "@/pages/admin/cash-register";
import AdminCashClosing from "@/pages/admin/cash-closing";
import AdminReports from "@/pages/admin/reports";

import KitchenPage from "@/pages/kitchen";

import { ProtectedRoute } from "@/lib/admin-auth";

import AccountLoginPage from "@/pages/account/login";
import AccountProfilePage from "@/pages/account/profile";
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
      <Route path="/account/profile" component={AccountProfilePage} />
      <Route path="/account/orders" component={AccountOrdersPage} />
      <Route path="/account/favorites" component={AccountFavoritesPage} />
      <Route path="/account/notes" component={AccountNotesPage} />
      <Route path="/account">
        {() => { window.location.replace("/account/profile"); return null; }}
      </Route>

      {/* Kitchen display */}
      <Route path="/kitchen">
        <ProtectedRoute permission="kitchen.view">
          <KitchenPage />
        </ProtectedRoute>
      </Route>

      {/* Admin routes */}
      <Route path="/backstage" component={AdminLoginPage} />
      <Route path="/backstage/change-password">
        <ProtectedRoute permission="password.change">
          <ChangePasswordPage />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/dashboard">
        <ProtectedRoute permission="dashboard.view">
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/orders">
        <ProtectedRoute permission="orders.view">
          <AdminOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/archive">
        <ProtectedRoute permission="orders.archiveDelete">
          <AdminArchive />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/products">
        <ProtectedRoute permission="products.manage">
          <AdminProducts />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/categories">
        <ProtectedRoute permission="products.manage">
          <AdminCategories />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/customers">
        <ProtectedRoute permission="customers.manage">
          <AdminCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/delivery-areas">
        <ProtectedRoute permission="deliveryAreas.manage">
          <AdminDeliveryAreas />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/opening-hours">
        <ProtectedRoute permission="openingHours.manage">
          <AdminOpeningHours />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/coupons">
        <ProtectedRoute permission="coupons.manage">
          <AdminCoupons />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/settings">
        <ProtectedRoute permission="settings.manage">
          <AdminSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/option-groups">
        <ProtectedRoute permission="products.manage">
          <AdminOptionGroups />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/cash-register">
        <ProtectedRoute permission="cashRegister.view">
          <AdminCashRegister />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/cash-closing">
        <ProtectedRoute permission="cashClosing.manage">
          <AdminCashClosing />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/reports">
        <ProtectedRoute permission="dashboard.view">
          <AdminReports />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/inventory">
        <ProtectedRoute permission="products.manage">
          <AdminInventory />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/quick-order">
        <ProtectedRoute permission="quickOrders.create">
          <AdminQuickOrder />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/print-settings">
        <ProtectedRoute permission="printSettings.manage">
          <AdminPrintSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/payments">
        <ProtectedRoute permission="payments.manage">
          <AdminPayments />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/driver">
        <ProtectedRoute permission="driver.orders.view">
          <AdminDriver />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/activity-log">
        <ProtectedRoute permission="activityLog.view">
          <AdminActivityLog />
        </ProtectedRoute>
      </Route>
      <Route path="/backstage/users">
        <ProtectedRoute permission="users.manage">
          <AdminUsers />
        </ProtectedRoute>
      </Route>

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
