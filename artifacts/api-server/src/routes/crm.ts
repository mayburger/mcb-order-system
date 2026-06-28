import { Router } from "express";
import { db } from "@workspace/db";
import {
  customers,
  orders,
  orderItems,
  customerNotes,
  favoriteOrders,
  customerCrmNotes,
} from "@workspace/db/schema";
import { eq, desc, ilike, or, and, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();
router.use("/admin/crm", requireAdmin);

// ── helper: behavioral analysis from orders + items ──────────────────────────
function analyzeBehavior(
  customerOrders: Array<{ createdAt: Date; paymentMethod: string; orderType: "delivery" | "pickup" }>,
  allItems: Array<{ itemName: string; extrasSnapshot: unknown; optionsSnapshot: unknown }>,
) {
  // preferred order time (most common 2-hour window)
  const hourBuckets: Record<string, number> = {};
  for (const o of customerOrders) {
    const h = o.createdAt.getHours();
    const bucket = `${h}-${h + 2} Uhr`;
    hourBuckets[bucket] = (hourBuckets[bucket] ?? 0) + 1;
  }
  const preferredOrderTime = Object.entries(hourBuckets)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // preferred payment method
  const payMap: Record<string, number> = {};
  for (const o of customerOrders) {
    payMap[o.paymentMethod] = (payMap[o.paymentMethod] ?? 0) + 1;
  }
  const preferredPaymentMethod = Object.entries(payMap)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // preferred order type
  const typeMap: Record<string, number> = {};
  for (const o of customerOrders) {
    typeMap[o.orderType] = (typeMap[o.orderType] ?? 0) + 1;
  }
  const preferredOrderType = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // top items
  const itemCount: Record<string, number> = {};
  for (const item of allItems) {
    itemCount[item.itemName] = (itemCount[item.itemName] ?? 0) + 1;
  }
  const topItems = Object.entries(itemCount)
    .map(([itemName, count]) => ({ itemName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // top extras (from extrasSnapshot + optionsSnapshot)
  const extrasCount: Record<string, number> = {};
  for (const item of allItems) {
    const extras = item.extrasSnapshot as Array<{ name: string }> | null;
    if (extras) {
      for (const e of extras) {
        extrasCount[e.name] = (extrasCount[e.name] ?? 0) + 1;
      }
    }
    const opts = item.optionsSnapshot as Array<{ optionItemName: string }> | null;
    if (opts) {
      for (const o of opts) {
        extrasCount[o.optionItemName] = (extrasCount[o.optionItemName] ?? 0) + 1;
      }
    }
  }
  const topExtras = Object.entries(extrasCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { preferredOrderTime, preferredPaymentMethod, preferredOrderType, topItems, topExtras };
}

// ── GET /admin/crm/customers?search= ─────────────────────────────────────────
router.get("/admin/crm/customers", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    // 1. Load all registered customers
    const registeredCustomers = await db.select().from(customers);
    const registeredIds = registeredCustomers.map((c) => c.id);

    // 2. Load all orders (for stats + guest aggregation)
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

    // 3. Build stats per customerId (registered)
    const statsByCustomerId = new Map<number, {
      orderCount: number; totalSpent: number;
      lastOrderAt: Date | null; firstOrderAt: Date | null;
    }>();
    for (const cid of registeredIds) {
      statsByCustomerId.set(cid, { orderCount: 0, totalSpent: 0, lastOrderAt: null, firstOrderAt: null });
    }

    // 4. Build stats per phone (guests = orders without customerId)
    const statsByPhone = new Map<string, {
      name: string; email: string | null; phone: string;
      orderCount: number; totalSpent: number;
      lastOrderAt: Date | null; firstOrderAt: Date | null;
    }>();

    for (const o of allOrders) {
      if (o.customerId && statsByCustomerId.has(o.customerId)) {
        const s = statsByCustomerId.get(o.customerId)!;
        s.orderCount += 1;
        if (o.status !== "cancelled") s.totalSpent += Number(o.total);
        if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt;
        if (!s.firstOrderAt || o.createdAt < s.firstOrderAt) s.firstOrderAt = o.createdAt;
      } else if (!o.customerId) {
        const phone = o.customerPhone;
        if (!statsByPhone.has(phone)) {
          statsByPhone.set(phone, {
            name: o.customerName,
            email: o.customerEmail,
            phone,
            orderCount: 0,
            totalSpent: 0,
            lastOrderAt: null,
            firstOrderAt: null,
          });
        }
        const s = statsByPhone.get(phone)!;
        s.orderCount += 1;
        if (o.status !== "cancelled") s.totalSpent += Number(o.total);
        if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt;
        if (!s.firstOrderAt || o.createdAt < s.firstOrderAt) s.firstOrderAt = o.createdAt;
      }
    }

    // 5. Build combined list
    const list: Array<{
      id: number | null; isGuest: boolean; name: string;
      email: string | null; phone: string;
      orderCount: number; totalSpent: number; avgOrderValue: number;
      lastOrderAt: Date | null; firstOrderAt: Date | null;
      isBlocked: boolean; isRegular: boolean; vipStatus: boolean;
      loyaltyPoints: number; birthday: string | null; createdAt: Date | null;
    }> = [];

    // Registered customers
    for (const c of registeredCustomers) {
      const stats = statsByCustomerId.get(c.id)!;
      list.push({
        id: c.id,
        isGuest: false,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        avgOrderValue: stats.orderCount > 0 ? stats.totalSpent / stats.orderCount : 0,
        lastOrderAt: stats.lastOrderAt,
        firstOrderAt: stats.firstOrderAt,
        isBlocked: c.isBlocked,
        isRegular: c.isRegular,
        vipStatus: c.vipStatus,
        loyaltyPoints: c.loyaltyPoints,
        birthday: c.birthday,
        createdAt: c.createdAt,
      });
    }

    // Guest customers (exclude phones already covered by registered customers)
    const registeredPhones = new Set(registeredCustomers.map((c) => c.phone).filter(Boolean));
    for (const [phone, stats] of statsByPhone) {
      if (registeredPhones.has(phone)) continue;
      list.push({
        id: null,
        isGuest: true,
        name: stats.name,
        email: stats.email,
        phone,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        avgOrderValue: stats.orderCount > 0 ? stats.totalSpent / stats.orderCount : 0,
        lastOrderAt: stats.lastOrderAt,
        firstOrderAt: stats.firstOrderAt,
        isBlocked: false,
        isRegular: false,
        vipStatus: false,
        loyaltyPoints: 0,
        birthday: null,
        createdAt: null,
      });
    }

    // 6. Sort: registered first, then by total spent desc
    list.sort((a, b) => {
      if (!a.isGuest && b.isGuest) return -1;
      if (a.isGuest && !b.isGuest) return 1;
      return b.totalSpent - a.totalSpent;
    });

    // 7. Search filter
    let filtered = list;
    if (search) {
      const lower = search.toLowerCase();
      // also check order numbers
      const matchingOrders = allOrders.filter(
        (o) => o.orderNumber.toLowerCase().includes(lower),
      );
      const matchingPhones = new Set(matchingOrders.map((o) => o.customerPhone));
      const matchingIds = new Set(
        matchingOrders.map((o) => o.customerId).filter((id): id is number => id !== null),
      );

      filtered = list.filter((c) =>
        c.name.toLowerCase().includes(lower) ||
        c.phone.includes(lower) ||
        (c.email?.toLowerCase().includes(lower)) ||
        matchingPhones.has(c.phone) ||
        (c.id !== null && matchingIds.has(c.id!)),
      );
    }

    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/crm/customers/:id ─────────────────────────────────────────────
router.get("/admin/crm/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.createdAt));

    const orderIds = customerOrders.map((o) => o.id);
    const allItems = orderIds.length > 0
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    const totalSpent = customerOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = customerOrders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const lastOrder = customerOrders[0];
    const firstOrder = customerOrders[customerOrders.length - 1];

    const behavior = analyzeBehavior(
      customerOrders.map((o) => ({
        createdAt: o.createdAt,
        paymentMethod: o.paymentMethod,
        orderType: o.orderType,
      })),
      allItems.map((i) => ({
        itemName: i.itemName,
        extrasSnapshot: i.extrasSnapshot,
        optionsSnapshot: i.optionsSnapshot,
      })),
    );

    const notes = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, id))
      .orderBy(desc(customerNotes.usageCount));

    const favs = await db
      .select()
      .from(favoriteOrders)
      .where(eq(favoriteOrders.customerId, id))
      .orderBy(desc(favoriteOrders.createdAt));

    const crmNotes = await db
      .select()
      .from(customerCrmNotes)
      .where(eq(customerCrmNotes.customerId, id))
      .orderBy(desc(customerCrmNotes.createdAt));

    // Build order item map for serialization
    const orderItemsMap = new Map<number, typeof allItems>();
    for (const item of allItems) {
      if (!orderItemsMap.has(item.orderId)) orderItemsMap.set(item.orderId, []);
      orderItemsMap.get(item.orderId)!.push(item);
    }

    const serializedOrders = customerOrders.map((o) => {
      const items = (orderItemsMap.get(o.id) ?? []).map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        itemPrice: Number(i.itemPrice),
        lineTotal: Number(i.lineTotal),
        variantName: i.variantName ?? null,
        optionsSnapshot: i.optionsSnapshot ?? null,
        extrasSnapshot: i.extrasSnapshot ?? null,
      }));
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        orderType: o.orderType,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.deliveryFee),
        discountAmount: Number(o.discountAmount),
        deliveryAddress: o.deliveryAddress,
        postalCode: o.postalCode,
        city: o.city,
        notes: o.notes,
        createdAt: o.createdAt,
        items,
        customerId: o.customerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        source: o.source,
        couponCode: o.couponCode,
      };
    });

    res.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName ?? "",
      phone: customer.phone ?? "",
      birthday: customer.birthday ?? null,
      createdAt: customer.createdAt,
      isBlocked: customer.isBlocked,
      isRegular: customer.isRegular,
      vipStatus: customer.vipStatus,
      loyaltyPoints: customer.loyaltyPoints,
      orderCount,
      totalSpent,
      avgOrderValue,
      lastOrderAt: lastOrder?.createdAt ?? null,
      firstOrderAt: firstOrder?.createdAt ?? null,
      topItems: behavior.topItems,
      topExtras: behavior.topExtras,
      preferredOrderTime: behavior.preferredOrderTime,
      preferredPaymentMethod: behavior.preferredPaymentMethod,
      preferredOrderType: behavior.preferredOrderType,
      orders: serializedOrders,
      notes: notes.map((n) => ({ id: n.id, text: n.text, usageCount: n.usageCount, createdAt: n.createdAt })),
      favorites: favs.map((f) => ({
        id: f.id,
        name: f.name,
        items: f.items,
        createdAt: f.createdAt,
      })),
      crmNotes: crmNotes.map((n) => ({
        id: n.id,
        customerId: n.customerId,
        text: n.text,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /admin/crm/customers/:id ───────────────────────────────────────────
router.patch("/admin/crm/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { isBlocked, isRegular, vipStatus, loyaltyPoints, birthday } = req.body as {
      isBlocked?: boolean; isRegular?: boolean; vipStatus?: boolean;
      loyaltyPoints?: number; birthday?: string;
    };

    const updateData: Partial<typeof customers.$inferInsert> = {};
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;
    if (isRegular !== undefined) updateData.isRegular = isRegular;
    if (vipStatus !== undefined) updateData.vipStatus = vipStatus;
    if (loyaltyPoints !== undefined) updateData.loyaltyPoints = loyaltyPoints;
    if (birthday !== undefined) updateData.birthday = birthday || null;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Customer not found" }); return; }

    // Return brief response (client will refetch full detail)
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /admin/crm/customers/:id/crm-notes ───────────────────────────────────
router.post("/admin/crm/customers/:id/crm-notes", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { text } = req.body as { text?: string };
    if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

    const [note] = await db
      .insert(customerCrmNotes)
      .values({ customerId: id, text: text.trim() })
      .returning();

    res.status(201).json({
      id: note.id,
      customerId: note.customerId,
      text: note.text,
      createdAt: note.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /admin/crm/customers/:id/crm-notes/:noteId ────────────────────────
router.delete("/admin/crm/customers/:id/crm-notes/:noteId", async (req, res) => {
  try {
    const noteId = parseInt(req.params.noteId as string, 10);
    if (isNaN(noteId)) { res.status(400).json({ error: "Invalid noteId" }); return; }

    await db.delete(customerCrmNotes).where(eq(customerCrmNotes.id, noteId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/crm/export?format=csv ─────────────────────────────────────────
router.get("/admin/crm/export", async (req, res) => {
  try {
    const format = req.query.format === "xlsx" ? "xlsx" : "csv";

    const allCustomers = await db.select().from(customers);
    const allOrders = await db.select().from(orders);

    // Build stats
    const statsMap = new Map<number, { orderCount: number; totalSpent: number; lastOrderAt: Date | null }>();
    for (const c of allCustomers) {
      statsMap.set(c.id, { orderCount: 0, totalSpent: 0, lastOrderAt: null });
    }
    for (const o of allOrders) {
      if (o.customerId && statsMap.has(o.customerId)) {
        const s = statsMap.get(o.customerId)!;
        s.orderCount += 1;
        if (o.status !== "cancelled") s.totalSpent += Number(o.total);
        if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt;
      }
    }

    const rows = allCustomers.map((c) => {
      const s = statsMap.get(c.id)!;
      return {
        ID: c.id,
        Vorname: c.firstName,
        Nachname: c.lastName,
        Email: c.email,
        Telefon: c.phone,
        Geburtsdatum: c.birthday ?? "",
        Registriert: c.createdAt.toISOString().split("T")[0],
        Bestellungen: s.orderCount,
        Gesamtumsatz: s.totalSpent.toFixed(2),
        LetzteBestellung: s.lastOrderAt ? s.lastOrderAt.toISOString().split("T")[0] : "",
        VIP: c.vipStatus ? "Ja" : "Nein",
        Stammkunde: c.isRegular ? "Ja" : "Nein",
        Gesperrt: c.isBlocked ? "Ja" : "Nein",
        Bonuspunkte: c.loyaltyPoints,
      };
    });

    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(";"),
      ...rows.map((r) =>
        headers.map((h) => {
          const v = String((r as Record<string, unknown>)[h] ?? "");
          return v.includes(";") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(";"),
      ),
    ].join("\n");

    const filename = `kunden-export-${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "csv" : "csv"}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv); // UTF-8 BOM for Excel compatibility
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
