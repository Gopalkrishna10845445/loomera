"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { motion } from "motion/react";
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
      className="product-card group flex flex-col justify-between bg-white p-3 sm:p-3.5 shadow-[0_2px_12px_rgba(38,70,83,0.04)] border border-[#e8e4db] transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#2A9D8F]/50 rounded-xl h-full"
      data-testid={`product-card-${product.id}`}
    >
      <div>
        {/* Imagery Frame */}
        <div className="relative w-full aspect-square bg-[#fbf9f4] overflow-hidden mb-3 rounded-lg border border-[#f0ede6]">
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
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </Link>

          {/* Promotional Badge */}
          {product.badge && (
            <span
              className={`absolute top-2 left-2 font-sans text-[10px] uppercase px-2 py-0.5 rounded shadow-xs font-bold tracking-wider ${
                product.badge.toLowerCase().includes("new")
                  ? "bg-[#F4ED4F] text-[#264653]"
                  : "bg-[#E76F51] text-white"
              }`}
            >
              {product.badge}
            </span>
          )}

          {/* Wishlist Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
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
            title={isFavorited ? "Saved to Wishlist" : "Save to Wishlist"}
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/85 hover:bg-white flex items-center justify-center text-[#525547] hover:text-[#E76F51] transition-colors shadow-xs cursor-pointer focus-luxury z-10"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isFavorited
                  ? "text-[#E76F51] fill-[#E76F51]"
                  : "text-[#525547] hover:text-[#E76F51]"
              }`}
            />
          </motion.button>

          {/* Quick Add Button on Hover/Focus/Touch */}
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Quick add ${product.title} in ${selectedSwatch}`}
            className={`absolute bottom-0 inset-x-0 font-sans text-[11px] sm:text-xs uppercase py-2 sm:py-2.5 tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer focus-luxury font-semibold z-10 active:scale-98 ${
              justAdded
                ? "bg-[#2A9D8F] text-white opacity-100 translate-y-0"
                : "bg-[#264653]/95 sm:bg-[#264653] text-white hover:bg-[#E76F51] opacity-90 sm:opacity-0 translate-y-0 sm:translate-y-full sm:group-hover:opacity-100 sm:group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Added to Bag</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Quick Add</span>
              </>
            )}
          </button>
        </div>

        {/* Info Section */}
        <div className="flex flex-col gap-1">
          {/* Category Eyebrow */}
          <span className="font-sans text-[10px] sm:text-[11px] uppercase tracking-wider text-[#2A9D8F] font-semibold line-clamp-1">
            {product.category}
          </span>

          {/* Title - line-clamp-2 prevents truncation on narrow mobile screens while preserving elegant height */}
          <Link
            href={`/products/${product.id}`}
            className="font-serif text-[13.5px] sm:text-[15px] font-bold text-[#264653] hover:text-[#2A9D8F] transition-colors line-clamp-2 min-h-[2.4rem] leading-snug"
          >
            {product.title}
          </Link>
        </div>
      </div>

      {/* Footer: Price + Color Swatches */}
      <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#f0ede6]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-sans text-xs sm:text-sm text-[#264653] font-bold">
            {formatInr(product.price)}
          </span>
          {product.isOnSale && product.originalPrice && (
            <span className="font-sans text-[10.5px] sm:text-xs text-[#787770] line-through font-normal">
              {formatInr(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Color Swatch Dots */}
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
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full inline-block shadow-inner border transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-[#264653] ring-offset-1 scale-110 border-transparent"
                    : "border-black/20 hover:scale-110"
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
