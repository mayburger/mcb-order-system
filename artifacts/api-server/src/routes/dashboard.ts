import { Router } from "express";
import { db } from "@workspace/db";
import {
  orders,
  orderItems,
  customers,
  stockItems,
} from "@workspace/db/schema";
import { requireAuth, requirePermission } from "../middleware/auth";

const router = Router();
router.use("/admin/dashboard", requireAuth, requirePermission("dashboard.view"));

router.get("/admin/dashboard", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(1);
    const ago30 = new Date(todayStart);
    ago30.setDate(ago30.getDate() - 30);

    const [allOrders, allOrderItems, allStockItems, allCustomers] =
      await Promise.all([
        db.select().from(orders),
        db.select().from(orderItems),
        db.select().from(stockItems),
        db.select().from(customers),
      ]);

    const nonCancelled = allOrders.filter((o) => o.status !== "cancelled");
    const todayNonCancelled = nonCancelled.filter(
      (o) => o.createdAt >= todayStart,
    );
    const weekNonCancelled = nonCancelled.filter(
      (o) => o.createdAt >= weekStart,
    );
    const monthNonCancelled = nonCancelled.filter(
      (o) => o.createdAt >= monthStart,
    );

    // Revenue
    const sum = (list: typeof nonCancelled) =>
      list.reduce((s, o) => s + Number(o.total), 0);
    const todayRevenue = sum(todayNonCancelled);
    const weekRevenue = sum(weekNonCancelled);
    const monthRevenue = sum(monthNonCancelled);
    const avgOrderValue =
      todayNonCancelled.length > 0
        ? todayRevenue / todayNonCancelled.length
        : 0;

    // Orders counts
    const openStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "delivering",
    ];
    const pendingCount = allOrders.filter((o) =>
      openStatuses.includes(o.status),
    ).length;
    const completedCount = allOrders.filter(
      (o) => o.status === "completed",
    ).length;
    const cancelledCount = allOrders.filter(
      (o) => o.status === "cancelled",
    ).length;

    // Bestsellers (all time, by qty)
    const itemMap = new Map<string, { qty: number; revenue: number }>();
    for (const item of allOrderItems) {
      const entry = itemMap.get(item.itemName) ?? { qty: 0, revenue: 0 };
      entry.qty += item.quantity;
      entry.revenue += Number(item.lineTotal);
      itemMap.set(item.itemName, entry);
    }
    const bestsellers = [...itemMap.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 8)
      .map(([name, { qty, revenue }]) => ({ name, qty, revenue }));

    // Top extras (from both extrasSnapshot and optionsSnapshot)
    const extrasMap = new Map<string, number>();
    for (const item of allOrderItems) {
      for (const e of item.extrasSnapshot ?? []) {
        extrasMap.set(e.name, (extrasMap.get(e.name) ?? 0) + item.quantity);
      }
      for (const o of item.optionsSnapshot ?? []) {
        extrasMap.set(
          o.optionItemName,
          (extrasMap.get(o.optionItemName) ?? 0) + item.quantity,
        );
      }
    }
    const topExtras = [...extrasMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, qty]) => ({ name, qty }));

    // By source (non-cancelled)
    const sourceMap = new Map<string, { count: number; revenue: number }>();
    for (const o of nonCancelled) {
      const entry = sourceMap.get(o.source) ?? { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += Number(o.total);
      sourceMap.set(o.source, entry);
    }
    const bySource = [...sourceMap.entries()].map(
      ([source, { count, revenue }]) => ({ source, count, revenue }),
    );

    // By payment (non-cancelled)
    const payMap = new Map<string, { count: number; revenue: number }>();
    for (const o of nonCancelled) {
      const entry = payMap.get(o.paymentMethod) ?? { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += Number(o.total);
      payMap.set(o.paymentMethod, entry);
    }
    const byPayment = [...payMap.entries()].map(
      ([method, { count, revenue }]) => ({ method, count, revenue }),
    );

    // Customers
    const newToday = allCustomers.filter(
      (c) => c.createdAt >= todayStart,
    ).length;
    const newThisWeek = allCustomers.filter(
      (c) => c.createdAt >= weekStart,
    ).length;
    const regular = allCustomers.filter((c) => c.isRegular).length;

    // inactive30d: customers with orders but last order > 30 days ago
    const custLastOrder = new Map<number, Date>();
    for (const o of allOrders) {
      if (o.customerId) {
        const last = custLastOrder.get(o.customerId);
        if (!last || o.createdAt > last)
          custLastOrder.set(o.customerId, o.createdAt);
      }
    }
    const inactive30d = allCustomers.filter((c) => {
      const last = custLastOrder.get(c.id);
      return last !== undefined && last < ago30;
    }).length;

    // Stock warnings (items with trackStock=true and currentStock <= minStock)
    const stockWarnings = allStockItems
      .filter(
        (s) => s.trackStock && Number(s.currentStock) <= Number(s.minStock),
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        currentStock: Number(s.currentStock),
        minStock: Number(s.minStock),
        unit: s.unit,
      }));

    res.json({
      revenue: {
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue,
        avgOrderValue,
      },
      orders: {
        today: todayNonCancelled.length,
        total: allOrders.length,
        pending: pendingCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      bestsellers,
      topExtras,
      bySource,
      byPayment,
      customers: {
        total: allCustomers.length,
        newToday,
        newThisWeek,
        regular,
        inactive30d,
      },
      kitchen: {
        open: pendingCount,
        completed: completedCount,
        avgPrepMinutes: null,
      },
      stockWarnings,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
