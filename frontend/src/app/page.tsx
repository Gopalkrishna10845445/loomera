import React from "react";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CollectionsGrid from "@/components/CollectionsGrid";
import BenefitsStrip from "@/components/BenefitsStrip";
import NewArrivalsGrid from "@/components/NewArrivalsGrid";
import FabricInspector from "@/components/FabricInspector";
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
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-[#faf8f5]">
        <Header />

        <main className="w-full">
          <HeroSection />
          <CollectionsGrid />
          <BenefitsStrip />
          <NewArrivalsGrid products={products.length > 0 ? products : undefined} />
          <FabricInspector />
        </main>

        <Footer />

        {/* Global Overlays & Modals */}
        <CartDrawer />
        <SearchModal />
        <SizeGuideModal />
        <ToastNotification />
        <AiAssistantWidget />
      </div>
    </CartProvider>
  );
}
