import { Router } from "express";
import { db } from "@workspace/db";
import {
  categories,
  menuItems,
  itemVariants,
  itemExtras,
} from "@workspace/db/schema";
import { eq, asc, count } from "drizzle-orm";

const router = Router();

router.get("/menu/categories", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));

    const itemCounts = await db
      .select({ categoryId: menuItems.categoryId, count: count() })
      .from(menuItems)
      .groupBy(menuItems.categoryId);

    const countMap = new Map(itemCounts.map((r) => [r.categoryId, Number(r.count)]));

    res.json(rows.map((c) => ({ ...c, itemCount: countMap.get(c.id) ?? 0 })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/menu/items", async (req, res) => {
  try {
    const categoryId = req.query["categoryId"]
      ? Number(req.query["categoryId"])
      : undefined;
    const available =
      req.query["available"] !== undefined
        ? req.query["available"] === "true"
        : undefined;
    const featured =
      req.query["featured"] !== undefined
        ? req.query["featured"] === "true"
        : undefined;

    const rows = await db.query.menuItems.findMany({
      with: { category: true, variants: true, extras: true },
      where: (item, { and, eq: eqFn }) => {
        const conditions = [];
        if (categoryId !== undefined) conditions.push(eqFn(item.categoryId, categoryId));
        if (available !== undefined) conditions.push(eqFn(item.available, available));
        if (featured !== undefined) conditions.push(eqFn(item.featured, featured));
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      orderBy: [asc(menuItems.sortOrder), asc(menuItems.id)],
    });

    res.json(
      rows.map((i) => ({
        ...i,
        price: Number(i.price),
        variants: i.variants.map((v) => ({ ...v, price: Number(v.price) })),
        extras: i.extras.map((e) => ({ ...e, price: Number(e.price) })),
        category: i.category ? { ...i.category } : undefined,
      })),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/menu/items/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const item = await db.query.menuItems.findFirst({
      with: { category: true, variants: true, extras: true },
      where: (i, { eq: eqFn }) => eqFn(i.id, id),
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({
      ...item,
      price: Number(item.price),
      variants: item.variants.map((v) => ({ ...v, price: Number(v.price) })),
      extras: item.extras.map((e) => ({ ...e, price: Number(e.price) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
