import { Router } from "express";
import { db } from "@workspace/db";
import {
  categories,
  menuItems,
  itemVariants,
  itemExtras,
  optionGroups,
  optionItems,
  categoryOptionGroups,
  itemOptionGroups,
  itemOptionPrices,
} from "@workspace/db/schema";
import { eq, asc, count, inArray } from "drizzle-orm";

const router = Router();

// ── Helper: resolve option groups for a list of items ─────────────────────────
// Returns a map: menuItemId → resolved OptionGroup[]
async function resolveOptionGroups(itemList: Array<{ id: number; categoryId: number }>) {
  if (itemList.length === 0) return new Map<number, object[]>();

  const itemIds = itemList.map((i) => i.id);
  const catIds = [...new Set(itemList.map((i) => i.categoryId))];

  // Fetch all category-level group links
  const catGroupLinks = await db
    .select()
    .from(categoryOptionGroups)
    .where(inArray(categoryOptionGroups.categoryId, catIds))
    .orderBy(asc(categoryOptionGroups.sortOrder));

  // Fetch all item-level group links (overrides)
  const itemGroupLinks = await db
    .select()
    .from(itemOptionGroups)
    .where(inArray(itemOptionGroups.menuItemId, itemIds))
    .orderBy(asc(itemOptionGroups.sortOrder));

  // Collect all referenced group IDs
  const groupIds = [
    ...new Set([
      ...catGroupLinks.map((l) => l.groupId),
      ...itemGroupLinks.map((l) => l.groupId),
    ]),
  ];
  if (groupIds.length === 0) return new Map<number, object[]>();

  // Fetch groups with their items
  const groups = await db
    .select()
    .from(optionGroups)
    .where(inArray(optionGroups.id, groupIds))
    .orderBy(asc(optionGroups.sortOrder));

  const groupItemRows = await db
    .select()
    .from(optionItems)
    .where(inArray(optionItems.groupId, groupIds))
    .orderBy(asc(optionItems.sortOrder));

  // Fetch per-item prices for absolute groups
  const allPrices = await db
    .select()
    .from(itemOptionPrices)
    .where(inArray(itemOptionPrices.menuItemId, itemIds));

  // Build lookup maps
  const priceMap = new Map<string, number>(); // `${menuItemId}:${optionItemId}` → price
  for (const p of allPrices) {
    priceMap.set(`${p.menuItemId}:${p.optionItemId}`, Number(p.price));
  }

  const groupMap = new Map<number, typeof groups[0]>();
  for (const g of groups) groupMap.set(g.id, g);

  const groupItemsMap = new Map<number, typeof groupItemRows>();
  for (const gi of groupItemRows) {
    const arr = groupItemsMap.get(gi.groupId) ?? [];
    arr.push(gi);
    groupItemsMap.set(gi.groupId, arr);
  }

  // Build category→groupIds map
  const catToGroupIds = new Map<number, number[]>();
  for (const link of catGroupLinks) {
    const arr = catToGroupIds.get(link.categoryId) ?? [];
    arr.push(link.groupId);
    catToGroupIds.set(link.categoryId, arr);
  }

  // Build item→groupIds map (overrides — merged with category groups)
  const itemToExtraGroupIds = new Map<number, number[]>();
  for (const link of itemGroupLinks) {
    const arr = itemToExtraGroupIds.get(link.menuItemId) ?? [];
    arr.push(link.groupId);
    itemToExtraGroupIds.set(link.menuItemId, arr);
  }

  // Resolve groups per item
  const resultMap = new Map<number, object[]>();
  for (const item of itemList) {
    const catGroupIds = catToGroupIds.get(item.categoryId) ?? [];
    const extraGroupIds = itemToExtraGroupIds.get(item.id) ?? [];
    // Merge: category groups + item-specific groups (deduplicated)
    const allGroupIds = [...new Set([...catGroupIds, ...extraGroupIds])];

    const resolved = allGroupIds
      .flatMap((gId) => {
        const group = groupMap.get(gId);
        if (!group) return [];
        const items = (groupItemsMap.get(gId) ?? [])
          .filter((gi) => gi.available)
          .map((gi) => {
            const resolvedPrice =
              group.priceType === "absolute"
                ? (priceMap.get(`${item.id}:${gi.id}`) ?? Number(gi.defaultPrice))
                : Number(gi.defaultPrice);
            return {
              id: gi.id,
              groupId: gi.groupId,
              name: gi.name,
              defaultPrice: resolvedPrice,
              priceByVariant: (gi.priceByVariant as Record<string, number> | null) ?? null,
              sortOrder: gi.sortOrder,
              available: gi.available,
            };
          });
        return [{
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description ?? null,
          inputType: group.inputType,
          required: group.required,
          priceType: group.priceType,
          sortOrder: group.sortOrder,
          items,
        }];
      });

    resultMap.set(item.id, resolved);
  }

  return resultMap;
}

// ── GET /menu/categories ───────────────────────────────────────────────────────
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

// ── GET /menu/items ────────────────────────────────────────────────────────────
router.get("/menu/items", async (req, res) => {
  try {
    const categoryId = req.query["categoryId"] ? Number(req.query["categoryId"]) : undefined;
    const available = req.query["available"] !== undefined ? req.query["available"] === "true" : undefined;
    const featured = req.query["featured"] !== undefined ? req.query["featured"] === "true" : undefined;

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

    const optGroupMap = await resolveOptionGroups(
      rows.map((r) => ({ id: r.id, categoryId: r.categoryId }))
    );

    res.json(
      rows.map((i) => ({
        ...i,
        price: Number(i.price),
        variants: i.variants.map((v) => ({ ...v, price: Number(v.price) })),
        extras: i.extras.map((e) => ({ ...e, price: Number(e.price) })),
        optionGroups: optGroupMap.get(i.id) ?? [],
        category: i.category ? { ...i.category } : undefined,
      })),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /menu/items/:id ────────────────────────────────────────────────────────
router.get("/menu/items/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const item = await db.query.menuItems.findFirst({
      with: { category: true, variants: true, extras: true },
      where: (i, { eq: eqFn }) => eqFn(i.id, id),
    });
    if (!item) return res.status(404).json({ error: "Not found" });

    const optGroupMap = await resolveOptionGroups([{ id: item.id, categoryId: item.categoryId }]);

    res.json({
      ...item,
      price: Number(item.price),
      variants: item.variants.map((v) => ({ ...v, price: Number(v.price) })),
      extras: item.extras.map((e) => ({ ...e, price: Number(e.price) })),
      optionGroups: optGroupMap.get(item.id) ?? [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /menu/option-groups ───────────────────────────────────────────────────
router.get("/menu/option-groups", async (req, res) => {
  try {
    const groups = await db
      .select()
      .from(optionGroups)
      .orderBy(asc(optionGroups.sortOrder), asc(optionGroups.id));

    const groupIds = groups.map((g) => g.id);
    if (groupIds.length === 0) return res.json([]);

    const items = await db
      .select()
      .from(optionItems)
      .where(inArray(optionItems.groupId, groupIds))
      .orderBy(asc(optionItems.sortOrder));

    const catLinks = await db.select().from(categoryOptionGroups);

    const itemsMap = new Map<number, typeof items>();
    for (const i of items) {
      const arr = itemsMap.get(i.groupId) ?? [];
      arr.push(i);
      itemsMap.set(i.groupId, arr);
    }

    const linkedCatMap = new Map<number, number[]>();
    for (const l of catLinks) {
      const arr = linkedCatMap.get(l.groupId) ?? [];
      arr.push(l.categoryId);
      linkedCatMap.set(l.groupId, arr);
    }

    res.json(
      groups.map((g) => ({
        ...g,
        items: (itemsMap.get(g.id) ?? []).map((i) => ({
          ...i,
          defaultPrice: Number(i.defaultPrice),
        })),
        linkedCategoryIds: linkedCatMap.get(g.id) ?? [],
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
