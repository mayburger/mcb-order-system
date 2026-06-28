import { Router } from "express";
import { db } from "@workspace/db";
import {
  categories,
  menuItems,
  itemVariants,
  itemExtras,
  orders,
  orderItems,
  orderDeletionLog,
  openingHours,
  deliveryAreas,
  coupons,
  settings,
  optionGroups,
  optionItems,
  categoryOptionGroups,
  itemOptionGroups,
  itemOptionPrices,
  customers,
  favoriteOrders,
  customerNotes,
  stockItems,
  stockMovements,
  recipes,
} from "@workspace/db/schema";
import { deductStockForOrder } from "../lib/stockDeduction";
import { eq, desc, asc, gte, and, sql, count, inArray } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth";
import { logActivity } from "../lib/activityLog";
import { serializeOrder } from "./orders";
import bcrypt from "bcryptjs";

const router = Router();

// Every /admin route requires an authenticated, active staff account.
router.use("/admin", requireAuth);

// Per-resource permission gates (deny-by-default). Resources that map cleanly to
// a single permission are gated by prefix here; routes with mixed permissions
// (e.g. /admin/orders) are gated individually on each handler below.
router.use("/admin/stats", requirePermission("dashboard.view"));
router.use("/admin/categories", requirePermission("products.manage"));
router.use("/admin/items", requirePermission("products.manage"));
router.use("/admin/variants", requirePermission("products.manage"));
router.use("/admin/extras", requirePermission("products.manage"));
router.use("/admin/option-groups", requirePermission("products.manage"));
router.use("/admin/option-items", requirePermission("products.manage"));
router.use("/admin/category-option-groups", requirePermission("products.manage"));
router.use("/admin/inventory", requirePermission("products.manage"));
router.use("/admin/customers", requirePermission("customers.manage"));
router.use("/admin/delivery-areas", requirePermission("deliveryAreas.manage"));
router.use("/admin/opening-hours", requirePermission("openingHours.manage"));
router.use("/admin/coupons", requirePermission("coupons.manage"));
router.use("/admin/quick-order", requirePermission("quickOrders.create"));
router.use("/admin/settings", requirePermission("settings.manage"));

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── STATS ─────────────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const allOrders = await db.select().from(orders);
    const todayOrders = allOrders.filter((o) => o.createdAt >= today);
    const weekOrders = allOrders.filter((o) => o.createdAt >= weekAgo);
    const pending = allOrders.filter((o) =>
      ["pending", "confirmed", "preparing", "ready", "delivering"].includes(o.status),
    );

    const totalRevenue = allOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total), 0);
    const todayRevenue = todayOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total), 0);
    const weekRevenue = weekOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total), 0);

    // Popular items
    const allItems = await db.select().from(orderItems);
    const nameCount = new Map<string, number>();
    for (const i of allItems) {
      nameCount.set(i.itemName, (nameCount.get(i.itemName) ?? 0) + i.quantity);
    }
    const popularItems = [...nameCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, orderCount]) => ({ name, orderCount }));

    res.json({
      totalOrders: allOrders.length,
      pendingOrders: pending.length,
      todayOrders: todayOrders.length,
      todayRevenue,
      totalRevenue,
      weekRevenue,
      popularItems,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── CATEGORIES ────────────────────────────────────────────────────────────────
router.get("/admin/categories", async (req, res) => {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    const itemCounts = await db
      .select({ categoryId: menuItems.categoryId, c: count() })
      .from(menuItems)
      .groupBy(menuItems.categoryId);
    const countMap = new Map(itemCounts.map((r) => [r.categoryId, Number(r.c)]));
    res.json(rows.map((c) => ({ ...c, itemCount: countMap.get(c.id) ?? 0 })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/categories", async (req, res) => {
  try {
    const { name, slug, description, imageUrl, sortOrder } = req.body as {
      name: string; slug: string; description?: string; imageUrl?: string; sortOrder?: number;
    };
    const [row] = await db.insert(categories).values({ name, slug, description, imageUrl, sortOrder: sortOrder ?? 0 }).returning();
    res.status(201).json({ ...row, itemCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [row] = await db.update(categories).set(req.body as Partial<typeof categories.$inferInsert>).where(eq(categories.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, itemCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/categories/:id", async (req, res) => {
  try {
    await db.delete(categories).where(eq(categories.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── MENU ITEMS ────────────────────────────────────────────────────────────────
router.get("/admin/items", async (req, res) => {
  try {
    const categoryId = req.query["categoryId"] ? Number(req.query["categoryId"]) : undefined;
    const rows = await db.query.menuItems.findMany({
      with: { category: true },
      where: categoryId ? (item, { eq: eqFn }) => eqFn(item.categoryId, categoryId) : undefined,
      orderBy: [asc(menuItems.sortOrder), asc(menuItems.id)],
    });
    res.json(rows.map((i) => ({ ...i, price: Number(i.price) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/items", async (req, res) => {
  try {
    const body = req.body as {
      name: string; description?: string; price: number; categoryId: number;
      available?: boolean; featured?: boolean; imageUrl?: string; sortOrder?: number;
    };
    const [row] = await db.insert(menuItems).values({
      name: body.name,
      description: body.description,
      price: body.price.toFixed(2),
      categoryId: body.categoryId,
      available: body.available ?? true,
      featured: body.featured ?? false,
      imageUrl: body.imageUrl,
      sortOrder: body.sortOrder ?? 0,
    }).returning();
    res.status(201).json({ ...row, price: Number(row!.price) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/items/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as Partial<{
      name: string; description: string; price: number; categoryId: number;
      available: boolean; featured: boolean; imageUrl: string; sortOrder: number;
    }>;
    const existing = await db.query.menuItems.findFirst({
      where: (m, { eq: eqF }) => eqF(m.id, id),
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const update: Record<string, unknown> = { ...body };
    if (body.price !== undefined) update["price"] = body.price.toFixed(2);
    const [row] = await db.update(menuItems).set(update).where(eq(menuItems.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });

    if (body.price !== undefined && Number(existing.price) !== body.price) {
      await logActivity(req.authUser, "price_changed", {
        entityType: "menu_item",
        entityId: id,
        details: `Preis "${existing.name}": ${Number(existing.price).toFixed(2)} € → ${body.price.toFixed(2)} €`,
      });
    }
    if (body.available === false && existing.available !== false) {
      await logActivity(req.authUser, "product_deactivated", {
        entityType: "menu_item",
        entityId: id,
        details: `Produkt "${existing.name}" deaktiviert`,
      });
    }

    res.json({ ...row, price: Number(row.price) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/items/:id", async (req, res) => {
  try {
    await db.delete(menuItems).where(eq(menuItems.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── VARIANTS ──────────────────────────────────────────────────────────────────
router.get("/admin/items/:id/variants", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const rows = await db
      .select()
      .from(itemVariants)
      .where(eq(itemVariants.menuItemId, menuItemId))
      .orderBy(asc(itemVariants.sortOrder), asc(itemVariants.id));
    res.json(rows.map((v) => ({ ...v, price: Number(v.price) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/items/:id/variants", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const body = req.body as { name: string; price: number; sortOrder?: number };
    const [row] = await db
      .insert(itemVariants)
      .values({
        menuItemId,
        name: body.name,
        price: body.price.toFixed(2),
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json({ ...row, price: Number(row!.price) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/variants/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as Partial<{ name: string; price: number; sortOrder: number }>;
    const update: Record<string, unknown> = { ...body };
    if (body.price !== undefined) update["price"] = body.price.toFixed(2);
    const [row] = await db
      .update(itemVariants)
      .set(update)
      .where(eq(itemVariants.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, price: Number(row.price) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/variants/:id", async (req, res) => {
  try {
    await db.delete(itemVariants).where(eq(itemVariants.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── EXTRAS ────────────────────────────────────────────────────────────────────
router.get("/admin/items/:id/extras", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const rows = await db
      .select()
      .from(itemExtras)
      .where(eq(itemExtras.menuItemId, menuItemId))
      .orderBy(asc(itemExtras.sortOrder), asc(itemExtras.id));
    res.json(rows.map((e) => ({ ...e, price: Number(e.price) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/items/:id/extras", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const body = req.body as { name: string; price?: number; available?: boolean; sortOrder?: number };
    const [row] = await db
      .insert(itemExtras)
      .values({
        menuItemId,
        name: body.name,
        price: (body.price ?? 0).toFixed(2),
        available: body.available ?? true,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json({ ...row, price: Number(row!.price) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/extras/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as Partial<{ name: string; price: number; available: boolean; sortOrder: number }>;
    const update: Record<string, unknown> = { ...body };
    if (body.price !== undefined) update["price"] = body.price.toFixed(2);
    const [row] = await db
      .update(itemExtras)
      .set(update)
      .where(eq(itemExtras.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, price: Number(row.price) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/extras/:id", async (req, res) => {
  try {
    await db.delete(itemExtras).where(eq(itemExtras.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── OPTION GROUPS ─────────────────────────────────────────────────────────────
async function serializeOptionGroup(
  group: typeof optionGroups.$inferSelect,
  items: Array<typeof optionItems.$inferSelect>,
  linkedCatIds: number[],
  linkedItemIds: number[] = [],
) {
  return {
    ...group,
    items: items.map((i) => ({ ...i, defaultPrice: Number(i.defaultPrice) })),
    linkedCategoryIds: linkedCatIds,
    linkedItemIds,
  };
}

router.get("/admin/option-groups", async (req, res) => {
  try {
    const groups = await db.select().from(optionGroups).orderBy(asc(optionGroups.sortOrder), asc(optionGroups.id));
    if (groups.length === 0) return res.json([]);
    const groupIds = groups.map((g) => g.id);
    const allItems = await db.select().from(optionItems).where(inArray(optionItems.groupId, groupIds)).orderBy(asc(optionItems.sortOrder));
    const catLinks = await db.select().from(categoryOptionGroups);
    const itemLinks = await db.select().from(itemOptionGroups);
    const opItemsMap = new Map<number, typeof allItems>();
    for (const i of allItems) { const arr = opItemsMap.get(i.groupId) ?? []; arr.push(i); opItemsMap.set(i.groupId, arr); }
    const linkedCatMap = new Map<number, number[]>();
    for (const l of catLinks) { const arr = linkedCatMap.get(l.groupId) ?? []; arr.push(l.categoryId); linkedCatMap.set(l.groupId, arr); }
    const linkedItemMap = new Map<number, number[]>();
    for (const l of itemLinks) { const arr = linkedItemMap.get(l.groupId) ?? []; arr.push(l.menuItemId); linkedItemMap.set(l.groupId, arr); }
    const result = await Promise.all(groups.map((g) =>
      serializeOptionGroup(g, opItemsMap.get(g.id) ?? [], linkedCatMap.get(g.id) ?? [], linkedItemMap.get(g.id) ?? [])
    ));
    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/option-groups", async (req, res) => {
  try {
    const { name, slug, description, inputType, required, priceType, minSelections, maxSelections, sortOrder } = req.body as {
      name: string; slug: string; description?: string; inputType: string;
      required: boolean; priceType: string; minSelections?: number; maxSelections?: number; sortOrder?: number;
    };
    const [group] = await db.insert(optionGroups).values({
      name, slug, description, inputType, required, priceType,
      minSelections: minSelections ?? 0,
      maxSelections: maxSelections ?? null,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(await serializeOptionGroup(group!, [], [], []));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/option-groups/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const update: Record<string, unknown> = { ...req.body };
    const [group] = await db.update(optionGroups).set(update).where(eq(optionGroups.id, id)).returning();
    if (!group) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(optionItems).where(eq(optionItems.groupId, id)).orderBy(asc(optionItems.sortOrder));
    const catLinks = await db.select().from(categoryOptionGroups).where(eq(categoryOptionGroups.groupId, id));
    const itemLinks = await db.select().from(itemOptionGroups).where(eq(itemOptionGroups.groupId, id));
    res.json(await serializeOptionGroup(group, items, catLinks.map((l) => l.categoryId), itemLinks.map((l) => l.menuItemId)));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/option-groups/:id", async (req, res) => {
  try {
    await db.delete(optionGroups).where(eq(optionGroups.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/option-groups/:id/items", async (req, res) => {
  try {
    const groupId = Number(req.params["id"]);
    const { name, defaultPrice, priceByVariant, imageUrl, sortOrder, available } = req.body as {
      name: string; defaultPrice?: number; priceByVariant?: Record<string, number>;
      imageUrl?: string; sortOrder?: number; available?: boolean;
    };
    const [item] = await db.insert(optionItems).values({
      groupId, name, defaultPrice: String(defaultPrice ?? 0),
      priceByVariant: priceByVariant ?? null, imageUrl: imageUrl ?? null,
      sortOrder: sortOrder ?? 0, available: available ?? true,
    }).returning();
    res.status(201).json({ ...item, defaultPrice: Number(item!.defaultPrice) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/option-items/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const update: Record<string, unknown> = { ...req.body };
    if (update["defaultPrice"] !== undefined) update["defaultPrice"] = String(update["defaultPrice"]);
    const [item] = await db.update(optionItems).set(update).where(eq(optionItems.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ ...item, defaultPrice: Number(item.defaultPrice) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/option-items/:id", async (req, res) => {
  try {
    await db.delete(optionItems).where(eq(optionItems.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/option-groups/:id/categories", async (req, res) => {
  try {
    const groupId = Number(req.params["id"]);
    const { categoryId, sortOrder } = req.body as { categoryId: number; sortOrder?: number };
    await db.insert(categoryOptionGroups).values({ groupId, categoryId, sortOrder: sortOrder ?? 0 }).onConflictDoNothing();
    res.status(201).json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/category-option-groups/:id", async (req, res) => {
  try {
    await db.delete(categoryOptionGroups).where(eq(categoryOptionGroups.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/option-groups/:groupId/categories/:categoryId", async (req, res) => {
  try {
    const groupId = Number(req.params["groupId"]);
    const categoryId = Number(req.params["categoryId"]);
    await db.delete(categoryOptionGroups).where(
      and(eq(categoryOptionGroups.groupId, groupId), eq(categoryOptionGroups.categoryId, categoryId))
    );
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ── ITEM-LEVEL OPTION GROUP LINKING ───────────────────────────────────────────
router.post("/admin/option-groups/:id/menu-items", async (req, res) => {
  try {
    const groupId = Number(req.params["id"]);
    const { menuItemId, sortOrder } = req.body as { menuItemId: number; sortOrder?: number };
    await db.insert(itemOptionGroups).values({ groupId, menuItemId, sortOrder: sortOrder ?? 0 }).onConflictDoNothing();
    res.status(201).json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/option-groups/:groupId/menu-items/:menuItemId", async (req, res) => {
  try {
    const groupId = Number(req.params["groupId"]);
    const menuItemId = Number(req.params["menuItemId"]);
    await db.delete(itemOptionGroups).where(
      and(eq(itemOptionGroups.groupId, groupId), eq(itemOptionGroups.menuItemId, menuItemId))
    );
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ── BULK SORT: Categories + Items ──────────────────────────────────────────────
router.patch("/admin/categories/sort", async (req, res) => {
  try {
    const { ids } = req.body as { ids: number[] };
    await Promise.all(ids.map((id, idx) => db.update(categories).set({ sortOrder: idx }).where(eq(categories.id, id))));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/items/sort", async (req, res) => {
  try {
    const { ids } = req.body as { ids: number[] };
    await Promise.all(ids.map((id, idx) => db.update(menuItems).set({ sortOrder: idx }).where(eq(menuItems.id, id))));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/items/:id/option-prices", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const prices = await db.select().from(itemOptionPrices).where(eq(itemOptionPrices.menuItemId, menuItemId));
    res.json(prices.map((p) => ({ ...p, price: Number(p.price) })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/items/:id/option-prices", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const { prices } = req.body as { prices: Array<{ optionItemId: number; price: number }> };
    for (const p of prices) {
      await db.insert(itemOptionPrices).values({ menuItemId, optionItemId: p.optionItemId, price: String(p.price) })
        .onConflictDoUpdate({ target: [itemOptionPrices.menuItemId, itemOptionPrices.optionItemId], set: { price: String(p.price) } });
    }
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
router.get("/admin/orders", requirePermission("orders.view"), async (req, res) => {
  try {
    const { status, orderType, date, archived } = req.query as { status?: string; orderType?: string; date?: string; archived?: string };
    const wantArchived = archived === "true" || archived === "1";
    let allOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
    });
    // Archived orders are hidden from the normal list; only shown when explicitly requested.
    allOrders = allOrders.filter((o) => (wantArchived ? o.archivedAt !== null : o.archivedAt === null));
    if (status) allOrders = allOrders.filter((o) => o.status === status);
    if (orderType) allOrders = allOrders.filter((o) => o.orderType === orderType);
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      allOrders = allOrders.filter((o) => o.createdAt >= d && o.createdAt < next);
    }
    const ids = allOrders.map((o) => o.id);
    const allItems = ids.length > 0 ? await db.select().from(orderItems).where(
      sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`
    ) : [];
    const itemsByOrder = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const existing = itemsByOrder.get(item.orderId) ?? [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }
    res.json(allOrders.map((o) => serializeOrder(o, itemsByOrder.get(o.id) ?? [])));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/orders/:id", requirePermission("orders.view"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const order = await db.query.orders.findFirst({ where: (o, { eq: eqFn }) => eqFn(o.id, id) });
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    res.json(serializeOrder(order, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/orders/:id", requirePermission("orders.status.update"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { status, notes } = req.body as { status: string; notes?: string };
    const update: Record<string, unknown> = {};
    if (status) update["status"] = status;
    if (notes !== undefined) update["notes"] = notes;
    const [order] = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    res.json(serializeOrder(order, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Archive a completed or cancelled order (hidden from the normal list).
router.post("/admin/orders/:id/archive", requirePermission("orders.archiveDelete"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const existing = await db.query.orders.findFirst({ where: (o, { eq: eqFn }) => eqFn(o.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== "completed" && existing.status !== "cancelled") {
      return res.status(400).json({ error: "Only completed or cancelled orders can be archived" });
    }
    const [order] = await db.update(orders).set({ archivedAt: new Date() }).where(eq(orders.id, id)).returning();
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    res.json(serializeOrder(order!, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Restore an archived order back to the active list.
router.post("/admin/orders/:id/restore", requirePermission("orders.archiveDelete"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [order] = await db.update(orders).set({ archivedAt: null }).where(eq(orders.id, id)).returning();
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    res.json(serializeOrder(order, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Permanently delete an order (with optional reason). Removes it from all lists/stats,
// keeping only an audit record in the deletion log.
router.post("/admin/orders/:id/delete", requirePermission("orders.archiveDelete"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { reason } = (req.body ?? {}) as { reason?: string };
    const existing = await db.query.orders.findFirst({ where: (o, { eq: eqFn }) => eqFn(o.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const deletedBy = req.authUser?.username ?? "unknown";
    // Audit log + delete must be atomic so we never log a deletion that did not happen.
    await db.transaction(async (tx) => {
      await tx.insert(orderDeletionLog).values({
        orderNumber: existing.orderNumber,
        customerName: existing.customerName,
        total: existing.total,
        reason: reason && reason.trim().length > 0 ? reason.trim() : null,
        deletedBy,
      });
      // orderItems cascade-delete via FK.
      await tx.delete(orders).where(eq(orders.id, id));
    });
    await logActivity(req.authUser, "order_deleted", {
      entityType: "order",
      entityId: id,
      details: `Bestellung ${existing.orderNumber} gelöscht${
        reason && reason.trim().length > 0 ? ` (Grund: ${reason.trim()})` : ""
      }`,
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
router.get("/admin/customers", async (req, res) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const customerMap = new Map<string, {
      name: string; phone: string; email: string | null;
      orderCount: number; totalSpent: number; lastOrderAt: Date | null;
    }>();
    for (const o of allOrders) {
      const key = o.customerPhone;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: o.customerName,
          phone: o.customerPhone,
          email: o.customerEmail,
          orderCount: 0,
          totalSpent: 0,
          lastOrderAt: null,
        });
      }
      const c = customerMap.get(key)!;
      c.orderCount += 1;
      if (o.status !== "cancelled") c.totalSpent += Number(o.total);
      if (!c.lastOrderAt || o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt;
    }
    res.json([...customerMap.values()]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── CUSTOMER DETAIL ───────────────────────────────────────────────────────────
router.get("/admin/customers/:id", async (req, res) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.createdAt));

    const orderIds = customerOrders.map((o) => o.id);
    const allItems = orderIds.length > 0
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    // Build top items (by count)
    const itemCountMap = new Map<string, number>();
    for (const item of allItems) {
      const key = item.itemName;
      itemCountMap.set(key, (itemCountMap.get(key) ?? 0) + item.quantity);
    }
    const topItems = [...itemCountMap.entries()]
      .map(([itemName, count]) => ({ itemName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalSpent = customerOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0);

    const lastOrder = customerOrders[0];

    const notes = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, id))
      .orderBy(desc(customerNotes.usageCount));

    const favs = await db
      .select()
      .from(favoriteOrders)
      .where(eq(favoriteOrders.customerId, id))
      .orderBy(desc(favoriteOrders.createdAt));

    // Serialize orders with items
    const orderItemsMap = new Map<number, typeof allItems>();
    for (const item of allItems) {
      if (!orderItemsMap.has(item.orderId)) orderItemsMap.set(item.orderId, []);
      orderItemsMap.get(item.orderId)!.push(item);
    }

    const serializedOrders = customerOrders.map((o) => {
      const items = (orderItemsMap.get(o.id) ?? []).map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        itemPrice: Number(i.itemPrice),
        lineTotal: Number(i.lineTotal),
        variantName: i.variantName,
        optionsSnapshot: i.optionsSnapshot,
      }));
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        orderType: o.orderType,
        status: o.status,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        createdAt: o.createdAt,
        items,
      };
    });

    res.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName ?? "",
      phone: customer.phone ?? "",
      createdAt: customer.createdAt,
      orderCount: customerOrders.length,
      totalSpent,
      lastOrderAt: lastOrder?.createdAt ?? null,
      topItems,
      notes: notes.map((n) => ({ id: n.id, text: n.text, usageCount: n.usageCount })),
      favorites: favs.map((f) => ({
        id: f.id,
        name: f.name,
        items: f.items as Array<{ menuItemId: number; itemName: string; quantity: number; unitPrice: number; selectedOptions: unknown[] }>,
        createdAt: f.createdAt,
      })),
      orders: serializedOrders,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELIVERY AREAS ────────────────────────────────────────────────────────────
function serializeArea(r: typeof deliveryAreas.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    postalCode: r.postalCode,
    minOrder: Number(r.minOrder),
    deliveryFee: Number(r.deliveryFee),
    deliveryTime: r.deliveryTime ?? "30-45 Min.",
    active: r.active,
  };
}

router.get("/admin/delivery-areas", async (req, res) => {
  try {
    const rows = await db.select().from(deliveryAreas).orderBy(asc(deliveryAreas.name));
    res.json(rows.map(serializeArea));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/delivery-areas", async (req, res) => {
  try {
    const body = req.body as { name: string; postalCode: string; minOrder: number; deliveryFee: number; deliveryTime?: string; active?: boolean };
    const [row] = await db.insert(deliveryAreas).values({
      name: body.name,
      postalCode: body.postalCode,
      minOrder: body.minOrder.toFixed(2),
      deliveryFee: body.deliveryFee.toFixed(2),
      deliveryTime: body.deliveryTime ?? "30-45 Min.",
      active: body.active ?? true,
    }).returning();
    res.status(201).json(serializeArea(row!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/delivery-areas/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as Partial<{ name: string; postalCode: string; minOrder: number; deliveryFee: number; deliveryTime: string; active: boolean }>;
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update["name"] = body.name;
    if (body.postalCode !== undefined) update["postalCode"] = body.postalCode;
    if (body.minOrder !== undefined) update["minOrder"] = body.minOrder.toFixed(2);
    if (body.deliveryFee !== undefined) update["deliveryFee"] = body.deliveryFee.toFixed(2);
    if (body.deliveryTime !== undefined) update["deliveryTime"] = body.deliveryTime;
    if (body.active !== undefined) update["active"] = body.active;
    const [row] = await db.update(deliveryAreas).set(update).where(eq(deliveryAreas.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serializeArea(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/delivery-areas/:id", async (req, res) => {
  try {
    await db.delete(deliveryAreas).where(eq(deliveryAreas.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── OPENING HOURS ─────────────────────────────────────────────────────────────
router.get("/admin/opening-hours", async (req, res) => {
  try {
    const rows = await db.select().from(openingHours).orderBy(asc(openingHours.dayOfWeek));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/opening-hours", async (req, res) => {
  try {
    const { hours } = req.body as { hours: Array<{ dayOfWeek: number; openTime?: string; closeTime?: string; isClosed: boolean }> };
    const updated = [];
    for (const h of hours) {
      const existing = await db.query.openingHours.findFirst({
        where: (r, { eq: eqFn }) => eqFn(r.dayOfWeek, h.dayOfWeek),
      });
      if (existing) {
        const [row] = await db.update(openingHours)
          .set({ openTime: h.openTime ?? null, closeTime: h.closeTime ?? null, isClosed: h.isClosed })
          .where(eq(openingHours.id, existing.id))
          .returning();
        updated.push(row);
      } else {
        const [row] = await db.insert(openingHours).values({
          dayOfWeek: h.dayOfWeek,
          dayName: DAY_NAMES[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`,
          openTime: h.openTime ?? null,
          closeTime: h.closeTime ?? null,
          isClosed: h.isClosed,
        }).returning();
        updated.push(row);
      }
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── COUPONS ───────────────────────────────────────────────────────────────────
router.get("/admin/coupons", async (req, res) => {
  try {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(rows.map((c) => ({ ...c, discountValue: Number(c.discountValue), minOrder: Number(c.minOrder ?? 0) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/coupons", async (req, res) => {
  try {
    const body = req.body as {
      code: string; description?: string; discountType: "percentage" | "fixed";
      discountValue: number; minOrder?: number; active?: boolean; expiresAt?: string; maxUsage?: number;
    };
    const [row] = await db.insert(coupons).values({
      code: body.code.toUpperCase(),
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue.toFixed(2),
      minOrder: body.minOrder ? body.minOrder.toFixed(2) : "0",
      active: body.active ?? true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      maxUsage: body.maxUsage ?? null,
    }).returning();
    await logActivity(req.authUser, "coupon_created", {
      entityType: "coupon",
      entityId: row!.id,
      details: `Gutschein "${row!.code}" erstellt`,
    });
    res.status(201).json({ ...row, discountValue: Number(row!.discountValue), minOrder: Number(row!.minOrder ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/coupons/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as Partial<{
      code: string; description: string; discountType: string;
      discountValue: number; minOrder: number; active: boolean; expiresAt: string; maxUsage: number;
    }>;
    const update: Record<string, unknown> = { ...body };
    if (body.code) update["code"] = body.code.toUpperCase();
    if (body.discountValue !== undefined) update["discountValue"] = body.discountValue.toFixed(2);
    if (body.minOrder !== undefined) update["minOrder"] = body.minOrder.toFixed(2);
    if (body.expiresAt) update["expiresAt"] = new Date(body.expiresAt);
    const [row] = await db.update(coupons).set(update).where(eq(coupons.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, discountValue: Number(row.discountValue), minOrder: Number(row.minOrder ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/coupons/:id", async (req, res) => {
  try {
    await db.delete(coupons).where(eq(coupons.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── INVENTORY ────────────────────────────────────────────────────────────────
function serializeStockItem(si: typeof stockItems.$inferSelect) {
  return {
    id: si.id,
    menuItemId: si.menuItemId ?? null,
    name: si.name,
    category: si.category ?? null,
    currentStock: Number(si.currentStock),
    minStock: Number(si.minStock),
    unit: si.unit,
    purchasePrice: si.purchasePrice === null ? null : Number(si.purchasePrice),
    supplier: si.supplier ?? null,
    active: si.active,
    trackStock: si.trackStock,
    isLow: Number(si.currentStock) <= Number(si.minStock),
    createdAt: si.createdAt,
    updatedAt: si.updatedAt,
  };
}

function serializeStockMovement(sm: typeof stockMovements.$inferSelect) {
  return {
    id: sm.id,
    stockItemId: sm.stockItemId ?? null,
    menuItemId: sm.menuItemId ?? null,
    itemName: sm.itemName,
    movementType: sm.movementType,
    quantity: Number(sm.quantity),
    previousStock: Number(sm.previousStock),
    newStock: Number(sm.newStock),
    orderId: sm.orderId ?? null,
    notes: sm.notes ?? null,
    createdAt: sm.createdAt,
  };
}

router.get("/admin/inventory", async (req, res) => {
  try {
    const items = await db.select().from(stockItems).orderBy(asc(stockItems.name));
    res.json(items.map(serializeStockItem));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/inventory", async (req, res) => {
  try {
    const body = req.body as { menuItemId?: number; name: string; category?: string; currentStock?: number; minStock?: number; unit?: string; purchasePrice?: number; supplier?: string; active?: boolean; trackStock?: boolean };
    if (!body.name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
    const [si] = await db.insert(stockItems).values({
      menuItemId: body.menuItemId ?? null,
      name: body.name.trim(),
      category: body.category?.trim() || null,
      currentStock: (body.currentStock ?? 0).toFixed(2),
      minStock: (body.minStock ?? 5).toFixed(2),
      unit: body.unit ?? "Stück",
      purchasePrice: body.purchasePrice === undefined || body.purchasePrice === null ? null : body.purchasePrice.toFixed(2),
      supplier: body.supplier?.trim() || null,
      active: body.active ?? true,
      trackStock: body.trackStock ?? true,
    }).returning();
    res.status(201).json(serializeStockItem(si!));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as { name?: string; category?: string | null; currentStock?: number; minStock?: number; unit?: string; purchasePrice?: number | null; supplier?: string | null; active?: boolean; trackStock?: boolean };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) update["name"] = body.name;
    if (body.category !== undefined) update["category"] = body.category?.trim() || null;
    if (body.currentStock !== undefined) update["currentStock"] = body.currentStock.toFixed(2);
    if (body.minStock !== undefined) update["minStock"] = body.minStock.toFixed(2);
    if (body.unit !== undefined) update["unit"] = body.unit;
    if (body.purchasePrice !== undefined) update["purchasePrice"] = body.purchasePrice === null ? null : body.purchasePrice.toFixed(2);
    if (body.supplier !== undefined) update["supplier"] = body.supplier?.trim() || null;
    if (body.active !== undefined) update["active"] = body.active;
    if (body.trackStock !== undefined) update["trackStock"] = body.trackStock;
    const [si] = await db.update(stockItems).set(update).where(eq(stockItems.id, id)).returning();
    if (!si) { res.status(404).json({ error: "Not found" }); return; }
    res.json(serializeStockItem(si));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/inventory/:id", async (req, res) => {
  try {
    await db.delete(stockItems).where(eq(stockItems.id, Number(req.params["id"])));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/inventory/movements", async (req, res) => {
  try {
    const { stockItemId, limit } = req.query as { stockItemId?: string; limit?: string };
    let q = db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).$dynamic();
    if (stockItemId) q = q.where(eq(stockMovements.stockItemId, Number(stockItemId)));
    const rows = await q.limit(Number(limit ?? 200));
    res.json(rows.map(serializeStockMovement));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/inventory/movements", async (req, res) => {
  try {
    const body = req.body as { stockItemId: number; movementType: "restock" | "correction" | "loss" | "consumption" | "cancellation"; quantity: number; notes?: string };
    if (!body.stockItemId || !body.movementType || body.quantity === undefined) {
      res.status(400).json({ error: "stockItemId, movementType, quantity required" }); return;
    }
    const si = await db.query.stockItems.findFirst({ where: (s, { eq: eqFn }) => eqFn(s.id, body.stockItemId) });
    if (!si) { res.status(404).json({ error: "Stock item not found" }); return; }

    const prev = Number(si.currentStock);
    const delta = body.movementType === "restock" || body.movementType === "cancellation"
      ? Math.abs(body.quantity)
      : body.movementType === "loss" || body.movementType === "consumption"
      ? -Math.abs(body.quantity)
      : body.quantity;
    const next = prev + delta;

    await db.update(stockItems).set({ currentStock: next.toFixed(2), updatedAt: new Date() }).where(eq(stockItems.id, si.id));
    const [sm] = await db.insert(stockMovements).values({
      stockItemId: si.id, menuItemId: si.menuItemId, itemName: si.name,
      movementType: body.movementType, quantity: delta.toFixed(2),
      previousStock: prev.toFixed(2), newStock: next.toFixed(2), notes: body.notes ?? null,
    }).returning();
    res.status(201).json(serializeStockMovement(sm!));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ── RECIPES (Rezepturen pro Produkt) ──────────────────────────────────────────
// Gated über das /admin/items-Prefix (products.manage).
function serializeRecipeLine(r: typeof recipes.$inferSelect, si?: typeof stockItems.$inferSelect) {
  return {
    id: r.id,
    menuItemId: r.menuItemId,
    stockItemId: r.stockItemId,
    quantity: Number(r.quantity),
    stockItemName: si?.name ?? null,
    unit: si?.unit ?? null,
  };
}

router.get("/admin/items/:id/recipe", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const rows = await db.select().from(recipes).where(eq(recipes.menuItemId, menuItemId));
    const siIds = rows.map((r) => r.stockItemId);
    const sis = siIds.length > 0 ? await db.select().from(stockItems).where(inArray(stockItems.id, siIds)) : [];
    const siMap = new Map(sis.map((s) => [s.id, s]));
    res.json(rows.map((r) => serializeRecipeLine(r, siMap.get(r.stockItemId))));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Ersetzt die komplette Rezeptur eines Produkts.
router.put("/admin/items/:id/recipe", async (req, res) => {
  try {
    const menuItemId = Number(req.params["id"]);
    const body = req.body as { lines: Array<{ stockItemId: number; quantity: number }> };
    if (!Array.isArray(body.lines)) { res.status(400).json({ error: "lines array required" }); return; }

    const menuItem = await db.query.menuItems.findFirst({ where: (m, { eq: eqFn }) => eqFn(m.id, menuItemId) });
    if (!menuItem) { res.status(404).json({ error: "Menu item not found" }); return; }

    // Eindeutige, gültige Zeilen (eine Zutat nur einmal pro Rezeptur).
    const seen = new Set<number>();
    const clean = body.lines
      .filter((l) => Number.isFinite(l.stockItemId) && Number.isFinite(l.quantity) && l.quantity > 0)
      .filter((l) => (seen.has(l.stockItemId) ? false : (seen.add(l.stockItemId), true)));

    await db.delete(recipes).where(eq(recipes.menuItemId, menuItemId));
    if (clean.length > 0) {
      await db.insert(recipes).values(clean.map((l) => ({ menuItemId, stockItemId: l.stockItemId, quantity: l.quantity.toFixed(2) })));
    }

    const rows = await db.select().from(recipes).where(eq(recipes.menuItemId, menuItemId));
    const siIds = rows.map((r) => r.stockItemId);
    const sis = siIds.length > 0 ? await db.select().from(stockItems).where(inArray(stockItems.id, siIds)) : [];
    const siMap = new Map(sis.map((s) => [s.id, s]));
    res.json(rows.map((r) => serializeRecipeLine(r, siMap.get(r.stockItemId))));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ── QUICK ORDER ───────────────────────────────────────────────────────────────
router.post("/admin/quick-order", async (req, res) => {
  try {
    const body = req.body as {
      source: "phone" | "lieferando" | "takeaway" | "dine_in";
      orderType: "delivery" | "pickup";
      customerName: string; customerPhone: string; customerEmail?: string;
      deliveryAddress?: string; postalCode?: string; city?: string;
      notes?: string; tableInfo?: string; paymentMethod?: "cash" | "ec" | "paypal" | "lieferando";
      couponCode?: string;
      items: Array<{ menuItemId: number; quantity: number; variantId?: number; selectedExtras?: Array<{ name: string; price: number }>; selectedOptions?: Array<{ groupId: number; optionItemId: number; price: number }> }>;
    };

    if (!body.items?.length) return res.status(400).json({ error: "At least one item required" });
    if (!body.customerName || !body.customerPhone) return res.status(400).json({ error: "Customer name and phone required" });

    const itemIds = body.items.map((i) => i.menuItemId);
    const dbMenuItems = await db.query.menuItems.findMany({ with: { variants: true }, where: (item, { inArray: inArr }) => inArr(item.id, itemIds) });

    const allOptionItemIds = body.items.flatMap((i) => (i.selectedOptions ?? []).map((o) => o.optionItemId));
    const allGroupIds = body.items.flatMap((i) => (i.selectedOptions ?? []).map((o) => o.groupId));
    const dbOI = allOptionItemIds.length > 0 ? await db.select().from(optionItems).where(inArray(optionItems.id, allOptionItemIds)) : [];
    const dbOG = allGroupIds.length > 0 ? await db.select().from(optionGroups).where(inArray(optionGroups.id, allGroupIds)) : [];
    const oiMap = new Map(dbOI.map((i) => [i.id, i]));
    const ogMap = new Map(dbOG.map((g) => [g.id, g]));
    const itemMap = new Map(dbMenuItems.map((i) => [i.id, i]));

    let subtotal = 0;
    const resolvedItems: Array<{ menuItemId: number; itemName: string; itemPrice: number; quantity: number; lineTotal: number; variantName: string | null; extrasSnapshot: Array<{ name: string; price: number }>; optionsSnapshot: Array<{ groupId: number; groupName: string; optionItemId: number; optionItemName: string; price: number }> }> = [];

    for (const ordered of body.items) {
      const dbItem = itemMap.get(ordered.menuItemId);
      if (!dbItem) { res.status(400).json({ error: `Item ${ordered.menuItemId} not found` }); return; }
      let price = Number(dbItem.price);
      let variantName: string | null = null;
      const extras = ordered.selectedExtras ?? [];
      const optionsSel = ordered.selectedOptions ?? [];
      if (optionsSel.length > 0) {
        const absOpt = optionsSel.find((o) => ogMap.get(o.groupId)?.priceType === "absolute");
        if (absOpt) { price = absOpt.price; const ai = oiMap.get(absOpt.optionItemId); if (ai) variantName = ai.name; }
        price += optionsSel.filter((o) => ogMap.get(o.groupId)?.priceType === "additive").reduce((s, o) => s + o.price, 0);
      } else if (ordered.variantId) {
        const v = dbItem.variants.find((vv) => vv.id === ordered.variantId);
        if (v) { price = Number(v.price); variantName = v.name; }
      } else if (dbItem.variants.length > 0) {
        const sorted = [...dbItem.variants].sort((a, b) => a.sortOrder - b.sortOrder);
        price = Number(sorted[0]!.price); variantName = sorted[0]!.name;
      }
      const unitPrice = price + extras.reduce((s, e) => s + e.price, 0);
      const lineTotal = unitPrice * ordered.quantity;
      subtotal += lineTotal;
      resolvedItems.push({ menuItemId: ordered.menuItemId, itemName: dbItem.name, itemPrice: unitPrice, quantity: ordered.quantity, lineTotal, variantName, extrasSnapshot: extras, optionsSnapshot: optionsSel.map((o) => ({ groupId: o.groupId, groupName: ogMap.get(o.groupId)?.name ?? "", optionItemId: o.optionItemId, optionItemName: oiMap.get(o.optionItemId)?.name ?? "", price: o.price })) });
    }

    let discountAmount = 0; let usedCouponCode: string | null = null;
    if (body.couponCode) {
      const coupon = await db.query.coupons.findFirst({ where: (c, { eq: eqFn, and: andFn }) => andFn(eqFn(c.code, body.couponCode!.toUpperCase()), eqFn(c.active, true)) });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        discountAmount = coupon.discountType === "percentage" ? subtotal * (Number(coupon.discountValue) / 100) : Math.min(Number(coupon.discountValue), subtotal);
        usedCouponCode = coupon.code;
        await db.update(coupons).set({ usageCount: coupon.usageCount + 1 }).where(eq(coupons.id, coupon.id));
      }
    }

    const total = subtotal - discountAmount;
    const now = new Date();
    const orderNumber = `MCB-${now.toISOString().slice(0,10).replace(/-/g,"")}${Math.floor(Math.random()*9000)+1000}`;

    const [order] = await db.insert(orders).values({
      orderNumber, orderType: body.orderType, source: body.source,
      tableInfo: body.tableInfo ?? null, customerName: body.customerName,
      customerPhone: body.customerPhone, customerEmail: body.customerEmail ?? null,
      deliveryAddress: body.deliveryAddress ?? null, postalCode: body.postalCode ?? null,
      city: body.city ?? null, notes: body.notes ?? null,
      paymentMethod: body.paymentMethod ?? "cash",
      subtotal: subtotal.toFixed(2), deliveryFee: "0.00",
      discountAmount: discountAmount.toFixed(2), total: total.toFixed(2), couponCode: usedCouponCode,
    }).returning();
    if (!order) return res.status(500).json({ error: "Failed to create order" });

    const insertedItems = await db.insert(orderItems).values(
      resolvedItems.map((i) => ({ orderId: order.id, menuItemId: i.menuItemId, itemName: i.itemName, itemPrice: i.itemPrice.toFixed(2), quantity: i.quantity, lineTotal: i.lineTotal.toFixed(2), variantName: i.variantName, extrasSnapshot: i.extrasSnapshot.length > 0 ? i.extrasSnapshot : null, optionsSnapshot: i.optionsSnapshot.length > 0 ? i.optionsSnapshot : null }))
    ).returning();

    await deductStockForOrder(
      order.id,
      resolvedItems.map((ri) => ({ menuItemId: ri.menuItemId, itemName: ri.itemName, quantity: ri.quantity })),
      req.log,
    );

    res.status(201).json(serializeOrder(order, insertedItems));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ── SETTINGS ─────────────────────────────────────────────────────────────────
router.get("/admin/settings", async (req, res) => {
  try {
    const rows = await db.select().from(settings);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    res.json({
      restaurantName: map.get("restaurantName") ?? "May Chicken & Burger",
      tagline: map.get("tagline") ?? "",
      address: map.get("address") ?? "",
      phone: map.get("phone") ?? "",
      email: map.get("email") ?? "",
      deliveryEnabled: map.get("deliveryEnabled") !== "false",
      pickupEnabled: map.get("pickupEnabled") !== "false",
      minDeliveryOrder: Number(map.get("minDeliveryOrder") ?? 15),
      estimatedDeliveryTime: Number(map.get("estimatedDeliveryTime") ?? 30),
      estimatedPickupTime: Number(map.get("estimatedPickupTime") ?? 15),
      adminUsername: map.get("adminUsername") ?? "admin",
      adminPassword: "",
      ordersAutoArchiveEnabled: map.get("ordersAutoArchiveEnabled") === "true",
      ordersAutoArchiveMonths: Number(map.get("ordersAutoArchiveMonths") ?? 6),
      ordersArchiveAutoDeleteEnabled: map.get("ordersArchiveAutoDeleteEnabled") === "true",
      ordersArchiveAutoDeleteYears: Number(map.get("ordersArchiveAutoDeleteYears") ?? 2),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/settings", async (req, res) => {
  try {
    const body = req.body as {
      restaurantName?: string; tagline?: string; address?: string; phone?: string; email?: string;
      deliveryEnabled?: boolean; pickupEnabled?: boolean; minDeliveryOrder?: number;
      estimatedDeliveryTime?: number; estimatedPickupTime?: number;
      adminUsername?: string; adminPassword?: string;
      ordersAutoArchiveEnabled?: boolean; ordersAutoArchiveMonths?: number;
      ordersArchiveAutoDeleteEnabled?: boolean; ordersArchiveAutoDeleteYears?: number;
    };

    const upsert = async (key: string, value: string) => {
      const existing = await db.query.settings.findFirst({ where: (s, { eq: eqFn }) => eqFn(s.key, key) });
      if (existing) {
        await db.update(settings).set({ value }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    };

    if (body.restaurantName !== undefined) await upsert("restaurantName", body.restaurantName);
    if (body.tagline !== undefined) await upsert("tagline", body.tagline);
    if (body.address !== undefined) await upsert("address", body.address);
    if (body.phone !== undefined) await upsert("phone", body.phone);
    if (body.email !== undefined) await upsert("email", body.email);
    if (body.deliveryEnabled !== undefined) await upsert("deliveryEnabled", String(body.deliveryEnabled));
    if (body.pickupEnabled !== undefined) await upsert("pickupEnabled", String(body.pickupEnabled));
    if (body.minDeliveryOrder !== undefined) await upsert("minDeliveryOrder", String(body.minDeliveryOrder));
    if (body.estimatedDeliveryTime !== undefined) await upsert("estimatedDeliveryTime", String(body.estimatedDeliveryTime));
    if (body.estimatedPickupTime !== undefined) await upsert("estimatedPickupTime", String(body.estimatedPickupTime));
    if (body.adminUsername !== undefined) await upsert("adminUsername", body.adminUsername);
    if (body.adminPassword && body.adminPassword.length > 0) {
      const hash = await bcrypt.hash(body.adminPassword, 10);
      await upsert("adminPasswordHash", hash);
    }
    if (body.ordersAutoArchiveEnabled !== undefined) await upsert("ordersAutoArchiveEnabled", String(body.ordersAutoArchiveEnabled));
    if (body.ordersAutoArchiveMonths !== undefined) await upsert("ordersAutoArchiveMonths", String(body.ordersAutoArchiveMonths));
    if (body.ordersArchiveAutoDeleteEnabled !== undefined) await upsert("ordersArchiveAutoDeleteEnabled", String(body.ordersArchiveAutoDeleteEnabled));
    if (body.ordersArchiveAutoDeleteYears !== undefined) await upsert("ordersArchiveAutoDeleteYears", String(body.ordersArchiveAutoDeleteYears));

    const rows = await db.select().from(settings);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    res.json({
      restaurantName: map.get("restaurantName") ?? "May Chicken & Burger",
      tagline: map.get("tagline") ?? "",
      address: map.get("address") ?? "",
      phone: map.get("phone") ?? "",
      email: map.get("email") ?? "",
      deliveryEnabled: map.get("deliveryEnabled") !== "false",
      pickupEnabled: map.get("pickupEnabled") !== "false",
      minDeliveryOrder: Number(map.get("minDeliveryOrder") ?? 15),
      estimatedDeliveryTime: Number(map.get("estimatedDeliveryTime") ?? 30),
      estimatedPickupTime: Number(map.get("estimatedPickupTime") ?? 15),
      adminUsername: map.get("adminUsername") ?? "admin",
      adminPassword: "",
      ordersAutoArchiveEnabled: map.get("ordersAutoArchiveEnabled") === "true",
      ordersAutoArchiveMonths: Number(map.get("ordersAutoArchiveMonths") ?? 6),
      ordersArchiveAutoDeleteEnabled: map.get("ordersArchiveAutoDeleteEnabled") === "true",
      ordersArchiveAutoDeleteYears: Number(map.get("ordersArchiveAutoDeleteYears") ?? 2),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
