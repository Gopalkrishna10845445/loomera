import React from "react";
import Link from "next/link";
import { PRODUCTS } from "@/data/mockData";
import { Product } from "@/types";
import ProductCard from "./ProductCard";

interface NewArrivalsGridProps {
  products?: Product[];
}

export default function NewArrivalsGrid({ products }: NewArrivalsGridProps) {
  const displayProducts = products && products.length > 0 ? products.slice(0, 6) : PRODUCTS.slice(0, 6);

  return (
    <section className="w-full py-6 sm:py-8 bg-transparent scroll-mt-24 md:scroll-mt-28" id="new-arrivals">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header matching reference */}
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#264653]">
              New Arrivals
            </h2>
            <span className="hidden sm:inline-block w-6 h-[2px] bg-[#e6c84f]"></span>
            <span className="text-xs sm:text-sm text-[#525547] font-normal">
              Fresh styles for your everyday wardrobe.
            </span>
          </div>

          <Link
            href="/collections/new-arrivals"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#2A9D8F] hover:text-[#264653] transition-colors cursor-pointer flex-shrink-0"
          >
            <span>View All</span>
            <span className="font-bold">&rarr;</span>
          </Link>
        </div>

        {/* 6-Column Grid matching reference */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
