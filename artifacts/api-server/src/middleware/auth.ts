import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  hasPermission,
  isRole,
  type Permission,
  type Role,
} from "@workspace/authz";

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: Role;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

/**
 * Authentication gate for all staff (/admin, /kitchen) routes.
 *
 * Re-reads the user from the DB on every request (never trusts the session
 * blindly) so that a deactivated account loses access immediately, even with a
 * still-valid cookie. On success it attaches `req.authUser` for downstream
 * permission checks.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.active || !isRole(user.role)) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.authUser = { id: user.id, username: user.username, role: user.role };

    // Force a password change before any other staff action. While the flag is
    // set, the only reachable guarded endpoint is the change-password route
    // itself (/auth/me and /auth/logout do not run requireAuth). This closes
    // the client-trust gap where the UI redirect could be bypassed by calling
    // the API directly with an initial/reset password. Match on method + a
    // trailing-slash-normalized path so an accidental trailing slash can't
    // deadlock the user out of the one endpoint that clears the flag.
    const isChangePasswordRoute =
      req.method === "POST" &&
      req.path.replace(/\/+$/, "").endsWith("/auth/change-password");
    if (user.mustChangePassword && !isChangePasswordRoute) {
      res
        .status(403)
        .json({ error: "Password change required", mustChangePassword: true });
      return;
    }

    next();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Permission gate. Must run after `requireAuth`. Deny-by-default: if the
 * authenticated user's role does not grant `permission`, respond 403.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.authUser?.role;
    if (!role || !hasPermission(role, permission)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
