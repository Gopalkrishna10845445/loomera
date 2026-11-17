"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PRODUCTS } from "@/data/mockData";
import { Product } from "@/types";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";

interface NewArrivalsGridProps {
  products?: Product[];
}

export default function NewArrivalsGrid({ products }: NewArrivalsGridProps) {
  const allProducts = products && products.length > 0 ? products : PRODUCTS;
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "MEN" | "BOYS" | "HANDLOOM">("ALL");

  const filteredProducts = allProducts.filter((p) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "MEN") return p.categorySlug === "men";
    if (selectedFilter === "BOYS") return p.categorySlug === "boys" || p.categorySlug === "kids";
    if (selectedFilter === "HANDLOOM") return p.categorySlug === "handloom";
    return true;
  });

  return (
    <section className="w-full py-14 sm:py-18 bg-white border-b border-[#E5E7EB]" id="new-arrivals">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#E5E7EB]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
              JUST DROPPED
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mt-1">
              NEW ARRIVALS
            </h2>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "MEN", "BOYS", "HANDLOOM"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`px-3.5 py-1.5 text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer transition-colors ${
                  selectedFilter === filter
                    ? "bg-[#051A6E] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Column Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.slice(0, 8).map((product, idx) => (
            <ProductCard key={product.id} product={product} priority={idx < 4} />
          ))}
        </div>

        {/* Bottom Action */}
        <div className="mt-10 text-center">
          <Link
            href="/collections/new-arrivals"
            className="btn-secondary w-56 inline-flex items-center justify-center gap-2"
          >
            <span>VIEW ALL NEW ARRIVALS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
