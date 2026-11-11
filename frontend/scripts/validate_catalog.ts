import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db, pool } from "../src/db";
import { products, productVariants, productImages } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function validateCatalog() {
  const prods = await db.select().from(products);
  console.log(`Checking ${prods.length} products...`);

  for (const p of prods) {
    const vars = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, p.id));
    const imgs = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, p.id));

    console.log(
      `Product [${p.id}]: slug="${p.slug}", price=₹${p.basePriceInr}, cat="${p.categorySlug}", variants=${vars.length}, images=${imgs.length}, published=${p.isPublished}`
    );
  }

  await pool.end();
}

validateCatalog().catch(console.error);
