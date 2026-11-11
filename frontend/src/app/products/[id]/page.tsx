import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlugFromDb, getProductsFromDb } from "@/lib/products";
import { PRODUCTS } from "@/data/mockData";
import { Product } from "@/types";
import { generateProductJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/structured-data";
import ProductDetailClient from "@/components/ProductDetailClient";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  let product: Product | null = null;
  try {
    product = await getProductBySlugFromDb(resolvedParams.id);
  } catch {
    product = PRODUCTS.find((p) => p.id === resolvedParams.id) || null;
  }

  if (!product) {
    return {
      title: "Product Not Found | LOOMERA",
    };
  }

  return {
    title: `${product.title} | LOOMERA Artisanal Atelier`,
    description: product.desc,
    openGraph: {
      title: `${product.title} | LOOMERA`,
      description: product.desc,
      images: [
        {
          url: product.image,
          alt: product.title,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  let product: Product | null = null;
  let relatedProducts: Product[] = [];

  try {
    product = await getProductBySlugFromDb(resolvedParams.id);
    const all = await getProductsFromDb();
    relatedProducts = all.filter((p) => p.id !== resolvedParams.id).slice(0, 4);
  } catch (err) {
    console.error("Database product fetch failed, falling back to mock catalog:", err);
    product = PRODUCTS.find((p) => p.id === resolvedParams.id) || null;
    relatedProducts = PRODUCTS.filter((p) => p.id !== resolvedParams.id).slice(0, 4);
  }

  if (!product) {
    notFound();
  }

  const productJsonLd = generateProductJsonLd(product);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Atelier Home", url: "/" },
    { name: product.category, url: `/collections/${product.category.toLowerCase()}` },
    { name: product.title, url: `/products/${product.id}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
