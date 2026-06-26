/**
 * Full menu seed — syncs all categories & items from the Excel export.
 * Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING for categories,
 * upserts items by (name, categoryId).
 */
import { db } from "@workspace/db";
import { categories, menuItems, optionGroups, optionItems, categoryOptionGroups, itemOptionPrices } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ── Data ───────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Pizza",           slug: "pizza",           description: "Alle Pizzen werden mit hausgemachter Tomatensauce und Käse zubereitet.", sortOrder: 1 },
  { name: "Burger",          slug: "burger",          description: "Alle Gerichte werden mit Salat, Tomaten, Zwiebeln und Gurken zubereitet.", sortOrder: 2 },
  { name: "Hähnchen",        slug: "haehnchen",       description: "Frisches Grillhähnchen, täglich verfügbar.", sortOrder: 3 },
  { name: "Beilagen",        slug: "beilagen",        description: "", sortOrder: 4 },
  { name: "Pasta",           slug: "pasta",           description: "", sortOrder: 5 },
  { name: "Salate",          slug: "salate",          description: "", sortOrder: 6 },
  { name: "Veggie / Vegan",  slug: "veggie-vegan",    description: "", sortOrder: 7 },
  { name: "Alkoholfreie Getränke", slug: "getraenke", description: "", sortOrder: 8 },
];

// Items: { name, description, price (number for simple, [p29, p32] for pizza), category }
const ITEMS: Array<{
  name: string; description: string; price: number | [number, number]; category: string; sortOrder?: number;
}> = [
  // ── Pizza ──────────────────────────────────────────────────────────────────
  { name: "Pizzabrot",                description: "mit Kräuter, Knoblauch oder Tomatensauce",                                                         price: [7.90, 8.90],   category: "pizza", sortOrder: 1  },
  { name: "Pizza Margherita",         description: "mit hausgemachter Tomatensauce und Käse",                                                           price: [10.50, 11.50], category: "pizza", sortOrder: 2  },
  { name: "Pizza Salami",             description: "mit Rindersalami",                                                                                  price: [11.40, 12.40], category: "pizza", sortOrder: 3  },
  { name: "Pizza Prosciutto",         description: "mit Truthahnschinken",                                                                              price: [11.40, 12.40], category: "pizza", sortOrder: 4  },
  { name: "Pizza Funghi",             description: "mit frischen Champignons",                                                                          price: [11.40, 12.40], category: "pizza", sortOrder: 5  },
  { name: "Pizza Domenico",           description: "mit Rindersalami und frischen Champignons",                                                         price: [11.90, 12.90], category: "pizza", sortOrder: 6  },
  { name: "Pizza Prosciutto e Funghi",description: "mit Truthahnschinken und frischen Champignons",                                                     price: [11.70, 12.70], category: "pizza", sortOrder: 7  },
  { name: "Pizza Capricciosa",        description: "mit Rindersalami, Truthahnschinken, Champignons und Paprika",                                       price: [12.80, 13.80], category: "pizza", sortOrder: 8  },
  { name: "Pizza Tonno",              description: "mit Thunfisch und Zwiebel",                                                                         price: [12.80, 13.80], category: "pizza", sortOrder: 9  },
  { name: "Pizza Speziale",           description: "mit Rindersalami, Zwiebel, scharfer Peperoni und Knoblauch",                                       price: [12.40, 13.40], category: "pizza", sortOrder: 10 },
  { name: "Pizza Diavola",            description: "mit Rindersalami und scharfer Peperoni",                                                            price: [12.80, 13.50], category: "pizza", sortOrder: 11 },
  { name: "Pizza Vegetarisch",        description: "mit Brokkoli, Zwiebeln, Paprika, Mais und Käse",                                                    price: [12.40, 13.40], category: "pizza", sortOrder: 12 },

  // ── Burger ────────────────────────────────────────────────────────────────
  { name: "Cheeseburger",             description: "mit 180g Rindfleisch-Patty, Cheddar und Sauce nach Wahl",                                           price: 11.50, category: "burger", sortOrder: 1  },
  { name: "Chickenburger",            description: "mit 135g Crunchy Chicken-Patty und Sauce nach Wahl",                                                price: 10.00, category: "burger", sortOrder: 2  },
  { name: "Hamburger",                description: "mit 180g Rindfleisch-Patty und Sauce nach Wahl",                                                    price: 10.50, category: "burger", sortOrder: 3  },
  { name: "Cheeseburger Bacon",       description: "mit 180g Rindfleisch-Patty, Cheddar, Beef Bacon (Rind) und Sauce nach Wahl",                       price: 13.00, category: "burger", sortOrder: 4  },
  { name: "Chili-Cheeseburger",       description: "mit 180g Rindfleisch-Patty, Cheddar und Sauce nach Wahl",                                          price: 11.50, category: "burger", sortOrder: 5  },
  { name: "Bacon & Egg Burger",       description: "mit 180g Rindfleisch-Patty, Spiegelei, Beef-Bacon (Rind) und Sauce nach Wahl",                     price: 13.00, category: "burger", sortOrder: 6  },
  { name: "Hot-Jalapeno-Cheeseburger",description: "mit 180g Rindfleisch-Patty, Cheddar, Jalapeños und Sauce nach Wahl",                               price: 12.00, category: "burger", sortOrder: 7  },
  { name: "Black Angus Burger",       description: "mit 200g saftiges Black Angus Patty, Cheddar und Sauce nach Wahl",                                  price: 17.00, category: "burger", sortOrder: 8  },
  { name: "Sucuk Burger",             description: "250g Sucuk-Patty, Ei und Cheddar",                                                                  price: 12.50, category: "burger", sortOrder: 9  },
  { name: "Kids Cheeseburger",        description: "mit 100g Rindfleisch-Patty, Cheddar und Sauce nach Wahl",                                           price:  9.50, category: "burger", sortOrder: 10 },
  { name: "Kids Hamburger",           description: "mit 100g Rindfleisch-Patty und Sauce nach Wahl",                                                    price:  8.50, category: "burger", sortOrder: 11 },

  // ── Hähnchen ──────────────────────────────────────────────────────────────
  { name: "Halbes Hähnchen",          description: "Ab sofort wieder jeden Tag verfügbar.",                                                             price:  7.00, category: "haehnchen", sortOrder: 1 },
  { name: "Ganzes Hähnchen",          description: "Ab sofort wieder jeden Tag verfügbar.",                                                             price: 14.00, category: "haehnchen", sortOrder: 2 },
  { name: "Sweet Chilli Sauce",       description: "14g/11ml süße Chilli Sauce für Hähnchen, pikant",                                                   price:  1.00, category: "haehnchen", sortOrder: 3 },

  // ── Beilagen ──────────────────────────────────────────────────────────────
  { name: "Pommes frites",            description: "",                                                                                                   price:  4.50, category: "beilagen", sortOrder: 1  },
  { name: "Twisters Pommes (Curly Fries)", description: "",                                                                                             price:  4.70, category: "beilagen", sortOrder: 2  },
  { name: "Süßkartoffel-Pommes",      description: "",                                                                                                   price:  4.70, category: "beilagen", sortOrder: 3  },
  { name: "Wedges",                   description: "",                                                                                                   price:  4.50, category: "beilagen", sortOrder: 4  },
  { name: "Chicken Nuggets (6 Stück)",description: "",                                                                                                   price:  5.40, category: "beilagen", sortOrder: 5  },
  { name: "Nuggets mit Pommes (5 Stück)", description: "",                                                                                              price:  7.80, category: "beilagen", sortOrder: 6  },
  { name: "Mozzarella-Sticks (6 Stück)", description: "Mozzarella-Sticks im Bierteig",                                                                 price:  6.40, category: "beilagen", sortOrder: 7  },
  { name: "Chili-Cheese Nuggets (6 Stück)", description: "Chili-Cheese-Nuggets mit Jalapeño- und Chili-Stückchen",                                     price:  6.40, category: "beilagen", sortOrder: 8  },
  { name: "Zwiebelringe (8 Stück)",   description: "Zwiebelringe im Bierteig",                                                                          price:  5.40, category: "beilagen", sortOrder: 9  },
  { name: "Gemüse Nuggets (6 Stück)", description: "Knusper-Gemüse-Nuggets, Cornflakes-Panade",                                                        price:  5.40, category: "beilagen", sortOrder: 10 },
  { name: "Krautsalat (Coleslaw)",    description: "",                                                                                                   price:  4.50, category: "beilagen", sortOrder: 11 },
  { name: "Ketchup",                  description: "",                                                                                                   price:  0.50, category: "beilagen", sortOrder: 12 },
  { name: "Mayonnaise",               description: "",                                                                                                   price:  0.50, category: "beilagen", sortOrder: 13 },
  { name: "Sour Cream",               description: "",                                                                                                   price:  0.50, category: "beilagen", sortOrder: 14 },

  // ── Pasta ─────────────────────────────────────────────────────────────────
  { name: "Rigatoni al Forno",        description: "",                                                                                                   price:  9.40, category: "pasta", sortOrder: 1 },
  { name: "Combinazione",             description: "Rigatoni, Lasagne und Tortellini",                                                                  price:  9.40, category: "pasta", sortOrder: 2 },
  { name: "Lasagne",                  description: "mit Rinderhackfleischfüllung, Tomaten- und Bechamelsauce",                                          price:  9.40, category: "pasta", sortOrder: 3 },
  { name: "Tortellini al Forno",      description: "",                                                                                                   price:  9.40, category: "pasta", sortOrder: 4 },
  { name: "Gnocchi al Forno",         description: "",                                                                                                   price:  9.40, category: "pasta", sortOrder: 5 },

  // ── Salate ────────────────────────────────────────────────────────────────
  { name: "Gemischter Salat",         description: "Grüner Salat mit Tomaten und Gurken",                                                               price:  6.20, category: "salate", sortOrder: 1 },
  { name: "Chicken Salat",            description: "Gemischter Salat mit Zwiebeln, Oliven und crunchy Chicken",                                         price: 10.20, category: "salate", sortOrder: 2 },
  { name: "Italienischer Salat",      description: "Gemischter Salat mit Käse, Truthahnschinken und Ei",                                                price:  9.20, category: "salate", sortOrder: 3 },
  { name: "Tomaten Mozzarella Salat", description: "",                                                                                                   price:  8.20, category: "salate", sortOrder: 4 },

  // ── Veggie / Vegan ────────────────────────────────────────────────────────
  { name: "Umami Master Burger (Vegan)",         description: "110g Veganer Burger aus saftigen Pilzen und sonnengetrockneten Tomaten mit Hafer",       price: 10.50, category: "veggie-vegan", sortOrder: 1 },
  { name: "Plant Crunchy Chicken Burger (Vegan)",description: "90g Veganer Burger auf Basis von Weizeneiweiß mit knusprig-scharfer Cornflakes-Panade",  price:  9.00, category: "veggie-vegan", sortOrder: 2 },
  { name: "Green Oat Burger (Vegan)",            description: "110g Veganer Burger auf Basis von Haferflocken und grünem Gemüse",                        price: 10.50, category: "veggie-vegan", sortOrder: 3 },

  // ── Alkoholfreie Getränke ─────────────────────────────────────────────────
  { name: "Cola 0,33l",                description: "Coca-Cola",                     price: 2.50, category: "getraenke", sortOrder: 1 },
  { name: "Cola Zero Sugar 0,33l",     description: "Volle Power, null Zucker",      price: 2.50, category: "getraenke", sortOrder: 2 },
  { name: "Fanta 0,33l",               description: "Fanta Orange",                  price: 2.50, category: "getraenke", sortOrder: 3 },
  { name: "Mezzo Mix 0,33l",           description: "Mezzo Mix",                     price: 2.50, category: "getraenke", sortOrder: 4 },
  { name: "Durstlöscher Eistee Pfirsich 0,5l", description: "",                      price: 1.50, category: "getraenke", sortOrder: 5 },
  { name: "Durstlöscher Eistee Zitrone 0,5l",  description: "",                      price: 1.50, category: "getraenke", sortOrder: 6 },
];

// ── Option groups from Excel ───────────────────────────────────────────────────
// Burger sauce (single, required, free – all options are free → additive but price 0)
const BURGER_SAUCE_ITEMS = [
  "Barbecuesauce", "Standard Burgersauce", "Ketchup-Mayo", "Ohne Sauce",
];
const CHILI_SAUCE_ITEMS = ["Chili-Cheese Burgersauce", "Chili-Barbecuesauce"];

// Pasta extras (multiple, optional, additive 0.70€)
const PASTA_EXTRA_ITEMS = ["Bolognese Sauce", "Brokkoli", "Gorgonzola", "Spinat"];

// Pizza extras (already seeded, but verify completeness)
const PIZZA_EXTRA_ITEMS = [
  "Rindersalami", "Truthahnschinken", "Champignons", "Thunfisch", "Zwiebeln",
  "Paprika", "Mais", "Brokkoli", "Scharfe Peperoni", "Knoblauch", "Extra Käse",
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🍽️  Full menu seed…");

  // 1. Upsert categories
  console.log("\n📂 Categories…");
  const catMap = new Map<string, number>(); // slug → id
  for (const cat of CATEGORIES) {
    const existing = await db.query.categories.findFirst({ where: (c, { eq: eq2 }) => eq2(c.slug, cat.slug) });
    if (existing) {
      catMap.set(cat.slug, existing.id);
      console.log(`  ✓ Exists: ${cat.name} (id=${existing.id})`);
    } else {
      const [row] = await db.insert(categories).values(cat).returning();
      catMap.set(cat.slug, row.id);
      console.log(`  ✓ Created: ${cat.name} (id=${row.id})`);
    }
  }

  // 2. Upsert items
  console.log("\n🍕 Items…");
  let created = 0, updated = 0;
  const pizzaCatId = catMap.get("pizza")!;
  const pizzaItems: number[] = []; // collect pizza item ids for option price seeding

  for (const item of ITEMS) {
    const catId = catMap.get(item.category);
    if (!catId) { console.log(`  ⚠️ Unknown category slug "${item.category}" for "${item.name}"`); continue; }

    // For pizza items with two-size prices, use the 29cm price as the base price
    const basePrice = Array.isArray(item.price) ? item.price[0] : item.price;
    const existing = await db.query.menuItems.findFirst({
      where: (i, { and: and2, eq: eq2 }) => and2(eq2(i.name, item.name), eq2(i.categoryId, catId))
    });
    if (existing) {
      await db.update(menuItems).set({
        description: item.description || null,
        price: String(basePrice),
        sortOrder: item.sortOrder ?? 0,
        available: true,
      }).where(eq(menuItems.id, existing.id));
      if (catId === pizzaCatId) pizzaItems.push(existing.id);
      updated++;
    } else {
      const [row] = await db.insert(menuItems).values({
        name: item.name,
        description: item.description || null,
        price: String(basePrice),
        categoryId: catId,
        sortOrder: item.sortOrder ?? 0,
        available: true,
        featured: false,
      }).returning();
      if (catId === pizzaCatId) pizzaItems.push(row.id);
      created++;
    }
  }
  console.log(`  ${created} created, ${updated} updated`);

  // 3. Option groups — burger sauce
  console.log("\n🧄 Burger-Sauce option group…");
  let burgerSauceGroup = await db.query.optionGroups.findFirst({ where: (g, { eq: eq2 }) => eq2(g.slug, "burger-sauce") });
  if (!burgerSauceGroup) {
    [burgerSauceGroup] = await db.insert(optionGroups).values({
      name: "Sauce auswählen", slug: "burger-sauce", inputType: "single",
      required: true, priceType: "additive", sortOrder: 10,
    }).returning();
    console.log(`  ✓ Created group "Sauce auswählen"`);
  }
  // Ensure all sauce items exist
  const existingBSItems = await db.select().from(optionItems).where(eq(optionItems.groupId, burgerSauceGroup.id));
  const existingBSNames = new Set(existingBSItems.map((i) => i.name));
  for (let i = 0; i < BURGER_SAUCE_ITEMS.length; i++) {
    const name = BURGER_SAUCE_ITEMS[i];
    if (!existingBSNames.has(name)) {
      await db.insert(optionItems).values({ groupId: burgerSauceGroup.id, name, defaultPrice: "0", sortOrder: i });
      console.log(`  ✓ Added sauce: ${name}`);
    }
  }
  // Link to Burger category
  const burgerCatId = catMap.get("burger")!;
  if (burgerCatId) {
    await db.insert(categoryOptionGroups).values({ categoryId: burgerCatId, groupId: burgerSauceGroup.id }).onConflictDoNothing();
    console.log(`  ✓ Linked Burger-Sauce to Burger`);
  }

  // 4. Chili burger sauce group
  console.log("\n🌶️  Chili-Sauce option group…");
  let chiliSauceGroup = await db.query.optionGroups.findFirst({ where: (g, { eq: eq2 }) => eq2(g.slug, "chili-sauce") });
  if (!chiliSauceGroup) {
    [chiliSauceGroup] = await db.insert(optionGroups).values({
      name: "Chili Sauce", slug: "chili-sauce", inputType: "single",
      required: false, priceType: "additive", sortOrder: 11,
    }).returning();
  }
  const existingCSItems = await db.select().from(optionItems).where(eq(optionItems.groupId, chiliSauceGroup.id));
  const existingCSNames = new Set(existingCSItems.map((i) => i.name));
  for (let i = 0; i < CHILI_SAUCE_ITEMS.length; i++) {
    const name = CHILI_SAUCE_ITEMS[i];
    if (!existingCSNames.has(name)) {
      await db.insert(optionItems).values({ groupId: chiliSauceGroup.id, name, defaultPrice: "0", sortOrder: i });
    }
  }

  // 5. Pasta extras
  console.log("\n🍝 Pasta-Extras option group…");
  let pastaExtraGroup = await db.query.optionGroups.findFirst({ where: (g, { eq: eq2 }) => eq2(g.slug, "pasta-extras") });
  if (!pastaExtraGroup) {
    [pastaExtraGroup] = await db.insert(optionGroups).values({
      name: "Pasta Extras", slug: "pasta-extras", inputType: "multiple",
      required: false, priceType: "additive", sortOrder: 10,
    }).returning();
    console.log(`  ✓ Created "Pasta Extras" group`);
  }
  const existingPEItems = await db.select().from(optionItems).where(eq(optionItems.groupId, pastaExtraGroup.id));
  const existingPENames = new Set(existingPEItems.map((i) => i.name));
  for (let i = 0; i < PASTA_EXTRA_ITEMS.length; i++) {
    const name = PASTA_EXTRA_ITEMS[i];
    if (!existingPENames.has(name)) {
      await db.insert(optionItems).values({ groupId: pastaExtraGroup.id, name, defaultPrice: "0.70", sortOrder: i });
      console.log(`  ✓ Added pasta extra: ${name}`);
    }
  }
  const pastaCatId = catMap.get("pasta")!;
  if (pastaCatId) {
    await db.insert(categoryOptionGroups).values({ categoryId: pastaCatId, groupId: pastaExtraGroup.id }).onConflictDoNothing();
    console.log(`  ✓ Linked Pasta-Extras to Pasta`);
  }

  // 6. Verify pizza option prices for all current pizza items
  console.log("\n🍕 Pizza option prices for all pizza items…");
  const pizzaSizeGroup = await db.query.optionGroups.findFirst({ where: (g, { eq: eq2 }) => eq2(g.slug, "pizza-groesse") });
  if (pizzaSizeGroup) {
    const sizeItems = await db.select().from(optionItems).where(eq(optionItems.groupId, pizzaSizeGroup.id));
    const size29 = sizeItems.find((i) => i.name.includes("29"));
    const size32 = sizeItems.find((i) => i.name.includes("32"));

    // Get all current pizza items from DB
    const allPizzaItems = await db.query.menuItems.findMany({
      where: (i, { eq: eq2 }) => eq2(i.categoryId, pizzaCatId),
    });

    // Build name → price from ITEMS array
    const pizzaPriceMap = new Map<string, [number, number]>();
    for (const item of ITEMS) {
      if (item.category === "pizza" && Array.isArray(item.price)) {
        pizzaPriceMap.set(item.name, item.price as [number, number]);
      }
    }

    let priceCount = 0;
    for (const pizza of allPizzaItems) {
      const prices = pizzaPriceMap.get(pizza.name);
      if (!prices) continue;
      if (size29) {
        await db.insert(itemOptionPrices).values({
          menuItemId: pizza.id, optionItemId: size29.id, price: String(prices[0])
        }).onConflictDoUpdate({
          target: [itemOptionPrices.menuItemId, itemOptionPrices.optionItemId],
          set: { price: String(prices[0]) }
        });
        priceCount++;
      }
      if (size32) {
        await db.insert(itemOptionPrices).values({
          menuItemId: pizza.id, optionItemId: size32.id, price: String(prices[1])
        }).onConflictDoUpdate({
          target: [itemOptionPrices.menuItemId, itemOptionPrices.optionItemId],
          set: { price: String(prices[1]) }
        });
        priceCount++;
      }
    }
    console.log(`  ✓ ${priceCount} pizza option prices upserted`);
  }

  console.log("\n✅ Full menu seed complete!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
