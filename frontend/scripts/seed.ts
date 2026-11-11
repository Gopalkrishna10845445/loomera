import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db, pool } from "../src/db";
import { categories, products, productVariants, productImages } from "../src/db/schema";
import { PRODUCTS } from "../src/data/mockData";
import { COLLECTIONS_CONFIG } from "../src/data/collectionsData";

async function seed() {
  console.log("Starting idempotent LOOMERA catalog seed into PostgreSQL...");

  // 1. Seed Categories
  const categoryRecords = [
    {
      slug: "men",
      name: "Men's Collection",
      creativeDirection: COLLECTIONS_CONFIG["men"].creativeDirection,
      eyebrow: COLLECTIONS_CONFIG["men"].eyebrow,
      headline: COLLECTIONS_CONFIG["men"].headline,
      headlineBreak: COLLECTIONS_CONFIG["men"].headlineBreak || null,
      description: COLLECTIONS_CONFIG["men"].description,
      heroImage: COLLECTIONS_CONFIG["men"].heroImage,
      heroImageAlt: COLLECTIONS_CONFIG["men"].heroImageAlt,
      themeAccent: COLLECTIONS_CONFIG["men"].themeAccent,
      displayOrder: 1,
    },
    {
      slug: "boys",
      name: "Boys' Collection",
      creativeDirection: COLLECTIONS_CONFIG["boys"].creativeDirection,
      eyebrow: COLLECTIONS_CONFIG["boys"].eyebrow,
      headline: COLLECTIONS_CONFIG["boys"].headline,
      headlineBreak: COLLECTIONS_CONFIG["boys"].headlineBreak || null,
      description: COLLECTIONS_CONFIG["boys"].description,
      heroImage: COLLECTIONS_CONFIG["boys"].heroImage,
      heroImageAlt: COLLECTIONS_CONFIG["boys"].heroImageAlt,
      themeAccent: COLLECTIONS_CONFIG["boys"].themeAccent,
      displayOrder: 2,
    },
    {
      slug: "kids",
      name: "Kids Essentials",
      creativeDirection: "LITTLE MOMENTS. TIMELESS STYLE.",
      eyebrow: "MADE FOR LITTLE ADVENTURES",
      headline: "Little Moments.",
      headlineBreak: "Timeless Style.",
      description: "Organic muslin and soft tailoring created for infants and growing explorers.",
      heroImage: COLLECTIONS_CONFIG["boys"].heroImage,
      heroImageAlt: "Kids natural organic garments",
      themeAccent: "#2A9D8F",
      displayOrder: 3,
    },
    {
      slug: "handloom",
      name: "Handloom Heritage",
      creativeDirection: COLLECTIONS_CONFIG["handloom"].creativeDirection,
      eyebrow: COLLECTIONS_CONFIG["handloom"].eyebrow,
      headline: COLLECTIONS_CONFIG["handloom"].headline,
      headlineBreak: COLLECTIONS_CONFIG["handloom"].headlineBreak || null,
      description: COLLECTIONS_CONFIG["handloom"].description,
      heroImage: COLLECTIONS_CONFIG["handloom"].heroImage,
      heroImageAlt: COLLECTIONS_CONFIG["handloom"].heroImageAlt,
      themeAccent: COLLECTIONS_CONFIG["handloom"].themeAccent,
      displayOrder: 4,
    },
    {
      slug: "new-arrivals",
      name: "New Arrivals",
      creativeDirection: COLLECTIONS_CONFIG["new-arrivals"].creativeDirection,
      eyebrow: COLLECTIONS_CONFIG["new-arrivals"].eyebrow,
      headline: COLLECTIONS_CONFIG["new-arrivals"].headline,
      headlineBreak: COLLECTIONS_CONFIG["new-arrivals"].headlineBreak || null,
      description: COLLECTIONS_CONFIG["new-arrivals"].description,
      heroImage: COLLECTIONS_CONFIG["new-arrivals"].heroImage,
      heroImageAlt: COLLECTIONS_CONFIG["new-arrivals"].heroImageAlt,
      themeAccent: COLLECTIONS_CONFIG["new-arrivals"].themeAccent,
      displayOrder: 5,
    },
  ];

  for (const cat of categoryRecords) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: cat.name,
          creativeDirection: cat.creativeDirection,
          eyebrow: cat.eyebrow,
          headline: cat.headline,
          headlineBreak: cat.headlineBreak,
          description: cat.description,
          heroImage: cat.heroImage,
          heroImageAlt: cat.heroImageAlt,
          themeAccent: cat.themeAccent,
          displayOrder: cat.displayOrder,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`✓ Seeded/Updated ${categoryRecords.length} categories.`);

  // 2. Seed Products
  console.log(`Processing ${PRODUCTS.length} source products from mockData.ts...`);

  let variantsCount = 0;
  let imagesCount = 0;

  for (const p of PRODUCTS) {
    // Upsert product
    await db
      .insert(products)
      .values({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.desc,
        basePriceInr: p.price,
        categorySlug: p.categorySlug,
        badge: p.badge || "",
        origin: p.origin || null,
        weightGsm: p.weight || null,
        fabricCare: p.fabricCare || null,
        craftDetail: p.craftDetail || null,
        isPublished: true,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          slug: p.slug,
          title: p.title,
          description: p.desc,
          basePriceInr: p.price,
          categorySlug: p.categorySlug,
          badge: p.badge || "",
          origin: p.origin || null,
          weightGsm: p.weight || null,
          fabricCare: p.fabricCare || null,
          craftDetail: p.craftDetail || null,
          isPublished: true,
          updatedAt: new Date(),
        },
      });

    // Upsert primary image
    await db
      .insert(productImages)
      .values({
        productId: p.id,
        imageUrl: p.image,
        altText: `${p.title} from LOOMERA`,
        isPrimary: true,
        displayOrder: 0,
      })
      .onConflictDoNothing();
    imagesCount++;

    // Upsert variants for each size x swatch
    for (const size of p.sizes) {
      for (const swatch of p.swatches) {
        const cleanColor = swatch.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanSize = size.toLowerCase().replace(/[^a-z0-9]/g, "");
        const sku = `LM-${p.id.toUpperCase()}-${cleanColor.toUpperCase()}-${cleanSize.toUpperCase()}`;

        await db
          .insert(productVariants)
          .values({
            productId: p.id,
            sku,
            size,
            colorName: swatch.name,
            colorHex: swatch.color,
            stockQuantity: 50,
          })
          .onConflictDoNothing();
        variantsCount++;
      }
    }
  }

  console.log(`✓ Seeded/Updated ${PRODUCTS.length} products.`);
  console.log(`✓ Seeded/Verified ${imagesCount} product images.`);
  console.log(`✓ Seeded/Verified ${variantsCount} product variants.`);

  // 3. Verification Query
  const allProducts = await db.select().from(products);
  const allCats = await db.select().from(categories);
  const allVariants = await db.select().from(productVariants);

  console.log("-----------------------------------------");
  console.log(`VERIFICATION TOTALS:`);
  console.log(`Categories in DB: ${allCats.length}`);
  console.log(`Products in DB:   ${allProducts.length} (Expected: ${PRODUCTS.length})`);
  console.log(`Variants in DB:   ${allVariants.length}`);
  console.log("-----------------------------------------");

  if (allProducts.length === PRODUCTS.length) {
    console.log("SEEDING RECONCILIATION SUCCESS: 100% MATCH!");
  } else {
    throw new Error(`Product count mismatch: DB has ${allProducts.length}, expected ${PRODUCTS.length}`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
