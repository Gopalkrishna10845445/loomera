import React from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CollectionsGrid from "@/components/CollectionsGrid";
import BenefitsStrip from "@/components/BenefitsStrip";
import NewArrivalsGrid from "@/components/NewArrivalsGrid";
import FeaturedCollectionsBanner from "@/components/FeaturedCollectionsBanner";
import BestSellersGrid from "@/components/BestSellersGrid";
import BrandStorySection from "@/components/BrandStorySection";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { getProductsFromDb } from "@/lib/products";
import { Product } from "@/types";

export default async function HomePage() {
  let products: Product[] = [];
  try {
    products = await getProductsFromDb();
  } catch (err) {
    console.error("Database unavailable on homepage render, falling back to mock catalog:", err);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 3-Tier Commercial Header */}
      <Header />

      <main className="w-full">
        {/* Section 1 — Hero Campaign */}
        <HeroSection />

        {/* Commercial Assurance Benefits */}
        <BenefitsStrip />

        {/* Section 2 — Category Shopping (MEN & BOYS) */}
        <CollectionsGrid />

        {/* Section 3 — New Arrivals */}
        <NewArrivalsGrid products={products.length > 0 ? products : undefined} />

        {/* Section 4 — Featured Collections (Editorial Banners) */}
        <FeaturedCollectionsBanner />

        {/* Section 5 — Best Sellers */}
        <BestSellersGrid products={products.length > 0 ? products : undefined} />

        {/* Section 6 — Brand Story & Textile Heritage */}
        <BrandStorySection />
      </main>

      {/* Section 8 — Full-Width Structured Footer with Newsletter */}
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
