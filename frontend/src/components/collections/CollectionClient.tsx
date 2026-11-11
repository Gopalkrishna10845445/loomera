"use client";

import React, { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import CollectionHero from "@/components/collections/CollectionHero";
import CategoryChips from "@/components/collections/CategoryChips";
import CollectionFilterBar, {
  FilterState,
} from "@/components/collections/CollectionFilterBar";
import CraftsmanshipStory from "@/components/collections/CraftsmanshipStory";
import EmptyState from "@/components/collections/EmptyState";
import { PRODUCTS } from "@/data/mockData";
import { COLLECTIONS_CONFIG, CollectionConfig } from "@/data/collectionsData";
import { Product } from "@/types";

/**
 * Attribute-driven category chip classification.
 * Eliminates hardcoded product IDs completely to ensure catalog scalability.
 */
function matchesCategoryChip(product: Product, chip: string): boolean {
  const normChip = chip.toLowerCase().trim();
  const title = product.title.toLowerCase();
  const desc = product.desc.toLowerCase();
  const craft = (product.craftDetail || "").toLowerCase();
  const origin = product.origin.toLowerCase();
  const badge = product.badge.toLowerCase();

  // All / Default selection
  if (
    normChip.startsWith("all ") ||
    normChip === "all products" ||
    normChip === "all"
  ) {
    return true;
  }

  // Linen Shirts
  if (normChip === "linen shirts" || normChip.includes("linen shirt")) {
    return (
      (title.includes("shirt") || desc.includes("shirt")) &&
      (title.includes("linen") || desc.includes("linen") || origin.includes("linen") || origin.includes("flax"))
    );
  }

  // Trousers
  if (normChip === "trousers" || normChip.includes("trouser") || normChip.includes("pant")) {
    return title.includes("trouser") || desc.includes("trouser") || title.includes("pant") || desc.includes("pant");
  }

  // Kurtas / Handloom Kurtas
  if (normChip.includes("kurta")) {
    return title.includes("kurta") || desc.includes("kurta");
  }

  // Casual Wear
  if (normChip === "casual wear" || normChip.includes("casual")) {
    return title.includes("casual") || desc.includes("casual") || badge.includes("casual");
  }

  // Festive Wear / Festive Collection
  if (normChip.includes("festive")) {
    return title.includes("kurta") || craft.includes("charkha") || craft.includes("hand-rolled");
  }

  // Everyday Essentials
  if (normChip === "everyday essentials" || normChip.includes("essentials")) {
    return true;
  }

  // Cotton Essentials
  if (normChip === "cotton essentials") {
    return desc.includes("cotton") || craft.includes("cotton") || origin.includes("cotton") || origin.includes("bengal");
  }

  // Heritage Styles / Traditional
  if (normChip.includes("heritage") || normChip.includes("traditional")) {
    return product.categorySlug === "handloom" || craft.length > 0 || origin.includes("bengal") || origin.includes("guild");
  }

  // Categories currently without matching inventory in catalog (Co-ord Sets, Matching Outfits, Handwoven Shirts)
  if (
    normChip.includes("co-ord") ||
    normChip.includes("matching outfit") ||
    normChip.includes("handwoven shirt")
  ) {
    return false;
  }

  // Generic attribute fallback
  return title.includes(normChip) || desc.includes(normChip);
}

interface CollectionClientProps {
  categorySlug: string;
  initialProducts?: Product[];
}

export default function CollectionClient({
  categorySlug,
  initialProducts,
}: CollectionClientProps) {
  // Resolve config or fallback
  const normalizedKey = (
    categorySlug.toLowerCase() === "kids" ? "boys" : categorySlug.toLowerCase()
  ) as "men" | "boys" | "handloom" | "new-arrivals";

  const config: CollectionConfig =
    COLLECTIONS_CONFIG[normalizedKey] || COLLECTIONS_CONFIG["men"];

  const isMen = normalizedKey === "men";
  const isBoys = normalizedKey === "boys";
  const isHandloom = normalizedKey === "handloom";
  const isNewArrivals = normalizedKey === "new-arrivals";

  // Selected Category Pill / Tab
  const defaultCategory = config.categories[0] || "All";
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);

  // Active Catalog: use database-backed initialProducts if provided, fallback safely to PRODUCTS
  const catalog = initialProducts && initialProducts.length > 0 ? initialProducts : PRODUCTS;

  // Filter & Sort State
  const [filters, setFilters] = useState<FilterState>({
    department: isNewArrivals ? "All" : undefined,
    category: undefined,
    priceRange: undefined,
    size: undefined,
    color: undefined,
    inStockOnly: false,
    sortBy: isNewArrivals ? "newest" : "featured",
  });

  // Base Products corresponding to the collection
  const baseProducts = useMemo(() => {
    if (isMen) {
      // Adult menswear: men's wardrobe + adult kurtas
      return catalog.filter(
        (p) => p.categorySlug === "men" || p.categorySlug === "handloom"
      );
    }
    if (isBoys) {
      // Strictly boys and kids garments; no adult clothes
      return catalog.filter(
        (p) => p.categorySlug === "boys" || p.categorySlug === "kids"
      );
    }
    if (isHandloom) {
      // Verified handloom garments
      return catalog.filter((p) => p.categorySlug === "handloom");
    }
    // New Arrivals: All products
    return catalog;
  }, [catalog, isMen, isBoys, isHandloom]);

  // Filtered Products matching category chip & filter state
  const displayedProducts = useMemo(() => {
    return baseProducts.filter((product) => {
      // 1. Category Chips logic (attribute & relationship driven, zero hardcoded IDs)
      if (!isNewArrivals && selectedCategory && selectedCategory !== defaultCategory) {
        if (!matchesCategoryChip(product, selectedCategory)) {
          return false;
        }
      }

      // 2. Department filter (mainly for New Arrivals)
      if (filters.department && filters.department !== "All") {
        if (filters.department === "Men") {
          if (product.categorySlug !== "men") return false;
        } else if (filters.department === "Boys") {
          if (product.categorySlug !== "boys" && product.categorySlug !== "kids")
            return false;
        } else if (filters.department === "Handloom") {
          if (product.categorySlug !== "handloom") return false;
        }
      }

      // 3. Price Range filter
      if (filters.priceRange && filters.priceRange !== "all") {
        if (filters.priceRange === "under-2000" && product.price >= 2000)
          return false;
        if (
          filters.priceRange === "2000-2700" &&
          (product.price < 2000 || product.price > 2700)
        )
          return false;
        if (filters.priceRange === "above-2700" && product.price <= 2700)
          return false;
      }

      // 4. Size filter
      if (filters.size) {
        if (!product.sizes.includes(filters.size)) return false;
      }

      // 5. Color filter
      if (filters.color) {
        const hasColor = product.swatches.some(
          (s) => s.name.toLowerCase() === filters.color?.toLowerCase()
        );
        if (!hasColor) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === "price-asc") {
        return a.price - b.price;
      }
      if (filters.sortBy === "price-desc") {
        return b.price - a.price;
      }
      if (filters.sortBy === "name-asc") {
        return a.title.localeCompare(b.title);
      }
      if (filters.sortBy === "newest") {
        // Items with 'New' badge first
        const aNew = a.badge.toLowerCase().includes("new") ? 1 : 0;
        const bNew = b.badge.toLowerCase().includes("new") ? 1 : 0;
        return bNew - aNew;
      }
      // 'featured' keeps curated ordering
      return 0;
    });
  }, [baseProducts, isNewArrivals, selectedCategory, defaultCategory, filters]);

  // Aggregate available sizes and colors from baseProducts
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    baseProducts.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return Array.from(set).slice(0, 10);
  }, [baseProducts]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    baseProducts.forEach((p) =>
      p.swatches.forEach((s) => map.set(s.name, s.color))
    );
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [baseProducts]);

  // Dynamic category chip count calculation (database/catalog driven)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    config.categories.forEach((cat) => {
      counts[cat] = baseProducts.filter((p) => matchesCategoryChip(p, cat)).length;
    });
    return counts;
  }, [baseProducts, config.categories]);

  // Reset all filters and category selection
  const handleResetFilters = () => {
    setSelectedCategory(defaultCategory);
    setFilters({
      department: isNewArrivals ? "All" : undefined,
      category: undefined,
      priceRange: undefined,
      size: undefined,
      color: undefined,
      inStockOnly: false,
      sortBy: isNewArrivals ? "newest" : "featured",
    });
  };

  // CTA button handlers
  const handlePrimaryClick = () => {
    if (config.primaryCta.actionType === "filter" && config.primaryCta.filterValue) {
      setSelectedCategory(config.primaryCta.filterValue);
    }
    const target = document.getElementById(config.primaryCta.targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSecondaryClick = () => {
    if (config.secondaryCta.actionType === "filter" && config.secondaryCta.filterValue) {
      setSelectedCategory(config.secondaryCta.filterValue);
    }
    const target = document.getElementById(config.secondaryCta.targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#faf8f5]">
      <Header />

      <main className="w-full">
        {/* 1. Creative Direction Hero */}
        <CollectionHero
          config={config}
          itemCount={baseProducts.length}
          onPrimaryClick={handlePrimaryClick}
          onSecondaryClick={handleSecondaryClick}
        />

        {/* 2. Category Navigation Tabs / Chips (Men, Boys, Handloom) */}
        {!isNewArrivals && (
          <CategoryChips
            categories={config.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            categoryCounts={categoryCounts}
          />
        )}

        {/* 3. Filter and Sorting Controls */}
        <CollectionFilterBar
          filterState={filters}
          onFilterChange={(newFilters) => setFilters(newFilters)}
          onResetFilters={handleResetFilters}
          totalCount={baseProducts.length}
          filteredCount={displayedProducts.length}
          availableSizes={availableSizes}
          availableColors={availableColors}
          isNewArrivalsPage={isNewArrivals}
          departmentOptions={["All", "Men", "Boys", "Handloom"]}
        />

        {/* 4. Product Grid Section */}
        <section
          id="products-grid"
          className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 scroll-mt-28"
          aria-label={`${config.headline} products`}
        >
          {displayedProducts.length === 0 ? (
            <EmptyState
              categoryName={
                selectedCategory !== defaultCategory ? selectedCategory : undefined
              }
              onReset={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {displayedProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={idx < 4}
                />
              ))}
            </div>
          )}
        </section>

        {/* 5. Craftsmanship Story Section (Exclusive to Handloom) */}
        {isHandloom && <CraftsmanshipStory />}
      </main>

      <Footer />

      {/* Global Overlays & Modals */}
      <CartDrawer />
      <SearchModal />
      <SizeGuideModal />
      <ToastNotification />
      <AiAssistantWidget />
    </div>
  );
}
