import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderItems } from "@workspace/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { serializeOrder } from "./orders";

const router = Router();

router.get("/kitchen/orders", async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allOrders = await db.query.orders.findMany({
      where: (o, { gte: gteF }) => gteF(o.createdAt, since),
      orderBy: (o, { asc }) => [asc(o.createdAt)],
    });

    const ids = allOrders.map((o) => o.id);
    const allItems =
      ids.length > 0
        ? await db
            .select()
            .from(orderItems)
            .where(
              sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(
                ids.map((id) => sql`${id}`),
                sql`, `,
              )}]::int[])`,
            )
        : [];

    const itemsByOrder = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const existing = itemsByOrder.get(item.orderId) ?? [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    res.json(
      allOrders.map((o) => serializeOrder(o, itemsByOrder.get(o.id) ?? [])),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/kitchen/orders/:id/status", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { status } = req.body as { status: string };
    const [order] = await db
      .update(orders)
      .set({ status: status as typeof orders.$inferSelect.status })
      .where(eq(orders.id, id))
      .returning();
    if (!order) { res.status(404).json({ error: "Not found" }); return; }
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
