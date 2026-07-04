import { Router } from "express";
import { db } from "@workspace/db";
import {
  orders,
  orderItems,
  menuItems,
  categories,
  branches,
  cashMovements,
  cashClosings,
} from "@workspace/db/schema";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// ── HELPERS ───────────────────────────────────────────────────────────────────

const MOVEMENT_TYPES = ["deposit", "payout", "tip", "refund", "correction"] as const;
type MovementType = (typeof MOVEMENT_TYPES)[number];

const MOVEMENT_LABELS: Record<MovementType, string> = {
  deposit: "Einlage",
  payout: "Entnahme",
  tip: "Trinkgeld",
  refund: "Rückerstattung",
  correction: "Korrektur",
};

/** Friendly German label + grouping for order payment methods. */
function paymentLabel(method: string): string {
  switch (method) {
    case "cash":
      return "Bar";
    case "ec":
    case "ec_pickup":
    case "ec_delivery":
      return "EC-Karte";
    case "stripe":
    case "card":
    case "credit":
    case "kreditkarte":
      return "Kreditkarte";
    case "paypal":
      return "PayPal";
    case "lieferando":
    case "online":
      return "Online bezahlt";
    case "coupon":
    case "gutschein":
      return "Gutschein";
    default:
      return method;
  }
}

function isCashMethod(method: string): boolean {
  return method === "cash";
}

/** Ensure a default branch exists and return its id. */
async function getDefaultBranchId(): Promise<number> {
  const [def] = await db
    .select()
    .from(branches)
    .where(eq(branches.isDefault, true))
    .limit(1);
  if (def) return def.id;
  const [any] = await db.select().from(branches).limit(1);
  if (any) return any.id;
  const [created] = await db
    .insert(branches)
    .values({ name: "Hauptfiliale", isDefault: true })
    .returning();
  return created.id;
}

function dayBounds(dateStr?: string): { start: Date; end: Date } {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type OrderRow = typeof orders.$inferSelect;
type MovementRow = typeof cashMovements.$inferSelect;
type ClosingRow = typeof cashClosings.$inferSelect;

const sumTotals = (list: OrderRow[]) =>
  list.reduce((s, o) => s + Number(o.total), 0);

function sumMovements(list: MovementRow[], type: MovementType): number {
  return list
    .filter((m) => m.type === type)
    .reduce((s, m) => s + Number(m.amount), 0);
}

function incomeByMethodOf(
  nonCancelled: OrderRow[],
): Array<{ method: string; label: string; count: number; revenue: number }> {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const o of nonCancelled) {
    const entry = map.get(o.paymentMethod) ?? { count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += Number(o.total);
    map.set(o.paymentMethod, entry);
  }
  return [...map.entries()].map(([method, { count, revenue }]) => ({
    method,
    label: paymentLabel(method),
    count,
    revenue,
  }));
}

/** Aggregate a till period from its orders + movements. */
function aggregatePeriod(periodOrders: OrderRow[], periodMovements: MovementRow[]) {
  const nonCancelled = periodOrders.filter((o) => o.status !== "cancelled");
  const cancelled = periodOrders.filter((o) => o.status === "cancelled");
  const totalRevenue = sumTotals(nonCancelled);
  const cashRevenue = nonCancelled
    .filter((o) => isCashMethod(o.paymentMethod))
    .reduce((s, o) => s + Number(o.total), 0);
  const discountsTotal = nonCancelled.reduce(
    (s, o) => s + Number(o.discountAmount),
    0,
  );
  const tips = sumMovements(periodMovements, "tip");
  const refunds = sumMovements(periodMovements, "refund");
  const deposits = sumMovements(periodMovements, "deposit");
  const payouts = sumMovements(periodMovements, "payout");
  const corrections = sumMovements(periodMovements, "correction");
  return {
    ordersCount: nonCancelled.length,
    totalRevenue,
    cashRevenue,
    discountsTotal,
    cancellationsCount: cancelled.length,
    cancellationsTotal: sumTotals(cancelled),
    tips,
    refunds,
    deposits,
    payouts,
    corrections,
    incomeByMethod: incomeByMethodOf(nonCancelled),
  };
}

function serializeMovement(m: MovementRow) {
  return {
    id: m.id,
    branchId: m.branchId,
    type: m.type,
    typeLabel: MOVEMENT_LABELS[m.type as MovementType] ?? m.type,
    amount: Number(m.amount),
    note: m.note,
    createdByUsername: m.createdByUsername,
    createdAt: m.createdAt.toISOString(),
  };
}

function serializeClosing(c: ClosingRow) {
  return {
    id: c.id,
    type: c.type,
    branchId: c.branchId,
    periodStart: c.periodStart.toISOString(),
    periodEnd: c.periodEnd.toISOString(),
    openingFloat: Number(c.openingFloat),
    countedCash: Number(c.countedCash),
    expectedCash: Number(c.expectedCash),
    difference: Number(c.difference),
    totalRevenue: Number(c.totalRevenue),
    cashRevenue: Number(c.cashRevenue),
    tipsTotal: Number(c.tipsTotal),
    refundsTotal: Number(c.refundsTotal),
    depositsTotal: Number(c.depositsTotal),
    payoutsTotal: Number(c.payoutsTotal),
    cancellationsCount: c.cancellationsCount,
    cancellationsTotal: Number(c.cancellationsTotal),
    ordersCount: c.ordersCount,
    incomeByMethod: c.incomeByMethod ?? [],
    notes: c.notes,
    closedByUsername: c.closedByUsername,
    closedAt: c.closedAt.toISOString(),
  };
}

// ── TAGESKASSE ────────────────────────────────────────────────────────────────

router.get(
  "/admin/cash/today",
  requireAuth,
  requirePermission("cashRegister.view"),
  async (req, res) => {
    try {
      const dateStr =
        typeof req.query["date"] === "string" ? req.query["date"] : undefined;
      const { start, end } = dayBounds(dateStr);

      const [dayOrders, dayMovements, closings] = await Promise.all([
        db
          .select()
          .from(orders)
          .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end))),
        db
          .select()
          .from(cashMovements)
          .where(
            and(
              gte(cashMovements.createdAt, start),
              lt(cashMovements.createdAt, end),
            ),
          ),
        db
          .select()
          .from(cashClosings)
          .orderBy(desc(cashClosings.closedAt))
          .limit(1),
      ]);

      const agg = aggregatePeriod(dayOrders, dayMovements);
      const branchId = await getDefaultBranchId();

      res.json({
        date: toDateStr(start),
        branchId,
        ...agg,
        // erwarteter Bar-Bestand ohne Anfangsbestand (Client addiert opening float)
        expectedCashBase:
          agg.cashRevenue + agg.deposits - agg.payouts - agg.refunds,
        movements: dayMovements
          .slice()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(serializeMovement),
        lastClosingAt: closings[0]?.closedAt.toISOString() ?? null,
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── KASSENBEWEGUNGEN ──────────────────────────────────────────────────────────

router.post(
  "/admin/cash/movements",
  requireAuth,
  requirePermission("cashRegister.view"),
  async (req, res) => {
    try {
      const body = req.body as {
        type?: string;
        amount?: number;
        note?: string;
        branchId?: number;
      };
      if (!body.type || !MOVEMENT_TYPES.includes(body.type as MovementType)) {
        res.status(400).json({ error: "Ungültige Bewegungsart" });
        return;
      }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        res.status(400).json({ error: "Ungültiger Betrag" });
        return;
      }
      // Nur "correction" darf negativ sein.
      if (body.type !== "correction" && amount < 0) {
        res.status(400).json({ error: "Betrag muss positiv sein" });
        return;
      }
      const branchId = body.branchId ?? (await getDefaultBranchId());

      const [created] = await db
        .insert(cashMovements)
        .values({
          branchId,
          type: body.type as MovementType,
          amount: String(amount),
          note: body.note?.trim() || null,
          createdByUserId: req.authUser?.id ?? null,
          createdByUsername: req.authUser?.username ?? null,
        })
        .returning();

      res.status(201).json(serializeMovement(created));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/admin/cash/movements/:id",
  requireAuth,
  requirePermission("cashRegister.view"),
  async (req, res) => {
    try {
      const id = Number(req.params["id"]);
      const [deleted] = await db
        .delete(cashMovements)
        .where(eq(cashMovements.id, id))
        .returning();
      if (!deleted) {
        res.status(404).json({ error: "Bewegung nicht gefunden" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── KASSENABSCHLÜSSE ──────────────────────────────────────────────────────────

router.get(
  "/admin/cash/closings",
  requireAuth,
  requirePermission("cashRegister.view"),
  async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(cashClosings)
        .orderBy(desc(cashClosings.closedAt));
      res.json(rows.map(serializeClosing));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/admin/cash/closings/:id",
  requireAuth,
  requirePermission("cashRegister.view"),
  async (req, res) => {
    try {
      const id = Number(req.params["id"]);
      const [row] = await db
        .select()
        .from(cashClosings)
        .where(eq(cashClosings.id, id));
      if (!row) {
        res.status(404).json({ error: "Abschluss nicht gefunden" });
        return;
      }
      res.json(serializeClosing(row));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/admin/cash/closings",
  requireAuth,
  requirePermission("cashClosing.manage"),
  async (req, res) => {
    try {
      const body = req.body as {
        type?: "day" | "shift";
        openingFloat?: number;
        countedCash?: number;
        notes?: string;
        branchId?: number;
      };
      const type = body.type === "shift" ? "shift" : "day";
      const openingFloat = Number(body.openingFloat) || 0;
      const countedCash = Number(body.countedCash) || 0;
      const branchId = body.branchId ?? (await getDefaultBranchId());

      const now = new Date();
      let periodStart: Date;
      if (type === "shift") {
        const [last] = await db
          .select()
          .from(cashClosings)
          .orderBy(desc(cashClosings.closedAt))
          .limit(1);
        if (last) {
          periodStart = last.closedAt;
        } else {
          periodStart = new Date(now);
          periodStart.setHours(0, 0, 0, 0);
        }
      } else {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
      }

      const [periodOrders, periodMovements] = await Promise.all([
        db
          .select()
          .from(orders)
          .where(
            and(gte(orders.createdAt, periodStart), lt(orders.createdAt, now)),
          ),
        db
          .select()
          .from(cashMovements)
          .where(
            and(
              gte(cashMovements.createdAt, periodStart),
              lt(cashMovements.createdAt, now),
            ),
          ),
      ]);

      const agg = aggregatePeriod(periodOrders, periodMovements);
      const expectedCash =
        openingFloat + agg.cashRevenue + agg.deposits - agg.payouts - agg.refunds;
      const difference = countedCash - expectedCash;

      const [created] = await db
        .insert(cashClosings)
        .values({
          type,
          branchId,
          periodStart,
          periodEnd: now,
          openingFloat: String(openingFloat),
          countedCash: String(countedCash),
          expectedCash: String(expectedCash),
          difference: String(difference),
          totalRevenue: String(agg.totalRevenue),
          cashRevenue: String(agg.cashRevenue),
          tipsTotal: String(agg.tips),
          refundsTotal: String(agg.refunds),
          depositsTotal: String(agg.deposits),
          payoutsTotal: String(agg.payouts),
          cancellationsCount: agg.cancellationsCount,
          cancellationsTotal: String(agg.cancellationsTotal),
          ordersCount: agg.ordersCount,
          incomeByMethod: agg.incomeByMethod,
          notes: body.notes?.trim() || null,
          closedByUserId: req.authUser?.id ?? null,
          closedByUsername: req.authUser?.username ?? null,
        })
        .returning();

      await logActivity(req.authUser, "cash_closing_created", {
        entityType: "cash_closing",
        entityId: created.id,
        details: `${type === "day" ? "Tagesabschluss" : "Schichtabschluss"} – Differenz ${difference.toFixed(2)} €`,
      });

      res.status(201).json(serializeClosing(created));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/admin/cash/closings/:id",
  requireAuth,
  requirePermission("cashClosing.manage"),
  async (req, res) => {
    try {
      const id = Number(req.params["id"]);
      const [deleted] = await db
        .delete(cashClosings)
        .where(eq(cashClosings.id, id))
        .returning();
      if (!deleted) {
        res.status(404).json({ error: "Abschluss nicht gefunden" });
        return;
      }
      await logActivity(req.authUser, "cash_closing_deleted", {
        entityType: "cash_closing",
        entityId: id,
        details: `${deleted.type === "day" ? "Tagesabschluss" : "Schichtabschluss"} vom ${deleted.closedAt.toISOString()}`,
      });
      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── BERICHTE ──────────────────────────────────────────────────────────────────

router.get(
  "/admin/reports",
  requireAuth,
  requirePermission("dashboard.view"),
  async (req, res) => {
    try {
      const period =
        req.query["period"] === "today" || req.query["period"] === "week"
          ? req.query["period"]
          : req.query["period"] === "month"
            ? "month"
            : "month";

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      const monthStart = new Date(todayStart);
      monthStart.setDate(1);

      let start = monthStart;
      if (period === "today") start = todayStart;
      else if (period === "week") start = weekStart;

      const [allOrders, allOrderItems, allMenuItems, allCategories, allBranches] =
        await Promise.all([
          db.select().from(orders),
          db.select().from(orderItems),
          db.select().from(menuItems),
          db.select().from(categories),
          db.select().from(branches),
        ]);

      const nonCancelled = allOrders.filter((o) => o.status !== "cancelled");
      const inRange = (o: OrderRow, from: Date) =>
        o.createdAt >= from && o.createdAt <= now;

      const revenueSince = (from: Date) =>
        nonCancelled
          .filter((o) => inRange(o, from))
          .reduce((s, o) => s + Number(o.total), 0);

      const headline = {
        today: revenueSince(todayStart),
        week: revenueSince(weekStart),
        month: revenueSince(monthStart),
      };

      const periodOrders = nonCancelled.filter((o) => inRange(o, start));
      const periodOrderIds = new Set(periodOrders.map((o) => o.id));
      const total = periodOrders.reduce((s, o) => s + Number(o.total), 0);
      const orderCount = periodOrders.length;

      // by category (join order items -> menu item -> category)
      const catNameById = new Map(allCategories.map((c) => [c.id, c.name]));
      const catIdByMenuItem = new Map(
        allMenuItems.map((m) => [m.id, m.categoryId]),
      );
      const catMap = new Map<string, { revenue: number; qty: number }>();
      for (const it of allOrderItems) {
        if (!periodOrderIds.has(it.orderId)) continue;
        const catId =
          it.menuItemId != null ? catIdByMenuItem.get(it.menuItemId) : undefined;
        const name =
          (catId != null ? catNameById.get(catId) : undefined) ?? "Unbekannt";
        const entry = catMap.get(name) ?? { revenue: 0, qty: 0 };
        entry.revenue += Number(it.lineTotal);
        entry.qty += it.quantity;
        catMap.set(name, entry);
      }
      const byCategory = [...catMap.entries()]
        .map(([name, { revenue, qty }]) => ({ name, revenue, qty }))
        .sort((a, b) => b.revenue - a.revenue);

      // by branch
      const defaultBranch =
        allBranches.find((b) => b.isDefault) ?? allBranches[0] ?? null;
      const branchNameById = new Map(allBranches.map((b) => [b.id, b.name]));
      const branchMap = new Map<
        number | null,
        { revenue: number; orderCount: number }
      >();
      for (const o of periodOrders) {
        const key = o.branchId ?? null;
        const entry = branchMap.get(key) ?? { revenue: 0, orderCount: 0 };
        entry.revenue += Number(o.total);
        entry.orderCount++;
        branchMap.set(key, entry);
      }
      const byBranch = [...branchMap.entries()].map(
        ([branchId, { revenue, orderCount }]) => ({
          branchId: branchId ?? defaultBranch?.id ?? null,
          name:
            (branchId != null ? branchNameById.get(branchId) : undefined) ??
            defaultBranch?.name ??
            "Hauptfiliale",
          revenue,
          orderCount,
        }),
      );

      // by payment method
      const byPaymentMethod = incomeByMethodOf(periodOrders).map((r) => ({
        method: r.method,
        label: r.label,
        revenue: r.revenue,
        count: r.count,
      }));

      // by day (revenue per day across the period)
      const byDayMap = new Map<string, number>();
      const cursor = new Date(start);
      while (cursor <= now) {
        byDayMap.set(toDateStr(cursor), 0);
        cursor.setDate(cursor.getDate() + 1);
      }
      for (const o of periodOrders) {
        const key = toDateStr(o.createdAt);
        if (byDayMap.has(key)) {
          byDayMap.set(key, (byDayMap.get(key) ?? 0) + Number(o.total));
        }
      }
      const byDay = [...byDayMap.entries()].map(([date, revenue]) => ({
        date,
        revenue,
      }));

      res.json({
        period,
        start: start.toISOString(),
        end: now.toISOString(),
        headline,
        summary: {
          total,
          orderCount,
          avgOrderValue: orderCount > 0 ? total / orderCount : 0,
        },
        byCategory,
        byBranch,
        byPaymentMethod,
        byDay,
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
