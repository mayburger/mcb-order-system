import crypto from "node:crypto";
import type { Request } from "express";
import { db } from "@workspace/db";
import { customerAuthTokens } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    customerId?: number;
  }
}

/** Per-Request-Cache für die Bearer-Token-Auflösung. */
const tokenCache = new WeakMap<Request, number | null>();

/** Absolute Lebensdauer eines Tokens (90 Tage). */
const TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
/** Inaktivitäts-Timeout (30 Tage ohne Nutzung). */
const TOKEN_IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function bearerTokenOf(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length >= 32 ? token : null;
}

/**
 * Erstellt ein neues Bearer-Token für einen Kunden (Mobile-App) und gibt das
 * Klartext-Token zurück. In der DB liegt nur der SHA-256-Hash.
 */
export async function issueCustomerToken(customerId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(customerAuthTokens).values({
    customerId,
    tokenHash: hashToken(token),
  });
  return token;
}

/**
 * Löscht ALLE Tokens eines Kunden — bei sicherheitsrelevanten Ereignissen
 * (z. B. Passwortänderung/-reset) aufrufen, sobald es solche Endpunkte gibt.
 */
export async function revokeAllCustomerTokens(customerId: number): Promise<void> {
  await db
    .delete(customerAuthTokens)
    .where(eq(customerAuthTokens.customerId, customerId));
}

/** Löscht das Token des aktuellen Requests (Logout aus der Mobile-App). */
export async function revokeCustomerToken(req: Request): Promise<void> {
  const token = bearerTokenOf(req);
  if (!token) return;
  await db
    .delete(customerAuthTokens)
    .where(eq(customerAuthTokens.tokenHash, hashToken(token)));
}

/**
 * Ermittelt die Kunden-ID des Requests: zuerst Cookie-Session (Web),
 * dann Bearer-Token (Mobile-App). Ergebnis wird pro Request gecached.
 */
export async function resolveCustomerId(req: Request): Promise<number | null> {
  if (req.session?.customerId) return req.session.customerId;
  if (tokenCache.has(req)) return tokenCache.get(req) ?? null;

  const token = bearerTokenOf(req);
  if (!token) {
    tokenCache.set(req, null);
    return null;
  }

  const [row] = await db
    .select()
    .from(customerAuthTokens)
    .where(eq(customerAuthTokens.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) {
    tokenCache.set(req, null);
    return null;
  }

  // TTL-Enforcement: abgelaufene Tokens ablehnen und löschen.
  const now = Date.now();
  const expired =
    now - row.createdAt.getTime() > TOKEN_MAX_AGE_MS ||
    now - row.lastUsedAt.getTime() > TOKEN_IDLE_TIMEOUT_MS;
  if (expired) {
    await db
      .delete(customerAuthTokens)
      .where(eq(customerAuthTokens.id, row.id));
    tokenCache.set(req, null);
    return null;
  }

  // lastUsedAt höchstens 1x/Minute aktualisieren, um Schreiblast zu sparen.
  if (Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await db
      .update(customerAuthTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(customerAuthTokens.id, row.id));
  }

  tokenCache.set(req, row.customerId);
  return row.customerId;
}
