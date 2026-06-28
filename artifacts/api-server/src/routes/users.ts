import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { users, activityLog } from "@workspace/db/schema";
import { isRole } from "@workspace/authz";
import bcrypt from "bcryptjs";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

type StaffUser = typeof users.$inferSelect;

function publicUser(u: StaffUser) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
  };
}

// All user-administration routes are owner-only (users.manage is granted to
// "inhaber" alone in the permission matrix).
router.use("/admin/users", requireAuth, requirePermission("users.manage"));

router.get("/admin/users", async (req, res) => {
  try {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(rows.map(publicUser));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users", async (req, res) => {
  try {
    const { username, password, role } = (req.body ?? {}) as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
    };
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      typeof password !== "string" ||
      password.length < 8 ||
      !isRole(role)
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({
        username: username.trim(),
        passwordHash,
        role,
        active: true,
        mustChangePassword: true,
      })
      .returning();

    await logActivity(req.authUser, "user_created", {
      entityType: "user",
      entityId: created!.id,
      details: `Benutzer "${created!.username}" (${created!.role}) angelegt`,
    });

    res.status(201).json(publicUser(created!));
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return res.status(409).json({ error: "Username already exists" });
    }
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/users/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid input" });
    }
    const { role, active, password } = (req.body ?? {}) as {
      role?: unknown;
      active?: unknown;
      password?: unknown;
    };

    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return res.status(404).json({ error: "Not found" });

    const update: Partial<StaffUser> = {};

    if (role !== undefined) {
      if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });
      update.role = role;
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "Invalid input" });
      }
      // An owner must never deactivate or demote themselves out of access.
      if (id === req.authUser!.id && active === false) {
        return res
          .status(400)
          .json({ error: "Du kannst dein eigenes Konto nicht deaktivieren" });
      }
      update.active = active;
    }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Invalid input" });
      }
      update.passwordHash = await bcrypt.hash(password, 10);
      update.mustChangePassword = true;
    }

    // Last-owner protection: never allow the final active owner to be demoted
    // or deactivated, which would lock everyone out of user administration.
    const demotingOwner =
      target.role === "inhaber" &&
      ((update.role !== undefined && update.role !== "inhaber") ||
        update.active === false);
    if (demotingOwner) {
      const otherOwners = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, "inhaber"),
            eq(users.active, true),
            ne(users.id, id),
          ),
        );
      if (otherOwners.length === 0) {
        return res.status(400).json({
          error: "Der letzte aktive Inhaber kann nicht geändert werden",
        });
      }
    }

    if (Object.keys(update).length === 0) {
      return res.json(publicUser(target));
    }

    update.updatedAt = new Date();
    const [updated] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();

    res.json(publicUser(updated!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── ACTIVITY LOG (owner only) ────────────────────────────────────────────────
router.get(
  "/admin/activity-log",
  requireAuth,
  requirePermission("activityLog.view"),
  async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(200);
      res.json(
        rows.map((r) => ({
          id: r.id,
          username: r.username,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          details: r.details,
          createdAt: r.createdAt,
        })),
      );
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
