"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/currency";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const isFavorited = isInWishlist(product.title);
  const [justAdded, setJustAdded] = useState(false);
  const [selectedSwatch, setSelectedSwatch] = useState<string>(
    product.swatches[0]?.name || "Natural"
  );

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(
      product,
      selectedSwatch,
      product.sizes[0] || "Standard",
      1
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const handleSwatchClick = (e: React.MouseEvent, swatchName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSwatch(swatchName);
  };

  return (
    <div
      className="product-card group flex flex-col justify-between bg-white border border-[#E5E7EB] hover:border-black transition-colors rounded-[8px] overflow-hidden h-full"
      data-testid={`product-card-${product.id}`}
    >
      <div>
        {/* Imagery Frame with 3:4 Aspect Ratio */}
        <div className="relative w-full aspect-[3/4] bg-[#F5F5F5] overflow-hidden">
          <Link
            href={`/products/${product.id}`}
            className="relative block w-full h-full focus-luxury"
            aria-label={`View ${product.title} - ${formatInr(product.price)}`}
          >
            <Image
              src={product.image}
              alt={product.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </Link>

          {/* ASOS-Style Promotional Badge */}
          {product.badge && (
            <span
              className={`absolute top-2 left-2 text-[11px] uppercase px-2 py-0.5 font-bold tracking-wider rounded-none ${
                product.badge.toLowerCase().includes("new")
                  ? "bg-[#051A6E] text-white"
                  : "bg-[#D92D20] text-white"
              }`}
            >
              {product.badge}
            </span>
          )}

          {/* Minimal Line Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.title);
            }}
            aria-label={
              isFavorited
                ? `Remove ${product.title} from wishlist`
                : `Add ${product.title} to wishlist`
            }
            title={isFavorited ? "Saved in Wishlist" : "Save to Wishlist"}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-black hover:text-[#D92D20] transition-colors cursor-pointer z-10"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorited ? "text-[#D92D20] fill-[#D92D20]" : "text-black"
              }`}
            />
          </button>

          {/* Quick Add Overlay Bar (Square Corners, 44px Height) */}
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Quick add ${product.title} in ${selectedSwatch}`}
            className={`absolute bottom-0 inset-x-0 h-11 text-xs uppercase tracking-wider font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
              justAdded
                ? "bg-[#027A48] text-white opacity-100 translate-y-0"
                : "bg-black/90 text-white hover:bg-[#051A6E] opacity-95 sm:opacity-0 translate-y-0 sm:translate-y-full sm:group-hover:opacity-100 sm:group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>ADDED TO BAG</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>QUICK ADD &bull; {product.sizes[0] || "STD"}</span>
              </>
            )}
          </button>
        </div>

        {/* Product Information */}
        <div className="p-3.5 flex flex-col gap-1.5">
          {/* Category Tag */}
          <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold line-clamp-1">
            {product.category}
          </span>

          {/* Title */}
          <Link
            href={`/products/${product.id}`}
            className="text-[13px] sm:text-[14px] font-bold text-black hover:text-[#051A6E] transition-colors line-clamp-2 min-h-[2.4rem] leading-snug tracking-tight"
          >
            {product.title}
          </Link>
        </div>
      </div>

      {/* Footer: Price + Color Swatches */}
      <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm sm:text-base font-bold text-black tracking-tight">
            {formatInr(product.price)}
          </span>
          {product.isOnSale && product.originalPrice && (
            <span className="text-xs text-gray-400 line-through font-normal">
              {formatInr(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Interactive Color Swatch Dots */}
        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label="Available color swatches"
        >
          {product.swatches.map((swatch) => {
            const isSelected = selectedSwatch === swatch.name;
            return (
              <button
                key={swatch.name}
                type="button"
                onClick={(e) => handleSwatchClick(e, swatch.name)}
                title={`${swatch.name}${isSelected ? " (Selected)" : ""}`}
                aria-label={`Select ${swatch.name} color`}
                className={`w-3.5 h-3.5 rounded-full inline-block border transition-transform cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-black ring-offset-1 scale-110 border-transparent"
                    : "border-gray-300 hover:scale-110"
                }`}
                style={{ backgroundColor: swatch.color }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
