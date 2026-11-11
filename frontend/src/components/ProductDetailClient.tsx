"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CartProvider, useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { Heart, ShoppingBag, Truck, Check, Share2, ShieldCheck, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { Product } from "@/types";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

function ProductDetailContent({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const [selectedColor, setSelectedColor] = useState(
    product.swatches[0]?.name || "Natural"
  );
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "Standard");
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const { addToCart, openSizeModal, toggleWishlist, isInWishlist } = useCart();

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/products/${product.id}?utm_source=whatsapp&utm_medium=social_share&utm_campaign=product_share`;
    const shareText = `Explore "${product.title}" crafted from natural luxury fibres at LOOMERA: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  const isWishlisted = isInWishlist(product.title);

  useEffect(() => {
    // Record product view in background
    fetch("/api/history/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    }).catch(() => {});
  }, [product.id]);

  const handleAddToCart = () => {
    addToCart(product, selectedColor, selectedSize, qty);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1400);
  };

  return (
    <main className="w-full pt-36 pb-space-3xl">
      <div className="max-w-[1440px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-label-caps text-[10px] uppercase text-[#474741] mb-space-lg">
          <Link href="/" className="hover:text-[#264653] transition-colors focus-luxury rounded">
            Atelier
          </Link>
          <span>/</span>
          <Link
            href={`/collections/${product.categorySlug}`}
            className="hover:text-[#264653] transition-colors focus-luxury rounded"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-[#264653] font-bold">{product.title}</span>
        </div>

        {/* Product Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop">
          {/* Column 1: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="relative w-full aspect-[4/5] bg-surface-container overflow-hidden border border-stitch shadow-sm group rounded-xs">
              <Image
                src={product.image}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 bg-[#E76F51] text-white font-label-caps text-label-caps uppercase px-3 py-1.5 shadow tracking-wider font-semibold rounded-2xs">
                {product.badge}
              </span>
            </div>

            {/* Micro Provenance Highlights */}
            <div className="grid grid-cols-2 gap-space-md bg-surface-container-low p-space-md border border-stitch rounded-xs">
              <div>
                <span className="font-label-caps text-[10px] uppercase text-[#474741] block font-semibold">
                  Origin &bull; Provenance
                </span>
                <span className="font-label-interactive text-[#264653] font-bold">
                  {product.origin}
                </span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] uppercase text-[#474741] block font-semibold">
                  Fabric Weight
                </span>
                <span className="font-label-interactive text-[#264653] font-bold">
                  {product.weight}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Purchasing Controls & Story */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            <div className="border-b border-stitch pb-space-lg">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-[#2A9D8F] uppercase tracking-widest font-bold">
                  {product.category}
                </span>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleWishlist(product.title)}
                  className="flex items-center gap-1.5 font-label-caps text-[11px] text-[#474741] hover:text-[#E76F51] transition-colors uppercase cursor-pointer focus-luxury rounded p-1 font-semibold"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isWishlisted ? "text-[#E76F51] fill-[#E76F51]" : ""
                    }`}
                  />
                  <span>{isWishlisted ? "Saved" : "Save"}</span>
                </motion.button>
              </div>

              <h1 className="font-headline-lg text-headline-lg text-[#264653] mt-1">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-3 mt-2">
                <p className="font-label-price text-label-price text-[#264653] text-2xl font-bold">
                  {formatInr(product.price)}
                </p>
                {product.isOnSale && product.originalPrice && (
                  <>
                    <p className="font-label-price text-[#787770] text-lg line-through font-normal">
                      {formatInr(product.originalPrice)}
                    </p>
                    <span className="bg-[#E76F51] text-white font-label-caps text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Save {product.discountPercent}%
                    </span>
                  </>
                )}
              </div>
              <p className="font-body-md text-body-md text-[#474741] mt-space-md leading-relaxed">
                {product.desc}
              </p>
            </div>

            {/* Color Swatches */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-label-caps uppercase text-[#474741] font-semibold">
                  Textile Tone
                </span>
                <span className="font-label-interactive text-[#264653] font-bold">
                  {selectedColor}
                </span>
              </div>
              <div className="flex items-center gap-space-sm pt-1">
                {product.swatches.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    title={swatch.name}
                    aria-label={`Select tone ${swatch.name}`}
                    onClick={() => setSelectedColor(swatch.name)}
                    className={`w-7 h-7 rounded-full transition-transform focus-luxury cursor-pointer ${
                      selectedColor === swatch.name
                        ? "ring-2 ring-[#264653] ring-offset-2 ring-offset-surface scale-110 shadow-sm"
                        : "hover:scale-105 opacity-80"
                    }`}
                    style={{ backgroundColor: swatch.color }}
                  />
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-label-caps uppercase text-[#474741] font-semibold">
                  Select Size
                </span>
                <button
                  type="button"
                  onClick={openSizeModal}
                  className="font-label-caps text-[10px] text-[#2A9D8F] hover:text-[#264653] transition-colors uppercase underline focus-luxury font-semibold"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`py-3 text-center font-label-interactive text-label-interactive transition-colors border focus-luxury cursor-pointer rounded-2xs ${
                      selectedSize === s
                        ? "bg-[#264653] text-white font-bold border-[#264653] shadow-sm"
                        : "bg-surface-container-high hover:bg-[#2A9D8F]/15 text-[#264653] border-stitch"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Scarcity & Urgency Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xs bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
              <span>Limited Artisanal Batch — Only 2 pieces remaining in size {selectedSize}</span>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <div className="flex gap-space-md">
                <div className="flex items-center border border-stitch bg-surface-container rounded-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-12 h-14 flex items-center justify-center font-bold hover:bg-[#2A9D8F]/15 text-[#264653] transition-colors focus-luxury cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-label-interactive font-bold text-[#264653]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-12 h-14 flex items-center justify-center font-bold hover:bg-[#2A9D8F]/15 text-[#264653] transition-colors focus-luxury cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  className={`flex-1 font-label-interactive text-label-interactive uppercase py-4 tracking-widest transition-colors duration-200 flex items-center justify-center gap-space-sm cursor-pointer focus-luxury shadow-md rounded-xs font-semibold ${
                    isAdded
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-[#E76F51] text-white hover:bg-[#d45d3f]"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-5 h-5 stroke-[2]" />
                      <span>Added to Atelier Bag</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                      <span>Add to Atelier Bag</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Guarantees & Trust Signals Strip */}
              <div className="grid grid-cols-2 gap-3 py-3 px-3.5 rounded-xs bg-stone-100/70 border border-stone-200/80 my-1">
                <div className="flex items-center gap-2 text-xs text-stone-700">
                  <RefreshCw className="w-3.5 h-3.5 text-[#2A9D8F] shrink-0" />
                  <span>15-Day Doorstep Returns</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F] shrink-0" />
                  <span>100% Certified Pure Fibres</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-space-sm text-[#474741] font-body-sm text-body-sm">
                  <Truck className="w-4 h-4 text-[#2A9D8F] stroke-[1.75]" />
                  <span>Complimentary insured shipping on orders over {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors focus-luxury cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span className="underline">Share</span>
                </button>
              </div>
            </div>

            {/* Craft & Care Tabs */}
            <div className="border-t border-stitch pt-space-lg flex flex-col gap-space-sm">
              <h4 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                Atelier Craftsmanship
              </h4>
              <p className="font-body-sm text-body-sm text-[#474741] leading-relaxed">
                {product.craftDetail ||
                  "Hand-finished by third-generation tailor guilds using unbleached threads and natural buttons."}
              </p>
              <h4 className="font-title-editorial text-title-editorial text-[#264653] font-bold mt-2">
                Textile Care
              </h4>
              <p className="font-body-sm text-body-sm text-[#474741] leading-relaxed">
                {product.fabricCare ||
                  "Machine wash cold delicate in organic laundry wash. Line dry in shade."}
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-space-3xl pt-space-2xl border-t border-stitch">
          <div className="mb-space-xl">
            <span className="font-label-caps text-label-caps text-[#2A9D8F] uppercase tracking-widest font-bold">
              Harmonious Complements
            </span>
            <h3 className="font-headline-md text-headline-md text-[#264653] mt-1">
              CURATED ATELIER PAIRINGS
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductDetailClient({
  product,
  relatedProducts,
}: ProductDetailClientProps) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <ProductDetailContent product={product} relatedProducts={relatedProducts} />
        <Footer />
        <CartDrawer />
        <SearchModal />
        <SizeGuideModal />
        <ToastNotification />
        <AiAssistantWidget />
      </div>
    </CartProvider>
  );
}
