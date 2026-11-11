"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Truck, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRODUCTS } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";

export default function ProductSpotlight() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentProduct = PRODUCTS[selectedIndex];

  const [selectedColor, setSelectedColor] = useState(
    currentProduct.swatches[0]?.name || "Natural"
  );
  const [selectedSize, setSelectedSize] = useState(
    currentProduct.sizes[1] || currentProduct.sizes[0]
  );
  const [isAdded, setIsAdded] = useState(false);

  const { addToCart, openSizeModal } = useCart();

  const handleSelectProduct = (index: number) => {
    setSelectedIndex(index);
    const newProd = PRODUCTS[index];
    setSelectedColor(newProd.swatches[0]?.name || "Natural");
    setSelectedSize(newProd.sizes[1] || newProd.sizes[0]);
  };

  const handleAddToCart = () => {
    addToCart(currentProduct, selectedColor, selectedSize, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1400);
  };

  return (
    <section className="w-full py-space-3xl bg-surface-container-low scroll-mt-24 md:scroll-mt-28" id="spotlight">
      <div className="max-w-[1440px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-2xl">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] font-bold">
              Interactive Atelier Showcase
            </span>
            <h2 className="font-headline-lg text-headline-lg text-[#264653]">
              THE ART OF EVERYDAY DRESSING
            </h2>
            <p className="font-body-md text-body-md text-[#474741]">
              Considered pieces. Natural textures. Timeless appeal.
            </p>
          </div>
          <div className="font-label-caps text-label-caps text-[#474741] uppercase tracking-widest hidden md:block font-medium">
            Select Silhouette Below
          </div>
        </div>

        {/* 3-Column Spotlight Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center">
          {/* Column 1: Interactive Silhouette Selector */}
          <div className="lg:col-span-4 flex flex-col gap-space-sm order-2 lg:order-1" role="tablist" aria-label="Silhouettes">
            {PRODUCTS.slice(0, 5).map((prod, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <button
                  key={prod.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectProduct(idx)}
                  className={`text-left p-space-md transition-all duration-200 flex items-center justify-between border focus-luxury cursor-pointer rounded-xs ${
                    isActive
                      ? "bg-surface shadow-xs border-l-4 border-l-[#2A9D8F] border-stitch"
                      : "bg-surface-container-low hover:bg-surface border-stitch"
                  }`}
                >
                  <div>
                    <p className="font-label-caps text-[10px] text-[#2A9D8F] uppercase font-bold tracking-wider">
                      {prod.category}
                    </p>
                    <h4 className="font-title-editorial text-title-editorial text-[#264653]">
                      {prod.title}
                    </h4>
                  </div>
                  <span className="font-label-price text-label-price text-[#264653] font-bold">
                    {formatInr(prod.price)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Column 2: Spotlight Imagery Frame */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="relative w-full aspect-[4/5] bg-surface-container overflow-hidden group shadow-md border border-stitch rounded-xs">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentProduct.id}
                  initial={{ opacity: 0.75, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.75 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative w-full h-full"
                >
                  <Image
                    src={currentProduct.image}
                    alt={currentProduct.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Promotional Badge in Terracotta #E76F51 */}
              <div className="absolute top-4 left-4 bg-[#E76F51] text-white font-label-caps text-label-caps uppercase px-3 py-1.5 shadow-xs tracking-wider font-semibold rounded-2xs">
                {currentProduct.badge}
              </div>

              {/* Fabric Provenance Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-space-md flex items-center justify-between border border-stitch shadow-xs rounded-xs">
                <div>
                  <p className="font-label-caps text-[10px] text-[#474741] uppercase tracking-wider font-semibold">
                    Provenance
                  </p>
                  <p className="font-label-interactive text-label-interactive text-[#264653] font-bold">
                    {currentProduct.origin}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-label-caps text-[10px] text-[#474741] uppercase tracking-wider font-semibold">
                    Weight
                  </p>
                  <p className="font-label-interactive text-label-interactive text-[#264653] font-bold">
                    {currentProduct.weight}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Detail & Purchase Panel */}
          <div className="lg:col-span-3 flex flex-col gap-space-lg order-3 bg-surface p-space-xl shadow-xs border border-stitch rounded-xs">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentProduct.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <span className="font-label-caps text-label-caps text-[#2A9D8F] uppercase tracking-widest font-bold">
                  {currentProduct.category}
                </span>
                <h3 className="font-headline-md text-headline-md text-[#264653] mt-1">
                  {currentProduct.title}
                </h3>
                <p className="font-label-price text-label-price text-[#264653] mt-1 text-xl font-bold">
                  {formatInr(currentProduct.price)}
                </p>
                <p className="font-body-sm text-body-sm text-[#474741] mt-space-sm leading-relaxed">
                  {currentProduct.desc}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Tone / Color Swatches */}
            <div className="flex flex-col gap-space-xs">
              <label className="font-label-caps text-label-caps text-[#474741] uppercase tracking-wider flex justify-between font-semibold">
                <span>Tone Selection</span>
                <span className="text-[#264653] font-bold">{selectedColor}</span>
              </label>
              <div className="flex items-center gap-space-sm pt-1">
                {currentProduct.swatches.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    title={swatch.name}
                    aria-label={`Select tone ${swatch.name}`}
                    onClick={() => setSelectedColor(swatch.name)}
                    className={`w-6 h-6 rounded-full transition-transform focus-luxury cursor-pointer ${
                      selectedColor === swatch.name
                        ? "ring-2 ring-[#264653] ring-offset-2 ring-offset-surface scale-110 shadow-xs"
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
                <label className="font-label-caps text-label-caps text-[#474741] uppercase tracking-wider font-semibold">
                  Tailored Size
                </label>
                <button
                  type="button"
                  onClick={openSizeModal}
                  className="font-label-caps text-[10px] text-[#2A9D8F] hover:text-[#264653] transition-colors uppercase underline cursor-pointer focus-luxury font-semibold"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {currentProduct.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 text-center font-label-interactive text-label-interactive transition-colors focus-luxury cursor-pointer border rounded-2xs ${
                      selectedSize === size
                        ? "bg-[#264653] text-white font-bold border-[#264653] shadow-xs"
                        : "bg-surface-container-high hover:bg-[#2A9D8F]/15 text-[#264653] border-stitch"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase Action - Terracotta #E76F51 Primary CTA */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                className={`w-full font-label-interactive text-label-interactive uppercase py-4 tracking-widest transition-colors duration-200 flex items-center justify-center gap-space-sm cursor-pointer focus-luxury shadow-md rounded-xs font-semibold ${
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
              <div className="flex items-center justify-center gap-space-sm text-[#474741] font-body-sm text-[12px]">
                <Truck className="w-4 h-4 text-[#2A9D8F] stroke-[1.75]" />
                <span>Complimentary insured shipping over {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
