import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

async function run(query: string, params: unknown[] = []) {
  await db.execute(sql.raw(query));
}

async function migrate() {
  console.log("Running restaurant schema migration...");

  // Enums (safe create via DO block, one per execute)
  await db.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE order_type AS ENUM ('delivery', 'pickup');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `));

  await db.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('pending','confirmed','preparing','ready','delivering','completed','cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `));

  await db.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE discount_type AS ENUM ('percentage','fixed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      category_id INTEGER NOT NULL REFERENCES restaurant_categories(id) ON DELETE CASCADE,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      order_type order_type NOT NULL,
      status order_status NOT NULL DEFAULT 'pending',
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      delivery_address TEXT,
      postal_code TEXT,
      city TEXT,
      notes TEXT,
      subtotal NUMERIC(10,2) NOT NULL,
      delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      total NUMERIC(10,2) NOT NULL,
      coupon_code TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES restaurant_orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES restaurant_items(id) ON DELETE SET NULL,
      item_name TEXT NOT NULL,
      item_price NUMERIC(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      line_total NUMERIC(10,2) NOT NULL
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_opening_hours (
      id SERIAL PRIMARY KEY,
      day_of_week INTEGER NOT NULL UNIQUE,
      day_name TEXT NOT NULL,
      open_time TEXT,
      close_time TEXT,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_delivery_areas (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      min_order NUMERIC(10,2) NOT NULL DEFAULT 0,
      delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_coupons (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      discount_type discount_type NOT NULL,
      discount_value NUMERIC(10,2) NOT NULL,
      min_order NUMERIC(10,2) DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at TIMESTAMP,
      usage_count INTEGER NOT NULL DEFAULT 0,
      max_usage INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS restaurant_settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    )
  `));

  console.log("Tables created.");

  // Seed opening hours
  const days = [
    { dow: 0, name: "Sunday",    open: "12:00", close: "21:00" },
    { dow: 1, name: "Monday",    open: "11:00", close: "22:00" },
    { dow: 2, name: "Tuesday",   open: "11:00", close: "22:00" },
    { dow: 3, name: "Wednesday", open: "11:00", close: "22:00" },
    { dow: 4, name: "Thursday",  open: "11:00", close: "22:00" },
    { dow: 5, name: "Friday",    open: "11:00", close: "23:00" },
    { dow: 6, name: "Saturday",  open: "11:00", close: "23:00" },
  ];
  for (const d of days) {
    await db.execute(sql.raw(`
      INSERT INTO restaurant_opening_hours (day_of_week, day_name, open_time, close_time, is_closed)
      VALUES (${d.dow}, '${d.name}', '${d.open}', '${d.close}', false)
      ON CONFLICT (day_of_week) DO NOTHING
    `));
  }

  // Seed settings
  const defaultSettings: [string, string][] = [
    ["restaurantName",       "May Chicken & Burger"],
    ["tagline",              "Bold Flavors. Real Fast."],
    ["address",              "123 Main Street, City Centre, London"],
    ["phone",                "+44 20 1234 5678"],
    ["email",                "hello@maychicken.com"],
    ["deliveryEnabled",      "true"],
    ["pickupEnabled",        "true"],
    ["minDeliveryOrder",     "15"],
    ["estimatedDeliveryTime","30"],
    ["estimatedPickupTime",  "15"],
    ["adminUsername",        "admin"],
  ];
  for (const [key, value] of defaultSettings) {
    await db.execute(sql.raw(`
      INSERT INTO restaurant_settings (key, value) VALUES ('${key}', '${value.replace(/'/g, "''")}')
      ON CONFLICT (key) DO NOTHING
    `));
  }

  // Seed categories & items
  const catCheck = await db.execute(sql.raw(`SELECT id FROM restaurant_categories LIMIT 1`));
  if (catCheck.rows.length === 0) {
    await db.execute(sql.raw(`
      INSERT INTO restaurant_categories (name, slug, description, sort_order) VALUES
        ('Burgers', 'burgers', 'Juicy handcrafted burgers', 1),
        ('Chicken', 'chicken', 'Crispy fried & grilled chicken', 2),
        ('Pizza',   'pizza',   'Stone-baked premium pizzas', 3),
        ('Sides',   'sides',   'Perfect accompaniments', 4),
        ('Drinks',  'drinks',  'Cold refreshing beverages', 5)
    `));

    const cats = await db.execute(sql.raw(`SELECT id, slug FROM restaurant_categories`));
    const catMap = new Map(cats.rows.map((r) => [r.slug as string, r.id as number]));

    const b = catMap.get("burgers")!;
    const ch = catMap.get("chicken")!;
    const p = catMap.get("pizza")!;
    const s = catMap.get("sides")!;
    const d = catMap.get("drinks")!;

    await db.execute(sql.raw(`
      INSERT INTO restaurant_items (name, description, price, category_id, available, featured, sort_order) VALUES
        ('Classic Smash Burger',   'Two smashed patties, American cheese, pickles, special sauce', 9.99,  ${b},  true, true, 1),
        ('BBQ Bacon Burger',       'Beef patty, crispy bacon, BBQ sauce, caramelised onions',      11.99, ${b},  true, true, 2),
        ('Double Stack',           'Double beef, double cheese, lettuce, tomato, house sauce',      13.99, ${b},  true, false, 3),
        ('Mushroom Swiss Burger',  'Beef patty, sautéed mushrooms, Swiss cheese, garlic aioli',    10.99, ${b},  true, false, 4),
        ('Crispy Chicken Burger',  'Crispy fried chicken fillet, coleslaw, hot sauce',              9.49,  ${ch}, true, true, 1),
        ('Grilled Chicken Wrap',   'Grilled chicken, lettuce, tomato, garlic mayo in tortilla',    8.99,  ${ch}, true, false, 2),
        ('Chicken Strips 6pc',     'Golden fried chicken strips with dipping sauce',                7.99,  ${ch}, true, false, 3),
        ('Spicy Chicken Burger',   'Crispy chicken, jalapeños, sriracha mayo, pickles',            10.49, ${ch}, true, true, 4),
        ('Margherita Pizza',       'San Marzano tomato, fresh mozzarella, basil',                  11.99, ${p},  true, false, 1),
        ('Pepperoni Supreme',      'Double pepperoni, mozzarella, tomato sauce',                   13.99, ${p},  true, true, 2),
        ('BBQ Chicken Pizza',      'Grilled chicken, BBQ sauce, red onion, mozzarella',            13.49, ${p},  true, false, 3),
        ('Loaded Fries',           'Crispy fries, cheese sauce, bacon bits, jalapeños',             5.99,  ${s},  true, false, 1),
        ('Onion Rings',            'Beer-battered onion rings with dipping sauce',                  4.49,  ${s},  true, false, 2),
        ('Coleslaw',               'Creamy homemade coleslaw',                                      2.49,  ${s},  true, false, 3),
        ('Coca-Cola',              '330ml can',                                                     1.99,  ${d},  true, false, 1),
        ('Sprite',                 '330ml can',                                                     1.99,  ${d},  true, false, 2),
        ('Still Water',            '500ml bottle',                                                  1.49,  ${d},  true, false, 3),
        ('Milkshake',              'Thick vanilla, chocolate or strawberry shake',                  4.99,  ${d},  true, false, 4)
    `));
    console.log("Seeded categories and items.");
  }

  // Seed delivery areas
  const areaCheck = await db.execute(sql.raw(`SELECT id FROM restaurant_delivery_areas LIMIT 1`));
  if (areaCheck.rows.length === 0) {
    await db.execute(sql.raw(`
      INSERT INTO restaurant_delivery_areas (name, postal_code, min_order, delivery_fee, active) VALUES
        ('City Centre',  'E1 1AA',  15.00, 1.99, true),
        ('North District','N1 1AA', 15.00, 2.49, true),
        ('East Side',    'E2 2BB',  20.00, 2.99, true),
        ('South End',    'SE1 1BB', 20.00, 2.99, true),
        ('West Quarter', 'W1 1AA',  25.00, 3.49, true)
    `));
    console.log("Seeded delivery areas.");
  }

  // Seed coupons
  const couponCheck = await db.execute(sql.raw(`SELECT id FROM restaurant_coupons LIMIT 1`));
  if (couponCheck.rows.length === 0) {
    await db.execute(sql.raw(`
      INSERT INTO restaurant_coupons (code, description, discount_type, discount_value, min_order, active) VALUES
        ('WELCOME10', '10% off your first order', 'percentage', 10, 15, true),
        ('SAVE5',     'Save £5 on orders over £30', 'fixed', 5, 30, true)
    `));
    console.log("Seeded coupons.");
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
