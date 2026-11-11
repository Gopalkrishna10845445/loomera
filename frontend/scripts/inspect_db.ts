import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db, pool } from "../src/db";
import { products, categories, productVariants, productImages } from "../src/db/schema";

async function main() {
  const prods = await db.select().from(products);
  console.log("PRODUCTS IN DB:");
  console.table(
    prods.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      priceInr: p.basePriceInr,
      category: p.categorySlug,
      badge: p.badge,
      published: p.isPublished,
    }))
  );

  const cats = await db.select().from(categories);
  console.log("CATEGORIES IN DB:");
  console.table(cats.map((c) => ({ slug: c.slug, name: c.name })));

  const variants = await db.select().from(productVariants);
  console.log(`Total Variants: ${variants.length}`);

  const images = await db.select().from(productImages);
  console.log(`Total Images: ${images.length}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
