"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { Heart, ShoppingBag, Truck, Check, Share2, ShieldCheck, RefreshCw } from "lucide-react";
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
    const shareText = `Explore "${product.title}" at LOOMERA: ${shareUrl}`;

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
    <main className="w-full bg-white py-8 sm:py-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-6 font-futura"
        >
          <Link href="/" className="hover:text-black transition-colors">
            HOME
          </Link>
          <span>/</span>
          <Link
            href={`/collections/${product.categorySlug}`}
            className="hover:text-black transition-colors"
          >
            {product.category.toUpperCase()}
          </Link>
          <span>/</span>
          <span className="text-black font-bold truncate">{product.title.toUpperCase()}</span>
        </nav>

        {/* Product Layout Grid: Left Gallery (Col 7), Right Details (Col 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          {/* Column 1: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full aspect-[3/4] bg-[#F5F5F5] rounded-[8px] overflow-hidden border border-[#E5E7EB]">
              <Image
                src={product.image}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center"
              />
              {product.badge && (
                <span className="absolute top-4 left-4 bg-[#051A6E] text-white text-xs uppercase px-3 py-1 font-bold tracking-wider rounded-none">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Micro Specifications */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-[#E5E7EB] rounded-[4px]">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-gray-500 block font-bold">
                  ORIGIN &bull; PROVENANCE
                </span>
                <span className="text-xs font-bold text-black uppercase mt-0.5 block">
                  {product.origin}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-gray-500 block font-bold">
                  FABRIC WEIGHT
                </span>
                <span className="text-xs font-bold text-black uppercase mt-0.5 block">
                  {product.weight}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Purchasing Controls & Editorial Story */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="border-b border-[#E5E7EB] pb-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
                  {product.category}
                </span>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.title)}
                  className="flex items-center gap-1.5 text-xs text-black hover:text-[#D92D20] uppercase font-bold tracking-wider cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isWishlisted ? "text-[#D92D20] fill-[#D92D20]" : "text-black"
                    }`}
                  />
                  <span>{isWishlisted ? "SAVED" : "SAVE TO WISHLIST"}</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight text-black mt-2">
                {product.title}
              </h1>

              {/* Price Block */}
              <div className="flex items-baseline gap-3 mt-3">
                <p className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                  {formatInr(product.price)}
                </p>
                {product.isOnSale && product.originalPrice && (
                  <>
                    <p className="text-lg text-gray-400 line-through font-normal">
                      {formatInr(product.originalPrice)}
                    </p>
                    <span className="bg-[#D92D20] text-white text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-none">
                      SAVE {product.discountPercent}%
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mt-4 leading-relaxed font-normal">
                {product.desc}
              </p>
            </div>

            {/* Color Swatches */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase font-bold tracking-wider text-black">
                  COLOUR:
                </span>
                <span className="font-bold text-[#051A6E] uppercase">
                  {selectedColor}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {product.swatches.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    title={swatch.name}
                    aria-label={`Select tone ${swatch.name}`}
                    onClick={() => setSelectedColor(swatch.name)}
                    className={`w-8 h-8 rounded-full border transition-all cursor-pointer ${
                      selectedColor === swatch.name
                        ? "ring-2 ring-black ring-offset-2 scale-110 border-transparent"
                        : "border-gray-300 hover:scale-105"
                    }`}
                    style={{ backgroundColor: swatch.color }}
                  />
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase font-bold tracking-wider text-black">
                  SELECT SIZE:
                </span>
                <button
                  type="button"
                  onClick={openSizeModal}
                  className="text-xs font-bold uppercase underline tracking-wider text-[#051A6E] hover:text-black cursor-pointer"
                >
                  SIZE GUIDE
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`py-3 text-center text-xs font-bold uppercase transition-colors border cursor-pointer rounded-none ${
                      selectedSize === s
                        ? "bg-black text-white border-black"
                        : "bg-white text-black border-[#E5E7EB] hover:border-black"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Availability Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 border border-[#E5E7EB] text-xs font-medium text-gray-800">
              <span className="w-2 h-2 rounded-full bg-[#027A48] shrink-0" />
              <span>In stock and ready to dispatch. Limited small-batch edition.</span>
            </div>

            {/* Quantity and Add to Bag */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                {/* Quantity Stepper */}
                <div className="flex items-center border border-[#E5E7EB] h-12 bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-full flex items-center justify-center font-bold text-black hover:bg-gray-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xs font-bold text-black">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-10 h-full flex items-center justify-center font-bold text-black hover:bg-gray-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Primary Add to Bag Button (44px/48px Square Navy CTA) */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 h-12 text-xs uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer rounded-none ${
                    isAdded
                      ? "bg-[#027A48] text-white"
                      : "btn-primary"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>ADDED TO BAG</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>ADD TO BAG</span>
                    </>
                  )}
                </button>
              </div>

              {/* Guarantees & Reassurance */}
              <div className="grid grid-cols-2 gap-3 py-3 px-4 bg-gray-50 border border-[#E5E7EB] text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#051A6E] shrink-0" />
                  <span>15-Day Doorstep Returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#051A6E] shrink-0" />
                  <span>100% Certified Pure Flax</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-black shrink-0" />
                  <span>Free express delivery on orders over {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 uppercase font-bold text-black hover:text-[#051A6E] cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Product Details & Fabric Care Accordion / Content */}
            <div className="border-t border-[#E5E7EB] pt-6 flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                  TEXTILE DETAILS
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {product.craftDetail ||
                    "Expertly tailored from long-staple flax yarns. Breathable weave with mother-of-pearl buttons."}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                  CARE INSTRUCTIONS
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {product.fabricCare ||
                    "Machine wash cold delicate with mild liquid detergent. Line dry in shade. Warm iron while slightly damp."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Grid */}
        <div className="mt-16 pt-12 border-t border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E7EB]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
                YOU MIGHT ALSO LIKE
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mt-0.5">
                RELATED STYLES
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.slice(0, 4).map((p) => (
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
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <ProductDetailContent product={product} relatedProducts={relatedProducts} />
      <Footer />
      <CartDrawer />
      <SearchModal />
      <SizeGuideModal />
      <ToastNotification />
      <AiAssistantWidget />
    </div>
  );
}
