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
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  couponCode: text("coupon_code"),
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

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  favoriteOrders: many(favoriteOrders),
  notes: many(customerNotes),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
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
