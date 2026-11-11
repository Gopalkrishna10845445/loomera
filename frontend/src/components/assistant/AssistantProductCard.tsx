"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Check, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { AssistantProduct } from "@/lib/ai/types";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/currency";
import { Product } from "@/types";

interface AssistantProductCardProps {
  product: AssistantProduct;
}

export default function AssistantProductCard({ product }: AssistantProductCardProps) {
  const { addToCart, openCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes[0] || "Standard"
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors[0] || "Natural"
  );
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Map AssistantProduct to standard Product type
    const productObj: Product = {
      id: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      originalPrice: product.originalPrice || undefined,
      discountPercent: product.discountPercent,
      isOnSale: product.isOnSale,
      category: product.category,
      categorySlug: product.category.toLowerCase().includes("boy")
        ? "boys"
        : product.category.toLowerCase().includes("kid")
        ? "kids"
        : product.category.toLowerCase().includes("handloom")
        ? "handloom"
        : "men",
      badge: product.badge || "",
      desc: product.description,
      origin: product.origin || "Artisan Guilds",
      weight: "Standard GSM",
      image: product.image,
      swatches: product.colors.map((c) => ({ name: c, color: "#264653" })),
      sizes: product.sizes,
      fabricCare: product.fabricCare || undefined,
    };

    addToCart(productObj, selectedColor, selectedSize, 1);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      openCart();
    }, 900);
  };

  return (
    <div
      className="bg-white rounded-xl border border-[#e8e4db] p-3 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left group"
      data-testid={`assistant-product-${product.id}`}
    >
      <div>
        {/* Imagery & Badges */}
        <div className="relative w-full aspect-4/3 bg-[#fbf9f4] rounded-lg overflow-hidden mb-2.5 border border-[#f0ede6]">
          <Link href={`/products/${product.id}`} className="block relative w-full h-full">
            <Image
              src={product.image}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, 300px"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </Link>
          {product.badge && (
            <span className="absolute top-2 left-2 text-[9px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded shadow-xs bg-[#264653] text-[#FAF8F5]">
              {product.badge}
            </span>
          )}
          {product.isOnSale && product.discountPercent && (
            <span className="absolute top-2 right-2 text-[9px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded shadow-xs bg-[#E76F51] text-white">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Title & Category */}
        <div className="text-[10px] font-sans uppercase tracking-widest text-[#2A9D8F] font-semibold mb-0.5">
          {product.category}
        </div>
        <Link
          href={`/products/${product.id}`}
          className="font-serif text-sm font-medium text-[#264653] hover:text-[#2A9D8F] line-clamp-1 transition-colors"
        >
          {product.title}
        </Link>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 mt-1 mb-2.5">
          <span className="font-serif text-base font-semibold text-[#264653]">
            {formatInr(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-stone-400 line-through">
              {formatInr(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Size Selection Pills */}
        {product.sizes.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] uppercase font-sans tracking-wider text-stone-500 mb-1">
              Select Size:
            </div>
            <div className="flex flex-wrap gap-1">
              {product.sizes.slice(0, 5).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    selectedSize === s
                      ? "border-[#264653] bg-[#264653] text-white font-medium"
                      : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Selection Pills */}
        {product.colors.length > 1 && (
          <div className="mb-3">
            <div className="text-[10px] uppercase font-sans tracking-wider text-stone-500 mb-1">
              Color: <span className="font-medium text-[#264653]">{selectedColor}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {product.colors.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    selectedColor === c
                      ? "border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F] font-semibold"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
        <Link
          href={`/products/${product.id}`}
          className="flex-1 text-center py-1.5 px-2.5 rounded-lg border border-[#264653]/30 text-[#264653] text-xs font-sans font-medium hover:bg-[#264653]/5 transition-colors inline-flex items-center justify-center gap-1"
        >
          <span>Details</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleAddToCart}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-sans font-medium transition-all inline-flex items-center justify-center gap-1.5 ${
            isAdded
              ? "bg-[#2A9D8F] text-white"
              : "bg-[#264653] hover:bg-[#1e3742] text-white shadow-xs"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Bag</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
