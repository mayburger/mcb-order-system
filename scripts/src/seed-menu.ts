import { db } from "@workspace/db";
import {
  categories,
  menuItems,
  itemVariants,
  itemExtras,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// ─── COMPLETE MENU DATA FROM may-chickenandburger.de ────────────────────────

const categoryData = [
  { name: "Burger", slug: "burger", description: "Alle Gerichte werden mit Salat, Tomaten, Zwiebeln und Gurken zubereitet.", sortOrder: 1 },
  { name: "Pizza", slug: "pizza", description: "Alle Pizzen werden mit hausgemachter Tomatensauce und Käse zubereitet.", sortOrder: 2 },
  { name: "Hähnchen", slug: "haehnchen", description: "Frittiert", sortOrder: 3 },
  { name: "Veggie / Vegan", slug: "veggie-vegan", description: "Vegetarische und vegane Gerichte", sortOrder: 4 },
  { name: "Pasta", slug: "pasta", description: "Alle Gerichte werden mit hausgemachter Tomaten-Sahnesauce zubereitet.", sortOrder: 5 },
  { name: "Salate", slug: "salate", description: "", sortOrder: 6 },
  { name: "Beilagen", slug: "beilagen", description: "", sortOrder: 7 },
  { name: "Getränke", slug: "getraenke", description: "Alkoholfreie Getränke", sortOrder: 8 },
];

interface ProductDef {
  name: string;
  description?: string;
  price: number;
  sortOrder: number;
  featured?: boolean;
  variants?: Array<{ name: string; price: number; sortOrder: number }>;
}

const menuData: Record<string, ProductDef[]> = {
  burger: [
    { name: "Kids Hamburger", description: "mit 100g Rindfleisch-Patty und Sauce nach Wahl. Perfekt für kleine Genießer.", price: 8.50, sortOrder: 1 },
    { name: "Kids Cheeseburger", description: "mit 100g Rindfleisch-Patty Cheddar und Sauce nach Wahl. Perfekt für kleine Genießer.", price: 9.50, sortOrder: 2 },
    { name: "Hamburger", description: "mit 180g Rindfleisch-Patty und Sauce nach Wahl", price: 10.50, sortOrder: 3, featured: true },
    { name: "Chickenburger", description: "mit 135g Crunchy Chicken-Patty und Sauce nach Wahl", price: 10.00, sortOrder: 4, featured: true },
    { name: "Cheeseburger", description: "mit 180g Rindfleisch-Patty, Cheddar und Sauce nach Wahl", price: 11.50, sortOrder: 5, featured: true },
    { name: "Chili-Cheeseburger", description: "mit 180g Rindfleisch-Patty, Cheddar und Sauce nach Wahl", price: 11.50, sortOrder: 6 },
    { name: "Hot-Jalapeño-Cheeseburger", description: "mit 180g Rindfleisch-Patty, Cheddar, Jalapeños und Sauce nach Wahl", price: 12.00, sortOrder: 7 },
    { name: "Cheeseburger Bacon", description: "mit 180g Rindfleisch-Patty, Cheddar, Beef Bacon (Rind) und Sauce nach Wahl", price: 13.00, sortOrder: 8 },
    { name: "Bacon & Egg Burger", description: "mit 180g Rindfleisch-Patty, Spiegelei, Beef-Bacon (Rind) und Sauce nach Wahl", price: 13.00, sortOrder: 9 },
    { name: "Sucuk Burger", description: "Brandneu: Probiere jetzt unseren neuen Sucuk-Burger mit 250g Sucuk-Patty, Ei und Cheddar!", price: 12.50, sortOrder: 10 },
    { name: "Black Angus Burger", description: "mit 200g saftigem Black Angus Patty aus feinster Qualität, perfekt gegrillt und genau das Richtige für echte Burger-Liebhaber.", price: 17.00, sortOrder: 11, featured: true },
  ],
  pizza: [
    {
      name: "Pizzabrot", description: "mit Kräuter, Knoblauch oder Tomatensauce", price: 7.90, sortOrder: 1,
      variants: [{ name: "29 cm", price: 7.90, sortOrder: 1 }, { name: "32 cm", price: 8.90, sortOrder: 2 }],
    },
    {
      name: "Pizza Margherita", description: "mit hausgemachter Tomatensauce und Käse", price: 10.50, sortOrder: 2, featured: true,
      variants: [{ name: "29 cm", price: 10.50, sortOrder: 1 }, { name: "32 cm", price: 11.50, sortOrder: 2 }],
    },
    {
      name: "Pizza Salami", description: "mit Rindersalami", price: 11.40, sortOrder: 3,
      variants: [{ name: "29 cm", price: 11.40, sortOrder: 1 }, { name: "32 cm", price: 12.40, sortOrder: 2 }],
    },
    {
      name: "Pizza Prosciutto", description: "mit Truthahnschinken", price: 11.40, sortOrder: 4,
      variants: [{ name: "29 cm", price: 11.40, sortOrder: 1 }, { name: "32 cm", price: 12.40, sortOrder: 2 }],
    },
    {
      name: "Pizza Funghi", description: "mit frischen Champignons", price: 11.40, sortOrder: 5,
      variants: [{ name: "29 cm", price: 11.40, sortOrder: 1 }, { name: "32 cm", price: 12.40, sortOrder: 2 }],
    },
    {
      name: "Pizza Domenico", description: "mit Rindersalami und frischen Champignons", price: 11.90, sortOrder: 6,
      variants: [{ name: "29 cm", price: 11.90, sortOrder: 1 }, { name: "32 cm", price: 12.90, sortOrder: 2 }],
    },
    {
      name: "Pizza Diavola", description: "mit Rindersalami und scharfer Peperoni", price: 12.80, sortOrder: 7,
      variants: [{ name: "29 cm", price: 12.80, sortOrder: 1 }, { name: "32 cm", price: 13.50, sortOrder: 2 }],
    },
    {
      name: "Pizza Prosciutto e Funghi", description: "mit Truthahnschinken und frischen Champignons", price: 11.70, sortOrder: 8,
      variants: [{ name: "29 cm", price: 11.70, sortOrder: 1 }, { name: "32 cm", price: 12.70, sortOrder: 2 }],
    },
    {
      name: "Pizza Tonno", description: "mit Thunfisch und Zwiebel", price: 12.80, sortOrder: 9,
      variants: [{ name: "29 cm", price: 12.80, sortOrder: 1 }, { name: "32 cm", price: 13.80, sortOrder: 2 }],
    },
    {
      name: "Pizza Speziale", description: "mit Rindersalami, Zwiebel, scharfer Peperoni und Knoblauch", price: 12.40, sortOrder: 10,
      variants: [{ name: "29 cm", price: 12.40, sortOrder: 1 }, { name: "32 cm", price: 13.40, sortOrder: 2 }],
    },
    {
      name: "Pizza Capricciosa", description: "mit Rindersalami, Truthahnschinken, Champignons und Paprika", price: 12.80, sortOrder: 11,
      variants: [{ name: "29 cm", price: 12.80, sortOrder: 1 }, { name: "32 cm", price: 13.80, sortOrder: 2 }],
    },
    {
      name: "Pizza Vegetarisch", description: "mit Brokkoli, Zwiebeln, Paprika, Mais und Käse", price: 12.40, sortOrder: 12,
      variants: [{ name: "29 cm", price: 12.40, sortOrder: 1 }, { name: "32 cm", price: 13.40, sortOrder: 2 }],
    },
  ],
  haehnchen: [
    { name: "Ganzes Hähnchen", description: "Ab sofort wieder jeden Tag verfügbar.", price: 14.00, sortOrder: 1, featured: true },
    { name: "Halbes Hähnchen", description: "Ab sofort wieder jeden Tag verfügbar.", price: 7.00, sortOrder: 2 },
    { name: "Sweet Chilli Sauce für Hähnchen", description: "14g/11ml Süße Chilli Sauce für Hähnchen Pikant", price: 1.00, sortOrder: 3 },
  ],
  "veggie-vegan": [
    { name: "Plant Crunchy Chicken Burger (Vegan)", description: "90g Veganer Burger auf Basis von Weizeneiweiß, mit Hähnchengeschmack, mit knusprig-scharfer Cornflakes-Panade.", price: 9.00, sortOrder: 1 },
    { name: "Green Oat Burger (Vegan)", description: "110g Veganer Burger auf Basis von Haferflocken und grünem Gemüse", price: 10.50, sortOrder: 2 },
    { name: "Umami Master Burger (Vegan)", description: "110g Veganer Burger aus saftigen Pilzen und sonnengetrockneten Tomaten, gepaart mit Hafer für einen fleischigen Biss", price: 10.50, sortOrder: 3 },
    { name: "Gemüse Nuggets 6 Stück (Veggie)", description: "Knusper-Gemüse-Nuggets aus einer Vielzahl von leckeren Gemüsesorten, ummantelt von einer knusprigen Cornflakes-Panade.", price: 5.40, sortOrder: 4 },
  ],
  pasta: [
    { name: "Lasagne", description: "mit Rinderhackfleischfüllung, Tomaten- und Bechamelsauce", price: 9.40, sortOrder: 1 },
    { name: "Rigatoni al Forno", description: "", price: 9.40, sortOrder: 2 },
    { name: "Tortellini al Forno", description: "", price: 9.40, sortOrder: 3 },
    { name: "Gnocchi al Forno", description: "", price: 9.40, sortOrder: 4 },
    { name: "Combinazione", description: "Rigatoni, Lasagne und Tortellini", price: 9.40, sortOrder: 5 },
  ],
  salate: [
    { name: "Gemischter Salat", description: "Grüner Salat mit Tomaten und Gurken", price: 6.20, sortOrder: 1 },
    { name: "Italienischer Salat", description: "Gemischter Salat mit Käse, Truthahnschinken und Ei", price: 9.20, sortOrder: 2 },
    { name: "Tomaten Mozzarella Salat", description: "", price: 8.20, sortOrder: 3 },
    { name: "Chicken Salat", description: "Gemischter Salat mit Zwiebeln, Oliven und crunchy Chicken", price: 10.20, sortOrder: 4, featured: true },
  ],
  beilagen: [
    { name: "Pommes frites", description: "", price: 4.50, sortOrder: 1, featured: true },
    { name: "Twisters Pommes (Curly Fries)", description: "", price: 4.70, sortOrder: 2, featured: true },
    { name: "Süßkartoffel-Pommes", description: "", price: 4.70, sortOrder: 3 },
    { name: "Wedges", description: "", price: 4.50, sortOrder: 4 },
    { name: "Chicken Nuggets 6 Stück", description: "", price: 5.40, sortOrder: 5 },
    { name: "Nuggets mit Pommes (5 Stück)", description: "", price: 7.80, sortOrder: 6 },
    { name: "Chili-Cheese Nuggets 6 Stück", description: "Chili-Cheese-Nuggets mit Jalapeño- und Chili-Stückchen", price: 6.40, sortOrder: 7 },
    { name: "Mozzarella-Sticks 6 Stück", description: "Mozzarella-Sticks im Bierteig", price: 6.40, sortOrder: 8 },
    { name: "Zwiebelringe 8 Stück", description: "Zwiebelringe im Bierteig", price: 5.40, sortOrder: 9 },
    { name: "Krautsalat (Coleslaw)", description: "", price: 4.50, sortOrder: 10 },
    { name: "Ketchup", description: "", price: 0.50, sortOrder: 11 },
    { name: "Mayonnaise", description: "", price: 0.50, sortOrder: 12 },
    { name: "Sour Cream", description: "", price: 0.50, sortOrder: 13 },
  ],
  getraenke: [
    { name: "Cola 0,33l", description: "Kühle Erfrischung für jede Gelegenheit – Coca-Cola. Nicht empfohlen für Kinder und schwangere Frauen.", price: 2.50, sortOrder: 1 },
    { name: "Cola Zero Sugar 0,33l", description: "Volle Power, null Zucker – Cola Zero. Nicht empfohlen für Kinder und schwangere Frauen.", price: 2.50, sortOrder: 2 },
    { name: "Fanta 0,33l", description: "Genieße das Leben in vollen Zügen – mit Fanta.", price: 2.50, sortOrder: 3 },
    { name: "Mezzo Mix 0,33l", description: "Zwei Geschmacksrichtungen, ein Getränk – Mezzo Mix. Nicht empfohlen für Kinder und schwangere Frauen.", price: 2.50, sortOrder: 4 },
    { name: "Durstlöscher Eistee Pfirsich 0,5l", description: "", price: 1.50, sortOrder: 5 },
    { name: "Durstlöscher Eistee Zitrone 0,5l", description: "", price: 1.50, sortOrder: 6 },
  ],
};

async function main() {
  console.log("🌱 Seeding menu data from may-chickenandburger.de...");

  // Clear existing data
  await db.delete(itemVariants);
  await db.delete(itemExtras);
  await db.delete(menuItems);
  await db.delete(categories);

  console.log("✓ Cleared existing data");

  // Insert categories
  const insertedCategories: Record<string, number> = {};
  for (const cat of categoryData) {
    const [row] = await db
      .insert(categories)
      .values(cat)
      .returning();
    insertedCategories[cat.slug] = row!.id;
    console.log(`  ✓ Category: ${cat.name}`);
  }

  // Insert menu items + variants
  let totalItems = 0;
  let totalVariants = 0;

  for (const [slug, products] of Object.entries(menuData)) {
    const categoryId = insertedCategories[slug];
    if (!categoryId) {
      console.warn(`  ⚠ Unknown category slug: ${slug}`);
      continue;
    }

    for (const product of products) {
      const [itemRow] = await db
        .insert(menuItems)
        .values({
          name: product.name,
          description: product.description ?? null,
          price: product.price.toFixed(2),
          categoryId,
          available: true,
          featured: product.featured ?? false,
          sortOrder: product.sortOrder,
        })
        .returning();

      totalItems++;

      // Insert variants (pizza sizes)
      if (product.variants && product.variants.length > 0) {
        for (const v of product.variants) {
          await db.insert(itemVariants).values({
            menuItemId: itemRow!.id,
            name: v.name,
            price: v.price.toFixed(2),
            sortOrder: v.sortOrder,
          });
          totalVariants++;
        }
        console.log(`  ✓ ${product.name} (${product.variants.length} Größen)`);
      } else {
        console.log(`  ✓ ${product.name} — ${product.price.toFixed(2)} €`);
      }
    }
  }

  console.log(`\n✅ Done! Inserted ${totalItems} items, ${totalVariants} variants`);
  console.log("   All prices in EUR from may-chickenandburger.de");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
