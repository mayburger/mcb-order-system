import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  customers,
  orders,
  orderItems,
  favoriteOrders,
  customerNotes,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { serializeOrder } from "./orders";
import {
  issueCustomerToken,
  revokeCustomerToken,
  resolveCustomerId,
} from "../lib/customerAuth";

const router = Router();

/**
 * Mobile-Clients (Expo) senden den Header `x-client: mobile` — sie können
 * keine Cookies nutzen und bekommen bei Login/Register zusätzlich ein
 * Bearer-Token zurück. Web-Clients laufen weiter über die Cookie-Session.
 */
function wantsToken(req: Request): boolean {
  return req.headers["x-client"] === "mobile";
}

function serializeCustomer(c: typeof customers.$inferSelect) {
  return {
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    createdAt: c.createdAt,
  };
}

async function requireCustomer(req: Request, res: Response): Promise<number | null> {
  const id = await resolveCustomerId(req);
  if (!id) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return id;
}

// ── Register ───────────────────────────────────────────────────────────────────
router.post("/customer/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body as {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      phone?: string;
    };

    if (!email || !password || !firstName) {
      return res.status(400).json({ error: "E-Mail, Passwort und Vorname sind erforderlich" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Passwort muss mindestens 6 Zeichen haben" });
    }

    const existing = await db.query.customers.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.email, email.toLowerCase().trim()),
    });
    if (existing) return res.status(409).json({ error: "E-Mail ist bereits vergeben" });

    const passwordHash = await bcrypt.hash(password, 10);
    const [customer] = await db
      .insert(customers)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName?.trim() ?? "",
        phone: phone?.trim() ?? "",
      })
      .returning();

    if (!customer) return res.status(500).json({ error: "Registrierung fehlgeschlagen" });

    req.session.customerId = customer.id;
    const token = wantsToken(req) ? await issueCustomerToken(customer.id) : undefined;
    res.status(201).json({
      authenticated: true,
      customer: serializeCustomer(customer),
      ...(token ? { token } : {}),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Login ──────────────────────────────────────────────────────────────────────
router.post("/customer/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });

    const customer = await db.query.customers.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.email, email.toLowerCase().trim()),
    });
    if (!customer) return res.status(401).json({ error: "Ungültige Anmeldedaten" });

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: "Ungültige Anmeldedaten" });

    req.session.customerId = customer.id;
    const token = wantsToken(req) ? await issueCustomerToken(customer.id) : undefined;
    res.json({
      authenticated: true,
      customer: serializeCustomer(customer),
      ...(token ? { token } : {}),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Logout ─────────────────────────────────────────────────────────────────────
router.post("/customer/logout", async (req, res) => {
  try {
    await revokeCustomerToken(req);
  } catch (err) {
    req.log.error(err);
  }
  req.session.customerId = undefined;
  res.json({ ok: true });
});

// ── Me ─────────────────────────────────────────────────────────────────────────
router.get("/customer/me", async (req, res) => {
  const customerId = await resolveCustomerId(req);
  if (!customerId) return res.json({ authenticated: false, customer: null });

  const customer = await db.query.customers.findFirst({
    where: (c, { eq: eqFn }) => eqFn(c.id, customerId),
  });
  if (!customer) {
    req.session.customerId = undefined;
    return res.json({ authenticated: false, customer: null });
  }
  res.json({ authenticated: true, customer: serializeCustomer(customer) });
});

// ── Update Profile ─────────────────────────────────────────────────────────────
router.patch("/customer/me", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const { firstName, lastName, phone } = req.body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };

    const updates: Partial<typeof customers.$inferInsert> = {};
    if (firstName?.trim()) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Keine Felder zum Aktualisieren" });
    }

    const [updated] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, customerId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Kunde nicht gefunden" });
    res.json(serializeCustomer(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Order History ──────────────────────────────────────────────────────────────
router.get("/customer/orders", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));

    const result = [];
    for (const order of customerOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      result.push(serializeOrder(order, items));
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Single Order ───────────────────────────────────────────────────────────────
router.get("/customer/orders/:id", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const id = Number(req.params["id"]);
    const order = await db.query.orders.findFirst({
      where: (o, { eq: eqFn, and: andFn }) => andFn(eqFn(o.id, id), eqFn(o.customerId, customerId)),
    });
    if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden" });

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    res.json(serializeOrder(order, items));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Favorites ──────────────────────────────────────────────────────────────────
router.get("/customer/favorites", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const favs = await db
      .select()
      .from(favoriteOrders)
      .where(eq(favoriteOrders.customerId, customerId))
      .orderBy(desc(favoriteOrders.createdAt));

    res.json(favs.map((f) => ({ id: f.id, name: f.name, items: f.items, createdAt: f.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customer/favorites", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const { name, items } = req.body as { name: string; items: unknown[] };
    if (!name?.toString().trim() || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Name und mindestens ein Artikel erforderlich" });
    }

    const [fav] = await db
      .insert(favoriteOrders)
      .values({ customerId, name: name.toString().trim(), items: items as typeof favoriteOrders.$inferInsert["items"] })
      .returning();

    if (!fav) return res.status(500).json({ error: "Fehler beim Speichern" });
    res.status(201).json({ id: fav.id, name: fav.name, items: fav.items, createdAt: fav.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customer/favorites/:id", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const id = Number(req.params["id"]);
    await db
      .delete(favoriteOrders)
      .where(and(eq(favoriteOrders.id, id), eq(favoriteOrders.customerId, customerId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Notes ──────────────────────────────────────────────────────────────────────
router.get("/customer/notes", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const notes = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.usageCount), desc(customerNotes.createdAt));

    res.json(notes.map((n) => ({ id: n.id, text: n.text, usageCount: n.usageCount, createdAt: n.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customer/notes", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const { text } = req.body as { text: string };
    if (!text?.toString().trim()) return res.status(400).json({ error: "Text erforderlich" });

    const [note] = await db
      .insert(customerNotes)
      .values({ customerId, text: text.toString().trim() })
      .returning();

    if (!note) return res.status(500).json({ error: "Fehler beim Speichern" });
    res.status(201).json({ id: note.id, text: note.text, usageCount: note.usageCount, createdAt: note.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customer/notes/:id", async (req, res) => {
  try {
    const customerId = await requireCustomer(req, res);
    if (!customerId) return;

    const id = Number(req.params["id"]);
    await db
      .delete(customerNotes)
      .where(and(eq(customerNotes.id, id), eq(customerNotes.customerId, customerId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
