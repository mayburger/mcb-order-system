import { db } from "@workspace/db";
import { activityLog } from "@workspace/db/schema";
import type { AuthUser } from "../middleware/auth";

/** Canonical action names for the audit trail. */
export type ActivityAction =
  | "order_deleted"
  | "price_changed"
  | "product_deactivated"
  | "coupon_created"
  | "user_created";

interface ActivityOptions {
  entityType?: string;
  entityId?: string | number;
  details?: string;
}

/**
 * Append a record to the audit trail. The actor's username is denormalized so
 * the entry stays readable even if the user is later deleted (userId is set
 * null via FK on delete).
 */
export async function logActivity(
  actor: AuthUser | undefined,
  action: ActivityAction,
  opts: ActivityOptions = {},
): Promise<void> {
  await db.insert(activityLog).values({
    userId: actor?.id ?? null,
    username: actor?.username ?? null,
    action,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId != null ? String(opts.entityId) : null,
    details: opts.details ?? null,
  });
}
