import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { orders, orderItems } from "@workspace/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth";
import { serializeOrder } from "./orders";

const router: IRouter = Router();

// Statuses a driver can set, and the statuses that keep an order in the queue.
const DRIVER_SETTABLE = ["delivering", "completed"] as const;
type DriverStatus = (typeof DRIVER_SETTABLE)[number];
const QUEUE_STATUSES = ["ready", "delivering"] as const;

router.use("/admin/driver", requireAuth);

// Active delivery orders only — pickups are never shown to drivers, and only
// orders that are ready to go out or already on the way appear in the queue.
router.get(
  "/admin/driver/orders",
  requirePermission("driver.orders.view"),
  async (req, res) => {
    try {
      const rows = await db.query.orders.findMany({
        where: (o, { and: andF, eq: eqF, inArray: inArrayF, isNull: isNullF }) =>
          andF(
            eqF(o.orderType, "delivery"),
            inArrayF(o.status, [...QUEUE_STATUSES]),
            isNullF(o.archivedAt),
          ),
        orderBy: (o, { asc: ascF }) => [ascF(o.createdAt)],
      });

      const ids = rows.map((o) => o.id);
      const items = ids.length
        ? await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, ids))
        : [];
      const byOrder = new Map<number, typeof items>();
      for (const it of items) {
        const list = byOrder.get(it.orderId) ?? [];
        list.push(it);
        byOrder.set(it.orderId, list);
      }

      res.json(rows.map((o) => serializeOrder(o, byOrder.get(o.id) ?? [])));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Drivers may only move a delivery order to "delivering" or "completed".
router.patch(
  "/admin/driver/orders/:id/status",
  requirePermission("driver.status.update"),
  async (req, res) => {
    try {
      const id = Number(req.params["id"]);
      const { status } = (req.body ?? {}) as { status?: unknown };
      if (
        typeof status !== "string" ||
        !DRIVER_SETTABLE.includes(status as DriverStatus)
      ) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const nextStatus = status as DriverStatus;

      // The only legal forward transitions a driver can perform.
      const allowedFrom: Record<DriverStatus, string> = {
        delivering: "ready",
        completed: "delivering",
      };

      const existing = await db.query.orders.findFirst({
        where: (o, { eq: eqF }) => eqF(o.id, id),
      });
      // Drivers may only act on active (non-archived) delivery orders that are
      // currently in the queue. Anything else is treated as not found / illegal.
      if (
        !existing ||
        existing.orderType !== "delivery" ||
        existing.archivedAt !== null
      ) {
        return res.status(404).json({ error: "Not found" });
      }
      if (existing.status !== allowedFrom[nextStatus]) {
        return res.status(409).json({ error: "Invalid status transition" });
      }

      // Re-check the source status in the WHERE clause to avoid races.
      const [order] = await db
        .update(orders)
        .set({ status: nextStatus })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.orderType, "delivery"),
            eq(orders.status, allowedFrom[nextStatus]),
            isNull(orders.archivedAt),
          ),
        )
        .returning();
      if (!order) {
        return res.status(409).json({ error: "Invalid status transition" });
      }
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));
      res.json(serializeOrder(order, items));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
