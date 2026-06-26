import { Router } from "express";
import { db } from "@workspace/db";
import { settings } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    adminAuthenticated?: boolean;
    adminUsername?: string;
  }
}

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    const rows = await db.select().from(settings);
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const storedUsername = map.get("adminUsername") ?? "admin";
    const storedHash = map.get("adminPasswordHash");
    const legacyPassword = map.get("adminPassword");

    let valid = false;

    if (username !== storedUsername) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (storedHash) {
      valid = await bcrypt.compare(password, storedHash);
    } else if (legacyPassword) {
      valid = password === legacyPassword;
    } else {
      valid = password === "admin123";
    }

    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    req.session.adminAuthenticated = true;
    req.session.adminUsername = storedUsername;

    res.json({ authenticated: true, username: storedUsername });
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

router.get("/auth/me", (req, res) => {
  if (req.session.adminAuthenticated) {
    res.json({ authenticated: true, username: req.session.adminUsername ?? null });
  } else {
    res.json({ authenticated: false, username: null });
  }
});

export default router;
