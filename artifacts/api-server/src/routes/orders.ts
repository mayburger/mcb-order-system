import { Router } from "express";
import { db } from "@workspace/db";
import {
  orders,
  orderItems,
  menuItems,
  itemVariants,
  deliveryAreas,
  coupons,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSettingsMap } from "./restaurant";

const router = Router();

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `MCB-${date}-${rand}`;
}

function serializeOrder(
  order: typeof orders.$inferSelect,
  items: Array<typeof orderItems.$inferSelect>,
) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    deliveryAddress: order.deliveryAddress,
    postalCode: order.postalCode,
    city: order.city,
    notes: order.notes,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    discountAmount: Number(order.discountAmount),
    total: Number(order.total),
    couponCode: order.couponCode,
    createdAt: order.createdAt,
    items: items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      itemName: i.itemName,
      itemPrice: Number(i.itemPrice),
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
      variantName: i.variantName ?? null,
      extrasSnapshot: (i.extrasSnapshot as Array<{ name: string; price: number }> | null) ?? [],
    })),
  };
}

router.post("/restaurant/coupons/validate", async (req, res) => {
  try {
    const { code, orderTotal } = req.body as { code: string; orderTotal: number };
    const coupon = await db.query.coupons.findFirst({
      where: (c, { eq: eqFn, and: andFn }) =>
        andFn(eqFn(c.code, code.toUpperCase()), eqFn(c.active, true)),
    });

    if (!coupon) return res.status(404).json({ error: "Invalid or expired coupon" });
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      return res.status(404).json({ error: "Coupon has expired" });
    if (coupon.maxUsage !== null && coupon.usageCount >= coupon.maxUsage)
      return res.status(404).json({ error: "Coupon usage limit reached" });
    if (coupon.minOrder && orderTotal < Number(coupon.minOrder))
      return res.status(404).json({ error: `Minimum order €${coupon.minOrder} required` });

    res.json({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minOrder: coupon.minOrder ? Number(coupon.minOrder) : 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/restaurant/orders", async (req, res) => {
  try {
    const body = req.body as {
      orderType: "delivery" | "pickup";
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      deliveryAddress?: string;
      postalCode?: string;
      city?: string;
      notes?: string;
      couponCode?: string;
      items: Array<{
        menuItemId: number;
        quantity: number;
        variantId?: number;
        selectedExtras?: Array<{ name: string; price: number }>;
      }>;
    };

    if (!body.items || body.items.length === 0)
      return res.status(400).json({ error: "At least one item required" });

    if (body.orderType === "delivery" && !body.deliveryAddress)
      return res.status(400).json({ error: "Delivery address required for delivery orders" });

    // Fetch menu items
    const itemIds = body.items.map((i) => i.menuItemId);
    const dbItems = await db.query.menuItems.findMany({
      with: { variants: true },
      where: (item, { inArray }) => inArray(item.id, itemIds),
    });

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));
    let subtotal = 0;
    const resolvedItems: Array<{
      menuItemId: number;
      itemName: string;
      itemPrice: number;
      quantity: number;
      lineTotal: number;
      variantName: string | null;
      extrasSnapshot: Array<{ name: string; price: number }>;
    }> = [];

    for (const ordered of body.items) {
      const dbItem = itemMap.get(ordered.menuItemId);
      if (!dbItem) return res.status(400).json({ error: `Item ${ordered.menuItemId} not found` });
      if (!dbItem.available) return res.status(400).json({ error: `${dbItem.name} is not available` });

      let price = Number(dbItem.price);
      let variantName: string | null = null;

      // Use variant price if a variantId was provided
      if (ordered.variantId) {
        const variant = dbItem.variants.find((v) => v.id === ordered.variantId);
        if (!variant) return res.status(400).json({ error: `Variant ${ordered.variantId} not found for ${dbItem.name}` });
        price = Number(variant.price);
        variantName = variant.name;
      } else if (dbItem.variants.length > 0) {
        // If item has variants but none selected, use the first (cheapest) variant
        const sorted = [...dbItem.variants].sort((a, b) => a.sortOrder - b.sortOrder);
        price = Number(sorted[0]!.price);
        variantName = sorted[0]!.name;
      }

      // Add extras price
      const extras = ordered.selectedExtras ?? [];
      const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
      const unitPrice = price + extrasTotal;
      const lineTotal = unitPrice * ordered.quantity;
      subtotal += lineTotal;

      resolvedItems.push({
        menuItemId: ordered.menuItemId,
        itemName: dbItem.name,
        itemPrice: unitPrice,
        quantity: ordered.quantity,
        lineTotal,
        variantName,
        extrasSnapshot: extras,
      });
    }

    // Delivery fee
    let deliveryFee = 0;
    if (body.orderType === "delivery" && body.postalCode) {
      const area = await db.query.deliveryAreas.findFirst({
        where: (a, { eq: eqFn, and: andFn }) =>
          andFn(eqFn(a.postalCode, body.postalCode!), eqFn(a.active, true)),
      });
      if (area) deliveryFee = Number(area.deliveryFee);
    }

    // Coupon
    let discountAmount = 0;
    let usedCouponCode: string | null = null;
    if (body.couponCode) {
      const coupon = await db.query.coupons.findFirst({
        where: (c, { eq: eqFn, and: andFn }) =>
          andFn(eqFn(c.code, body.couponCode!.toUpperCase()), eqFn(c.active, true)),
      });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        if (coupon.discountType === "percentage") {
          discountAmount = subtotal * (Number(coupon.discountValue) / 100);
        } else {
          discountAmount = Math.min(Number(coupon.discountValue), subtotal);
        }
        usedCouponCode = coupon.code;
        await db
          .update(coupons)
          .set({ usageCount: coupon.usageCount + 1 })
          .where(eq(coupons.id, coupon.id));
      }
    }

    const total = subtotal + deliveryFee - discountAmount;
    const orderNumber = generateOrderNumber();

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        orderType: body.orderType,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail ?? null,
        deliveryAddress: body.deliveryAddress ?? null,
        postalCode: body.postalCode ?? null,
        city: body.city ?? null,
        notes: body.notes ?? null,
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        total: total.toFixed(2),
        couponCode: usedCouponCode,
      })
      .returning();

    if (!order) return res.status(500).json({ error: "Failed to create order" });

    const insertedItems = await db
      .insert(orderItems)
      .values(
        resolvedItems.map((i) => ({
          orderId: order.id,
          menuItemId: i.menuItemId,
          itemName: i.itemName,
          itemPrice: i.itemPrice.toFixed(2),
          quantity: i.quantity,
          lineTotal: i.lineTotal.toFixed(2),
          variantName: i.variantName,
          extrasSnapshot: i.extrasSnapshot.length > 0 ? i.extrasSnapshot : null,
        })),
      )
      .returning();

    res.status(201).json(serializeOrder(order, insertedItems));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/restaurant/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const order = await db.query.orders.findFirst({
      where: (o, { eq: eqFn }) => eqFn(o.id, id),
    });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    res.json(serializeOrder(order, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
export { serializeOrder };
