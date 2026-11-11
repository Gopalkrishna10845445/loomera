import React from "react";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getAdminProducts } from "@/lib/admin/product-service";
import AdminProductsClient from "@/components/admin/AdminProductsClient";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [productData, categoryRows] = await Promise.all([
    getAdminProducts({ limit: 100 }),
    db.select({ slug: categories.slug, name: categories.name }).from(categories),
  ]);

  return (
    <AdminProductsClient
      initialProducts={productData.products}
      categories={categoryRows}
    />
  );
}
