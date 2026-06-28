import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderItems, paymentMethodSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import { serializeOrder } from "./orders";

const router = Router();

// ── DEFAULT SEED (if table is empty) ──────────────────────────────────────────

const DEFAULTS = [
  { key: "cash",        label: "Bar",                 isActive: true,  forDelivery: true,  forPickup: true,  onlineVisible: true,  adminVisible: true,  sortOrder: 1 },
  { key: "ec_pickup",   label: "EC bei Abholung",      isActive: true,  forDelivery: false, forPickup: true,  onlineVisible: true,  adminVisible: true,  sortOrder: 2 },
  { key: "ec_delivery", label: "EC bei Lieferung",     isActive: true,  forDelivery: true,  forPickup: false, onlineVisible: true,  adminVisible: true,  sortOrder: 3 },
  { key: "paypal",      label: "PayPal",              isActive: false, forDelivery: true,  forPickup: true,  onlineVisible: true,  adminVisible: true,  sortOrder: 4 },
  { key: "stripe",      label: "Karte / Stripe",       isActive: false, forDelivery: true,  forPickup: true,  onlineVisible: true,  adminVisible: true,  sortOrder: 5 },
  { key: "lieferando",  label: "Lieferando bezahlt",   isActive: true,  forDelivery: true,  forPickup: false, onlineVisible: false, adminVisible: true,  sortOrder: 6 },
];

async function ensureDefaults() {
  const existing = await db.select().from(paymentMethodSettings);
  if (existing.length === 0) {
    await db.insert(paymentMethodSettings).values(DEFAULTS);
  }
}

// ── PUBLIC ─────────────────────────────────────────────────────────────────────

router.get("/restaurant/payment-methods", async (req, res) => {
  try {
    await ensureDefaults();
    const methods = await db
      .select()
      .from(paymentMethodSettings)
      .orderBy(paymentMethodSettings.sortOrder);
    const active = methods.filter((m) => m.isActive && m.onlineVisible);
    res.json(active);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── ADMIN ──────────────────────────────────────────────────────────────────────

router.get("/admin/payment-methods", requireAdmin, async (req, res) => {
  try {
    await ensureDefaults();
    const methods = await db
      .select()
      .from(paymentMethodSettings)
      .orderBy(paymentMethodSettings.sortOrder);
    res.json(methods);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/payment-methods/:key", requireAdmin, async (req, res) => {
  try {
    const { key } = req.params as { key: string };
    const body = req.body as {
      isActive?: boolean;
      forDelivery?: boolean;
      forPickup?: boolean;
      onlineVisible?: boolean;
      adminVisible?: boolean;
      sortOrder?: number;
    };

    const existing = await db
      .select()
      .from(paymentMethodSettings)
      .where(eq(paymentMethodSettings.key, key));
    if (!existing.length) {
      res.status(404).json({ error: "Payment method not found" });
      return;
    }

    const patch: Partial<typeof paymentMethodSettings.$inferInsert> = {};
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    if (body.forDelivery !== undefined) patch.forDelivery = body.forDelivery;
    if (body.forPickup !== undefined) patch.forPickup = body.forPickup;
    if (body.onlineVisible !== undefined) patch.onlineVisible = body.onlineVisible;
    if (body.adminVisible !== undefined) patch.adminVisible = body.adminVisible;
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(paymentMethodSettings)
      .set(patch)
      .where(eq(paymentMethodSettings.key, key))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/orders/:id/payment-status", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { paymentStatus } = req.body as {
      paymentStatus: "open" | "paid" | "refunded" | "failed";
    };
    if (!["open", "paid", "refunded", "failed"].includes(paymentStatus)) {
      res.status(400).json({ error: "Invalid payment status" });
      return;
    }

    const [order] = await db
      .update(orders)
      .set({ paymentStatus })
      .where(eq(orders.id, id))
      .returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    res.json(serializeOrder(order, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
