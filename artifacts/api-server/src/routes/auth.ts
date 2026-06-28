import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { permissionsForRole, isRole } from "@workspace/authz";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

type StaffUser = typeof users.$inferSelect;

function sessionPayload(user: StaffUser) {
  return {
    authenticated: true as const,
    username: user.username,
    role: user.role,
    permissions: [...permissionsForRole(user.role)],
    mustChangePassword: user.mustChangePassword,
  };
}

const ANON_SESSION = {
  authenticated: false as const,
  username: null,
  role: null,
  permissions: [] as string[],
  mustChangePassword: false,
};

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = (req.body ?? {}) as {
      username?: unknown;
      password?: unknown;
    };
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !user.active || !valid || !isRole(user.role)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Regenerate the session id on login to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) {
        req.log.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      res.json(sessionPayload(user));
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.json(ANON_SESSION);

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.active || !isRole(user.role)) {
      return req.session.destroy(() => res.json(ANON_SESSION));
    }
    res.json(sessionPayload(user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = (req.body ?? {}) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.authUser!.id));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Wrong current password" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
