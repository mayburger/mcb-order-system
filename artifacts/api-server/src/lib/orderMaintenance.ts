import { db } from "@workspace/db";
import { orders, orderDeletionLog, settings } from "@workspace/db/schema";
import { and, isNull, isNotNull, lt, inArray, or, eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Reads the retention-related settings from the key/value settings table.
 */
async function getRetentionSettings() {
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    autoArchiveEnabled: map.get("ordersAutoArchiveEnabled") === "true",
    autoArchiveMonths: Number(map.get("ordersAutoArchiveMonths") ?? 6),
    autoDeleteEnabled: map.get("ordersArchiveAutoDeleteEnabled") === "true",
    autoDeleteYears: Number(map.get("ordersArchiveAutoDeleteYears") ?? 2),
  };
}

/**
 * Auto-archive completed/cancelled orders older than X months and
 * permanently delete archived orders older than Y years, according to the
 * settings the administrator configured. Safe to run repeatedly.
 */
export async function runOrderRetentionMaintenance(): Promise<void> {
  try {
    const cfg = await getRetentionSettings();

    // 1) Auto-archive old completed/cancelled orders.
    if (cfg.autoArchiveEnabled && cfg.autoArchiveMonths > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - cfg.autoArchiveMonths);
      const archived = await db
        .update(orders)
        .set({ archivedAt: new Date() })
        .where(
          and(
            isNull(orders.archivedAt),
            lt(orders.createdAt, cutoff),
            or(eq(orders.status, "completed"), eq(orders.status, "cancelled")),
          ),
        )
        .returning({ id: orders.id });
      if (archived.length > 0) {
        logger.info({ count: archived.length, months: cfg.autoArchiveMonths }, "Auto-archived orders");
      }
    }

    // 2) Auto-delete archived orders older than Y years (based on archive date).
    if (cfg.autoDeleteEnabled && cfg.autoDeleteYears > 0) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - cfg.autoDeleteYears);
      const toDelete = await db
        .select()
        .from(orders)
        .where(and(isNotNull(orders.archivedAt), lt(orders.archivedAt, cutoff)));
      if (toDelete.length > 0) {
        // Audit log + delete must be atomic so we never log a deletion that did not happen.
        await db.transaction(async (tx) => {
          await tx.insert(orderDeletionLog).values(
            toDelete.map((o) => ({
              orderNumber: o.orderNumber,
              customerName: o.customerName,
              total: o.total,
              reason: "Automatisch gelöscht (Archiv-Aufbewahrung abgelaufen)",
              deletedBy: "system",
            })),
          );
          await tx.delete(orders).where(
            inArray(orders.id, toDelete.map((o) => o.id)),
          );
        });
        logger.info({ count: toDelete.length, years: cfg.autoDeleteYears }, "Auto-deleted archived orders");
      }
    }
  } catch (err) {
    logger.error({ err }, "Order retention maintenance failed");
  }
}

/**
 * Starts the periodic retention maintenance. Runs once shortly after startup
 * and then on a fixed interval.
 */
export function startOrderRetentionScheduler(): void {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  // Run a short time after boot so the server is fully up first.
  setTimeout(() => void runOrderRetentionMaintenance(), 30 * 1000);
  setInterval(() => void runOrderRetentionMaintenance(), SIX_HOURS);
}
