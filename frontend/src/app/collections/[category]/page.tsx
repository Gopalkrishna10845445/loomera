import type { Metadata } from "next";
import { CartProvider } from "@/context/CartContext";
import CollectionClient from "@/components/collections/CollectionClient";
import { COLLECTIONS_CONFIG } from "@/data/collectionsData";

interface CollectionPageProps {
  params: Promise<{
    category: string;
  }>;
}

export function generateStaticParams() {
  return [
    { category: "men" },
    { category: "boys" },
    { category: "handloom" },
    { category: "new-arrivals" },
  ];
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.category.toLowerCase();
  const normalizedKey = slug === "kids" ? "boys" : slug;
  const config =
    COLLECTIONS_CONFIG[normalizedKey] || COLLECTIONS_CONFIG["men"];

  return {
    title: config.seoTitle,
    description: config.seoDescription,
    openGraph: {
      title: config.seoTitle,
      description: config.seoDescription,
      images: [
        {
          url: config.heroImage,
          alt: config.heroImageAlt,
        },
      ],
    },
  };
}

import { getProductsFromDb } from "@/lib/products";
import { Product } from "@/types";

export default async function CollectionPage({ params }: CollectionPageProps) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams.category;
  const normalizedCategory =
    categorySlug.toLowerCase() === "kids" ? "boys" : categorySlug.toLowerCase();

  let initialProducts: Product[] = [];
  try {
    if (normalizedCategory === "boys") {
      initialProducts = await getProductsFromDb({ category: "boys" });
    } else if (normalizedCategory === "men") {
      initialProducts = await getProductsFromDb({ category: "men" });
    } else if (normalizedCategory === "handloom") {
      initialProducts = await getProductsFromDb({ category: "handloom" });
    } else {
      initialProducts = await getProductsFromDb({ sort: "newest" });
    }
  } catch (err) {
    console.error("Database unavailable during collection render, fallback activated:", err);
  }

  return (
    <CartProvider>
      <CollectionClient
        categorySlug={categorySlug}
        initialProducts={initialProducts.length > 0 ? initialProducts : undefined}
      />
    </CartProvider>
  );
}

