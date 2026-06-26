import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
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
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
export const orders = pgTable("restaurant_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  orderType: orderTypeEnum("order_type").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  deliveryAddress: text("delivery_address"),
  postalCode: text("postal_code"),
  city: text("city"),
  notes: text("notes"),
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
});

// ── OPENING HOURS ─────────────────────────────────────────────────────────────
export const openingHours = pgTable("restaurant_opening_hours", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull().unique(), // 0=Sun, 1=Mon, …, 6=Sat
  dayName: text("day_name").notNull(),
  openTime: text("open_time"), // "09:00"
  closeTime: text("close_time"), // "22:00"
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
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));
