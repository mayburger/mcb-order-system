/**
 * Seed global option groups for pizzas.
 *
 * Groups:
 *  1. "Pizza-Größe"  – single, required, absolute  (replaces base price)
 *  2. "Pizza-Extras" – multiple, optional, additive (added on top)
 *
 * Extra-topping price depends on the selected size:
 *   29 cm → +0,70 €   |   32 cm → +0,90 €
 *
 * Run: pnpm --filter @workspace/scripts exec tsx ./src/seed-option-groups.ts
 */
import { db } from "@workspace/db";
import {
  optionGroups,
  optionItems,
  categoryOptionGroups,
  itemOptionPrices,
  categories,
  menuItems,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

// ─── Pizza extra toppings ────────────────────────────────────────────────────
const PIZZA_TOPPINGS = [
  "Schinken (Truthahn)",
  "Salami (Rind)",
  "Champignons",
  "Paprika",
  "Zwiebeln",
  "Oliven",
  "Mais",
  "Jalapeños",
  "Rucola",
  "Thunfisch",
  "Artischocken",
  "Spinat",
  "Extra Käse",
  "Peperoni (scharf)",
  "Knoblauch",
];

// ─── Known pizza size prices (name → [29cm price, 32cm price]) ───────────────
const PIZZA_PRICES: Record<string, [number, number]> = {
  "Pizzabrot":               [7.90,  8.90],
  "Pizza Margherita":        [10.50, 11.50],
  "Pizza Salami":            [11.40, 12.40],
  "Pizza Prosciutto":        [11.40, 12.40],
  "Pizza Funghi":            [11.40, 12.40],
  "Pizza Domenico":          [11.90, 12.90],
  "Pizza Diavola":           [12.80, 13.50],
  "Pizza Prosciutto e Funghi":[11.70, 12.70],
  "Pizza Tonno":             [12.80, 13.80],
  "Pizza Speziale":          [12.40, 13.40],
  "Pizza Capricciosa":       [12.80, 13.80],
  "Pizza Vegetarisch":       [12.40, 13.40],
};

async function main() {
  console.log("🍕 Seeding global option groups…");

  // ── 1. Remove existing option groups (idempotent re-run) ──────────────────
  // Delete in order to avoid FK violations
  await db.delete(categoryOptionGroups);
  await db.delete(itemOptionPrices);
  // optionItems cascade from optionGroups
  await db.delete(optionGroups);
  console.log("  ✓ Cleared existing option groups");

  // ── 2. Create "Pizza-Größe" group ─────────────────────────────────────────
  const [sizeGroup] = await db
    .insert(optionGroups)
    .values({
      name: "Pizza-Größe",
      slug: "pizza-groesse",
      description: "Wähle die gewünschte Größe",
      inputType: "single",
      required: true,
      priceType: "absolute",
      sortOrder: 1,
    })
    .returning();

  console.log(`  ✓ Created group: ${sizeGroup!.name} (id=${sizeGroup!.id})`);

  const [item29, item32] = await db
    .insert(optionItems)
    .values([
      { groupId: sizeGroup!.id, name: "29 cm", defaultPrice: "0", sortOrder: 1 },
      { groupId: sizeGroup!.id, name: "32 cm", defaultPrice: "0", sortOrder: 2 },
    ])
    .returning();

  console.log(`  ✓ Size options: ${item29!.name}, ${item32!.name}`);

  // ── 3. Create "Pizza-Extras" group ────────────────────────────────────────
  const [extrasGroup] = await db
    .insert(optionGroups)
    .values({
      name: "Pizza-Extras",
      slug: "pizza-extras",
      description: "Wähle optionale Extra-Zutaten",
      inputType: "multiple",
      required: false,
      priceType: "additive",
      sortOrder: 2,
    })
    .returning();

  console.log(`  ✓ Created group: ${extrasGroup!.name} (id=${extrasGroup!.id})`);

  // Price depends on selected size via priceByVariant
  await db.insert(optionItems).values(
    PIZZA_TOPPINGS.map((name, i) => ({
      groupId: extrasGroup!.id,
      name,
      defaultPrice: "0.70",
      priceByVariant: { "29 cm": 0.70, "32 cm": 0.90 } as Record<string, number>,
      sortOrder: i + 1,
    }))
  );

  console.log(`  ✓ ${PIZZA_TOPPINGS.length} extra toppings created`);

  // ── 4. Link pizza category to both groups ─────────────────────────────────
  const [pizzaCat] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, "pizza"));

  if (!pizzaCat) {
    console.error("  ✗ Pizza category not found – run seed-menu.ts first");
    process.exit(1);
  }

  await db.insert(categoryOptionGroups).values([
    { categoryId: pizzaCat.id, groupId: sizeGroup!.id, sortOrder: 1 },
    { categoryId: pizzaCat.id, groupId: extrasGroup!.id, sortOrder: 2 },
  ]);
  console.log(`  ✓ Linked groups to category "${pizzaCat.name}" (id=${pizzaCat.id})`);

  // ── 5. Set per-item prices for each pizza (29cm / 32cm) ───────────────────
  const pizzaItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.categoryId, pizzaCat.id));

  let pricesInserted = 0;
  const pricesToInsert: Array<{ menuItemId: number; optionItemId: number; price: string }> = [];

  for (const pizza of pizzaItems) {
    const prices = PIZZA_PRICES[pizza.name];
    if (!prices) {
      console.warn(`  ⚠ No price data for "${pizza.name}", skipping`);
      continue;
    }
    pricesToInsert.push(
      { menuItemId: pizza.id, optionItemId: item29!.id, price: prices[0].toFixed(2) },
      { menuItemId: pizza.id, optionItemId: item32!.id, price: prices[1].toFixed(2) },
    );
    pricesInserted += 2;
  }

  if (pricesToInsert.length > 0) {
    await db.insert(itemOptionPrices).values(pricesToInsert);
  }
  console.log(`  ✓ ${pricesInserted} per-item size prices inserted`);

  console.log("\n✅ Option groups seed complete!");
  console.log(`   Group "${sizeGroup!.name}": 2 sizes`);
  console.log(`   Group "${extrasGroup!.name}": ${PIZZA_TOPPINGS.length} toppings`);
  console.log(`   Category "${pizzaCat.name}": linked to both groups`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
