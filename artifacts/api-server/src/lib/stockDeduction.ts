import { db } from "@workspace/db";
import { stockItems, stockMovements, recipes } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

type DeductItem = {
  menuItemId: number | null;
  itemName: string;
  quantity: number;
};

type Logger = { warn: (obj: unknown, msg?: string) => void };

/**
 * Lagerabbuchung für eine Bestellung – rezeptbasiert.
 *
 * Für jedes bestellte Produkt wird die hinterlegte Rezeptur ausgewertet: pro
 * Zutat wird `Rezeptmenge × Bestellmenge` von der getrackten Zutat abgezogen
 * (gleiche Einheit, keine Umrechnung). Hat ein Produkt keine Rezeptur, greift
 * der Alt-Mechanismus (1:1-Kopplung Produkt↔Lager über `stockItems.menuItemId`).
 *
 * Bewusst tolerant: Fehler werden geloggt, blockieren die Bestellung aber nie.
 */
export async function deductStockForOrder(
  orderId: number,
  items: DeductItem[],
  log: Logger,
): Promise<void> {
  try {
    const menuItemIds = Array.from(
      new Set(items.map((i) => i.menuItemId).filter((id): id is number => id != null)),
    );
    if (menuItemIds.length === 0) return;

    // Alle Rezepturen der bestellten Produkte auf einmal laden.
    const recipeRows = await db
      .select()
      .from(recipes)
      .where(inArray(recipes.menuItemId, menuItemIds));
    const recipesByMenuItem = new Map<number, typeof recipeRows>();
    for (const r of recipeRows) {
      const list = recipesByMenuItem.get(r.menuItemId) ?? [];
      list.push(r);
      recipesByMenuItem.set(r.menuItemId, list);
    }

    // Verbrauch pro Zutat über alle Positionen aggregieren.
    const consumptionByStockItem = new Map<number, number>();
    const legacyMenuItems: DeductItem[] = [];

    for (const ri of items) {
      if (ri.menuItemId == null) continue;
      const recipe = recipesByMenuItem.get(ri.menuItemId);
      if (recipe && recipe.length > 0) {
        for (const line of recipe) {
          const amount = Number(line.quantity) * ri.quantity;
          if (amount === 0) continue;
          consumptionByStockItem.set(
            line.stockItemId,
            (consumptionByStockItem.get(line.stockItemId) ?? 0) + amount,
          );
        }
      } else {
        legacyMenuItems.push(ri);
      }
    }

    // Rezeptbasierte Abbuchung.
    for (const [stockItemId, amount] of consumptionByStockItem) {
      const si = await db.query.stockItems.findFirst({
        where: (s, { eq: eqFn }) => eqFn(s.id, stockItemId),
      });
      if (!si || !si.trackStock) continue;
      const prev = Number(si.currentStock);
      const next = prev - amount;
      await db
        .update(stockItems)
        .set({ currentStock: next.toFixed(2), updatedAt: new Date() })
        .where(eq(stockItems.id, si.id));
      await db.insert(stockMovements).values({
        stockItemId: si.id,
        menuItemId: si.menuItemId,
        itemName: si.name,
        movementType: "sale",
        quantity: (-amount).toFixed(2),
        previousStock: prev.toFixed(2),
        newStock: next.toFixed(2),
        orderId,
      });
    }

    // Alt-Mechanismus: 1:1-Kopplung für Produkte ohne Rezeptur.
    for (const ri of legacyMenuItems) {
      const menuItemId = ri.menuItemId;
      if (menuItemId == null) continue;
      const si = await db.query.stockItems.findFirst({
        where: (s, { eq: eqFn, and: andFn }) =>
          andFn(eqFn(s.menuItemId, menuItemId), eqFn(s.trackStock, true)),
      });
      if (!si) continue;
      const prev = Number(si.currentStock);
      const next = prev - ri.quantity;
      await db
        .update(stockItems)
        .set({ currentStock: next.toFixed(2), updatedAt: new Date() })
        .where(eq(stockItems.id, si.id));
      await db.insert(stockMovements).values({
        stockItemId: si.id,
        menuItemId: ri.menuItemId,
        itemName: ri.itemName,
        movementType: "sale",
        quantity: (-ri.quantity).toFixed(2),
        previousStock: prev.toFixed(2),
        newStock: next.toFixed(2),
        orderId,
      });
    }
  } catch (stockErr) {
    log.warn({ err: stockErr }, "Stock deduction failed for order, continuing");
  }
}
