import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { pool } from "../src/db";

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Applying safe, non-destructive schema additions...");
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS original_price_inr INTEGER;
    `);
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
    `);
    console.log("✓ Added original_price_inr and display_order columns if not present.");

    // Update display_order based on existing catalog order so featured sort remains stable
    await client.query(`
      UPDATE products SET display_order = CASE id
        WHEN 'classic-linen-shirt' THEN 1
        WHEN 'handloom-kurta' THEN 2
        WHEN 'linen-trousers' THEN 3
        WHEN 'textured-casual-shirt' THEN 4
        WHEN 'boys-linen-shirt' THEN 5
        WHEN 'classic-kurta' THEN 6
        WHEN 'boys-drawstring-shorts' THEN 7
        WHEN 'kids-romper' THEN 8
        ELSE 99 END;
    `);
    console.log("✓ Initialized display_order for products.");

    // Correct the two USD pricing anomalies discovered in seed:
    // kids-romper (was ₹65) -> ₹1,299
    // boys-drawstring-shorts (was ₹75) -> ₹1,499
    await client.query(`
      UPDATE products 
      SET base_price_inr = 1299, updated_at = NOW() 
      WHERE id = 'kids-romper' AND base_price_inr = 65;
    `);
    await client.query(`
      UPDATE products 
      SET base_price_inr = 1499, updated_at = NOW() 
      WHERE id = 'boys-drawstring-shorts' AND base_price_inr = 75;
    `);
    console.log("✓ Reconciled USD legacy prices for kids-romper (₹1,299) and boys-drawstring-shorts (₹1,499).");

    const res = await client.query(`
      SELECT id, title, base_price_inr, original_price_inr, display_order, category_slug 
      FROM products 
      ORDER BY display_order ASC;
    `);
    console.log("CURRENT PRODUCTS TABLE STATE:");
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
