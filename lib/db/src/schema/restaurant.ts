import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const orderTypeEnum = pgEnum("order_type", ["delivery", "pickup"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivering",
  "completed",
  "cancelled",
]);
export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed",
]);
export const orderSourceEnum = pgEnum("order_source", [
  "online",
  "phone",
  "lieferando",
  "takeaway",
  "dine_in",
]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "sale",
  "restock",
  "correction",
  "loss",
  "consumption",
  "cancellation",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "open",
  "paid",
  "refunded",
  "failed",
]);
export const userRoleEnum = pgEnum("user_role", [
  "inhaber",
  "administrator",
  "kueche",
  "kasse",
  "fahrer",
]);
export const cashMovementTypeEnum = pgEnum("cash_movement_type", [
  "deposit", // Einlage
  "payout", // Entnahme
  "tip", // Trinkgeld
  "refund", // Rückerstattung (bar)
  "correction", // Korrektur (vorzeichenbehaftet)
]);
export const cashClosingTypeEnum = pgEnum("cash_closing_type", [
  "day", // Tagesabschluss
  "shift", // Schichtabschluss
]);

// ── CATEGORIES ──────────────────────────────────────────────────────────────
export const categories = pgTable("restaurant_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  icon: text("icon"),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── MENU ITEMS ───────────────────────────────────────────────────────────────
export const menuItems = pgTable("restaurant_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  available: boolean("available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── ITEM VARIANTS (legacy, kept for backward-compat) ─────────────────────────
export const itemVariants = pgTable("restaurant_item_variants", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── ITEM EXTRAS (legacy, kept for backward-compat) ───────────────────────────
export const itemExtras = pgTable("restaurant_item_extras", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── GLOBAL OPTION GROUPS ──────────────────────────────────────────────────────
// Reusable groups like "Pizza-Größe" or "Pizza-Extras".
// inputType: 'single' = radio (one choice), 'multiple' = checkboxes (many).
// priceType: 'absolute' = selected item price replaces base price (sizes);
//            'additive' = selected item prices are added to the base price (extras).
export const optionGroups = pgTable("restaurant_option_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  inputType: text("input_type").notNull().default("single"),
  required: boolean("required").notNull().default(false),
  priceType: text("price_type").notNull().default("additive"),
  minSelections: integer("min_selections").notNull().default(0),
  maxSelections: integer("max_selections"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── OPTION ITEMS ──────────────────────────────────────────────────────────────
// Items within an option group.
// defaultPrice: used when no per-item price or priceByVariant applies.
// priceByVariant: JSONB map {"29 cm": 0.70, "32 cm": 0.90} for context-dependent pricing.
export const optionItems = pgTable("restaurant_option_items", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => optionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultPrice: numeric("default_price", { precision: 10, scale: 2 }).notNull().default("0"),
  priceByVariant: jsonb("price_by_variant").$type<Record<string, number>>(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  available: boolean("available").notNull().default(true),
});

// ── CATEGORY → OPTION GROUP ASSIGNMENTS ──────────────────────────────────────
// Linking a category to a group applies the group to all items in that category.
export const categoryOptionGroups = pgTable(
  "restaurant_category_option_groups",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.categoryId, t.groupId)],
);

// ── ITEM → OPTION GROUP ASSIGNMENTS (overrides category) ─────────────────────
// Use this when a specific item needs its own groups (different from category default).
export const itemOptionGroups = pgTable(
  "restaurant_item_option_groups",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.menuItemId, t.groupId)],
);

// ── PER-ITEM PRICES FOR ABSOLUTE OPTIONS ─────────────────────────────────────
// For 'absolute' priceType groups (e.g., sizes), each item can have its own price
// per option item (e.g., Margherita 29cm=10.50, Salami 29cm=11.40).
export const itemOptionPrices = pgTable(
  "restaurant_item_option_prices",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    optionItemId: integer("option_item_id")
      .notNull()
      .references(() => optionItems.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [unique().on(t.menuItemId, t.optionItemId)],
);

// ── CUSTOMERS (accounts) ──────────────────────────────────────────────────────
export const customers = pgTable("restaurant_customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // CRM fields
  isBlocked: boolean("is_blocked").notNull().default(false),
  isRegular: boolean("is_regular").notNull().default(false),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  vipStatus: boolean("vip_status").notNull().default(false),
  birthday: text("birthday"),
});

// ── CUSTOMER CRM NOTES (internal admin notes, not customer-visible) ────────────
export const customerCrmNotes = pgTable("restaurant_customer_crm_notes", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── BRANCHES (Filialen) ───────────────────────────────────────────────────────
// Vorbereitung für Mehrfilialen-Betrieb. Aktuell existiert genau eine Standard-
// Filiale ("Hauptfiliale", isDefault=true). Bestellungen, Kassenbewegungen und
// Kassenabschlüsse referenzieren optional eine Filiale (nullable = Hauptfiliale).
export const branches = pgTable("restaurant_branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
export const orders = pgTable("restaurant_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  orderType: orderTypeEnum("order_type").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  deliveryAddress: text("delivery_address"),
  postalCode: text("postal_code"),
  city: text("city"),
  notes: text("notes"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("open"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  couponCode: text("coupon_code"),
  source: orderSourceEnum("source").notNull().default("online"),
  tableInfo: text("table_info"),
  branchId: integer("branch_id").references(() => branches.id, {
    onDelete: "set null",
  }),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── ORDER DELETION LOG ────────────────────────────────────────────────────────
// Audit trail for permanently deleted orders. The order row itself is removed
// (so it no longer appears in lists/stats), but this record preserves who
// deleted it, when, and the optional reason.
export const orderDeletionLog = pgTable("restaurant_order_deletion_log", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  deletedBy: text("deleted_by"),
  deletedAt: timestamp("deleted_at").notNull().defaultNow(),
});

// ── USERS (staff accounts with roles) ────────────────────────────────────────
// Replaces the former single settings-based admin login. Every staff member has
// their own account with a role that determines their permissions. Accounts are
// deactivated (active=false), never hard-deleted, so the audit trail stays intact.
export const users = pgTable("restaurant_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── ACTIVITY LOG (audit trail for important actions) ─────────────────────────
// Records security-relevant actions: order deleted, price changed, product
// deactivated, coupon created, user created (and more). userId is set null on
// user deletion but username is denormalized so the record stays readable.
export const activityLog = pgTable("restaurant_activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── ORDER ITEMS ───────────────────────────────────────────────────────────────
export const orderItems = pgTable("restaurant_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, {
    onDelete: "set null",
  }),
  itemName: text("item_name").notNull(),
  itemPrice: numeric("item_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  variantName: text("variant_name"),
  extrasSnapshot: jsonb("extras_snapshot").$type<Array<{ name: string; price: number }>>(),
  // New: selected option group items snapshot for the option-groups system
  optionsSnapshot: jsonb("options_snapshot").$type<Array<{
    groupId: number;
    groupName: string;
    optionItemId: number;
    optionItemName: string;
    price: number;
  }>>(),
});

// ── STOCK ITEMS (Zutaten / Artikel) ───────────────────────────────────────────
// Eigenständige Zutaten/Artikel (Teig, Käse, Salami …). menuItemId ist optional
// und nur für Alt-Datensätze relevant (1:1-Kopplung Produkt↔Lager). Neue Zutaten
// werden über Rezepturen (recipes) mit Produkten verbunden.
export const stockItems = pgTable("restaurant_stock_items", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  currentStock: numeric("current_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 10, scale: 2 }).notNull().default("5"),
  unit: text("unit").notNull().default("Stück"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  supplier: text("supplier"),
  active: boolean("active").notNull().default(true),
  trackStock: boolean("track_stock").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── RECIPES (Rezepturen: Produkt → Zutaten) ───────────────────────────────────
// Eine Zeile = "Produkt verbraucht Menge X einer Zutat". Eine Rezeptur pro
// Produkt (alle Größen/Varianten verbrauchen gleich viel). Die Rezeptmenge nutzt
// dieselbe Einheit wie die Zutat (keine Umrechnung).
export const recipes = pgTable("restaurant_recipes", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  stockItemId: integer("stock_item_id")
    .notNull()
    .references(() => stockItems.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── STOCK MOVEMENTS ───────────────────────────────────────────────────────────
export const stockMovements = pgTable("restaurant_stock_movements", {
  id: serial("id").primaryKey(),
  stockItemId: integer("stock_item_id").references(() => stockItems.id, { onDelete: "set null" }),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  previousStock: numeric("previous_stock", { precision: 10, scale: 2 }).notNull(),
  newStock: numeric("new_stock", { precision: 10, scale: 2 }).notNull(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── FAVORITE ORDERS ───────────────────────────────────────────────────────────
// Customers can save named order presets for quick reorder.
export const favoriteOrders = pgTable("restaurant_favorite_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Full cart snapshot: array of {menuItemId, itemName, quantity, unitPrice, selectedOptions[...]}
  items: jsonb("items")
    .notNull()
    .$type<
      Array<{
        menuItemId: number;
        itemName: string;
        quantity: number;
        unitPrice: number;
        selectedOptions: Array<{
          groupId: number;
          groupName: string;
          optionItemId: number;
          optionItemName: string;
          price: number;
          priceType: string;
        }>;
      }>
    >(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── CUSTOMER SAVED NOTES ───────────────────────────────────────────────────────
// Reusable delivery notes (e.g. "Ohne Zwiebeln", "Extra scharf").
export const customerNotes = pgTable("restaurant_customer_notes", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── OPENING HOURS ─────────────────────────────────────────────────────────────
export const openingHours = pgTable("restaurant_opening_hours", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull().unique(),
  dayName: text("day_name").notNull(),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  isClosed: boolean("is_closed").notNull().default(false),
});

// ── DELIVERY AREAS ────────────────────────────────────────────────────────────
export const deliveryAreas = pgTable("restaurant_delivery_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  postalCode: text("postal_code").notNull(),
  minOrder: numeric("min_order", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  deliveryTime: text("delivery_time").default("30-45 Min."),
  active: boolean("active").notNull().default(true),
});

// ── COUPONS ───────────────────────────────────────────────────────────────────
export const coupons = pgTable("restaurant_coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrder: numeric("min_order", { precision: 10, scale: 2 }).default("0"),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  usageCount: integer("usage_count").notNull().default(0),
  maxUsage: integer("max_usage"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
export const settings = pgTable("restaurant_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// ── CASH MOVEMENTS (Kassenbewegungen) ─────────────────────────────────────────
// Manuelle Bar-Bewegungen der Kasse: Einlage, Entnahme, Trinkgeld, Rückerstattung,
// Korrektur. Bewusst getrennt von Bestellungen/Checkout gehalten, damit das
// Kassenmodul in sich geschlossen ist und keine anderen Module verändert.
export const cashMovements = pgTable("restaurant_cash_movements", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, {
    onDelete: "set null",
  }),
  type: cashMovementTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── CASH CLOSINGS (Kassenabschlüsse) ──────────────────────────────────────────
// Tages- oder Schichtabschluss. Snapshot des Zeitraums: erwarteter vs. gezählter
// Bar-Bestand, Differenz, Einnahmen nach Zahlungsart, Trinkgeld, Rückerstattungen,
// Stornos. Nur Administratoren dürfen Abschlüsse anlegen/löschen (RBAC).
export const cashClosings = pgTable("restaurant_cash_closings", {
  id: serial("id").primaryKey(),
  type: cashClosingTypeEnum("type").notNull(),
  branchId: integer("branch_id").references(() => branches.id, {
    onDelete: "set null",
  }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  openingFloat: numeric("opening_float", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  countedCash: numeric("counted_cash", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  expectedCash: numeric("expected_cash", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  difference: numeric("difference", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  totalRevenue: numeric("total_revenue", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  cashRevenue: numeric("cash_revenue", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  tipsTotal: numeric("tips_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  refundsTotal: numeric("refunds_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  depositsTotal: numeric("deposits_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  payoutsTotal: numeric("payouts_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  cancellationsCount: integer("cancellations_count").notNull().default(0),
  cancellationsTotal: numeric("cancellations_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  ordersCount: integer("orders_count").notNull().default(0),
  incomeByMethod: jsonb("income_by_method").$type<
    Array<{ method: string; label: string; count: number; revenue: number }>
  >(),
  notes: text("notes"),
  closedByUserId: integer("closed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  closedByUsername: text("closed_by_username"),
  closedAt: timestamp("closed_at").notNull().defaultNow(),
});

// ── RELATIONS ─────────────────────────────────────────────────────────────────
export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(menuItems),
  extras: many(itemExtras),
  categoryOptionGroups: many(categoryOptionGroups),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  variants: many(itemVariants),
  extras: many(itemExtras),
  itemOptionGroups: many(itemOptionGroups),
  itemOptionPrices: many(itemOptionPrices),
  recipes: many(recipes),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [recipes.menuItemId],
    references: [menuItems.id],
  }),
  stockItem: one(stockItems, {
    fields: [recipes.stockItemId],
    references: [stockItems.id],
  }),
}));

export const itemVariantsRelations = relations(itemVariants, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemVariants.menuItemId],
    references: [menuItems.id],
  }),
}));

export const itemExtrasRelations = relations(itemExtras, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemExtras.menuItemId],
    references: [menuItems.id],
  }),
  category: one(categories, {
    fields: [itemExtras.categoryId],
    references: [categories.id],
  }),
}));

export const optionGroupsRelations = relations(optionGroups, ({ many }) => ({
  items: many(optionItems),
  categoryOptionGroups: many(categoryOptionGroups),
  itemOptionGroups: many(itemOptionGroups),
}));

export const optionItemsRelations = relations(optionItems, ({ one, many }) => ({
  group: one(optionGroups, {
    fields: [optionItems.groupId],
    references: [optionGroups.id],
  }),
  itemOptionPrices: many(itemOptionPrices),
}));

export const categoryOptionGroupsRelations = relations(categoryOptionGroups, ({ one }) => ({
  category: one(categories, {
    fields: [categoryOptionGroups.categoryId],
    references: [categories.id],
  }),
  group: one(optionGroups, {
    fields: [categoryOptionGroups.groupId],
    references: [optionGroups.id],
  }),
}));

export const itemOptionGroupsRelations = relations(itemOptionGroups, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemOptionGroups.menuItemId],
    references: [menuItems.id],
  }),
  group: one(optionGroups, {
    fields: [itemOptionGroups.groupId],
    references: [optionGroups.id],
  }),
}));

export const itemOptionPricesRelations = relations(itemOptionPrices, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemOptionPrices.menuItemId],
    references: [menuItems.id],
  }),
  optionItem: one(optionItems, {
    fields: [itemOptionPrices.optionItemId],
    references: [optionItems.id],
  }),
}));

export const stockItemsRelations = relations(stockItems, ({ one, many }) => ({
  menuItem: one(menuItems, { fields: [stockItems.menuItemId], references: [menuItems.id] }),
  movements: many(stockMovements),
  recipes: many(recipes),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  stockItem: one(stockItems, { fields: [stockMovements.stockItemId], references: [stockItems.id] }),
  menuItem: one(menuItems, { fields: [stockMovements.menuItemId], references: [menuItems.id] }),
  order: one(orders, { fields: [stockMovements.orderId], references: [orders.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  favoriteOrders: many(favoriteOrders),
  notes: many(customerNotes),
  crmNotes: many(customerCrmNotes),
}));

export const customerCrmNotesRelations = relations(customerCrmNotes, ({ one }) => ({
  customer: one(customers, { fields: [customerCrmNotes.customerId], references: [customers.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  stockMovements: many(stockMovements),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const favoriteOrdersRelations = relations(favoriteOrders, ({ one }) => ({
  customer: one(customers, { fields: [favoriteOrders.customerId], references: [customers.id] }),
}));

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  customer: one(customers, { fields: [customerNotes.customerId], references: [customers.id] }),
}));

// ── PAYMENT METHOD SETTINGS ────────────────────────────────────────────────
export const paymentMethodSettings = pgTable("restaurant_payment_method_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  forDelivery: boolean("for_delivery").notNull().default(true),
  forPickup: boolean("for_pickup").notNull().default(true),
  onlineVisible: boolean("online_visible").notNull().default(true),
  adminVisible: boolean("admin_visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
