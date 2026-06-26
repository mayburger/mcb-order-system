import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🔧 Running option groups migration…");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS restaurant_option_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      input_type TEXT NOT NULL DEFAULT 'single',
      required BOOLEAN NOT NULL DEFAULT false,
      price_type TEXT NOT NULL DEFAULT 'additive',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS restaurant_option_items (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES restaurant_option_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      price_by_variant JSONB,
      sort_order INTEGER NOT NULL DEFAULT 0,
      available BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS restaurant_category_option_groups (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES restaurant_categories(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES restaurant_option_groups(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE (category_id, group_id)
    );
    CREATE TABLE IF NOT EXISTS restaurant_item_option_groups (
      id SERIAL PRIMARY KEY,
      menu_item_id INTEGER NOT NULL REFERENCES restaurant_items(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES restaurant_option_groups(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE (menu_item_id, group_id)
    );
    CREATE TABLE IF NOT EXISTS restaurant_item_option_prices (
      id SERIAL PRIMARY KEY,
      menu_item_id INTEGER NOT NULL REFERENCES restaurant_items(id) ON DELETE CASCADE,
      option_item_id INTEGER NOT NULL REFERENCES restaurant_option_items(id) ON DELETE CASCADE,
      price NUMERIC(10,2) NOT NULL,
      UNIQUE (menu_item_id, option_item_id)
    );
    ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS options_snapshot JSONB;
  `);
  console.log("✅ Migration complete");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e.message); process.exit(1); });
