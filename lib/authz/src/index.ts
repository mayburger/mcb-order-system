// Single source of truth for role-based access control (RBAC).
//
// This package is pure, browser-safe TypeScript with NO server/DB imports so it
// can be shared by both the API server (enforcement) and the web client
// (nav/route gating). The web client must NEVER be trusted for security — every
// permission is also enforced server-side. This is only the shared definition.

export const ROLES = [
  "inhaber",
  "administrator",
  "kueche",
  "kasse",
  "fahrer",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Dashboard & orders
  "dashboard.view",
  "orders.view",
  "orders.status.update",
  "orders.archiveDelete",
  // Catalog / product management (items, categories, option groups, inventory)
  "products.manage",
  // Other admin areas
  "customers.manage",
  "coupons.manage",
  "deliveryAreas.manage",
  "openingHours.manage",
  "settings.manage",
  "quickOrders.create",
  "payments.manage",
  "printSettings.manage",
  // Cash register & closings
  "cashRegister.view",
  "cashClosing.manage",
  // Kitchen monitor
  "kitchen.view",
  "kitchen.status.update",
  // Driver / delivery
  "driver.orders.view",
  "driver.status.update",
  // Owner-only administration
  "users.manage",
  "activityLog.view",
  // Available to every authenticated user
  "password.change",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Permission granted to every authenticated user regardless of role.
const SELF_PERMISSIONS: readonly Permission[] = ["password.change"];

// Deny-by-default matrix. A role gets exactly the permissions listed here
// (plus SELF_PERMISSIONS). The owner ("inhaber") gets everything.
const ADMINISTRATOR_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.status.update",
  "orders.archiveDelete",
  "products.manage",
  "customers.manage",
  "coupons.manage",
  "deliveryAreas.manage",
  "openingHours.manage",
  "settings.manage",
  "quickOrders.create",
  "payments.manage",
  "printSettings.manage",
  "cashRegister.view",
  "cashClosing.manage",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  inhaber: [...PERMISSIONS],
  administrator: [...ADMINISTRATOR_PERMISSIONS, ...SELF_PERMISSIONS],
  kueche: ["kitchen.view", "kitchen.status.update", ...SELF_PERMISSIONS],
  kasse: [
    "orders.view",
    "quickOrders.create",
    "cashRegister.view",
    ...SELF_PERMISSIONS,
  ],
  fahrer: ["driver.orders.view", "driver.status.update", ...SELF_PERMISSIONS],
};

export const ROLE_LABELS: Record<Role, string> = {
  inhaber: "Inhaber",
  administrator: "Administrator",
  kueche: "Küche",
  kasse: "Kasse / Mitarbeiter",
  fahrer: "Fahrer",
};

// Where each role is sent right after login (its primary allowed surface).
export const ROLE_LANDING: Record<Role, string> = {
  inhaber: "/backstage/dashboard",
  administrator: "/backstage/dashboard",
  kueche: "/kitchen",
  kasse: "/backstage/quick-order",
  fahrer: "/backstage/driver",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function permissionsForRole(role: Role | null | undefined): readonly Permission[] {
  if (!role || !isRole(role)) return [];
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  return permissionsForRole(role).includes(permission);
}

export function landingPathForRole(role: Role | null | undefined): string {
  if (!role || !isRole(role)) return "/backstage";
  return ROLE_LANDING[role];
}

// Maps a frontend route path to the permission required to open it. Used by the
// central ProtectedRoute guard. Routes not listed here only require auth.
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/backstage/dashboard": "dashboard.view",
  "/backstage/orders": "orders.view",
  "/backstage/archive": "orders.archiveDelete",
  "/backstage/products": "products.manage",
  "/backstage/categories": "products.manage",
  "/backstage/option-groups": "products.manage",
  "/backstage/inventory": "products.manage",
  "/backstage/customers": "customers.manage",
  "/backstage/delivery-areas": "deliveryAreas.manage",
  "/backstage/opening-hours": "openingHours.manage",
  "/backstage/coupons": "coupons.manage",
  "/backstage/quick-order": "quickOrders.create",
  "/backstage/print-settings": "printSettings.manage",
  "/backstage/payments": "payments.manage",
  "/backstage/cash-register": "cashRegister.view",
  "/backstage/cash-closing": "cashClosing.manage",
  "/backstage/reports": "dashboard.view",
  "/backstage/settings": "settings.manage",
  "/backstage/users": "users.manage",
  "/backstage/activity-log": "activityLog.view",
  "/backstage/driver": "driver.orders.view",
  "/kitchen": "kitchen.view",
};
