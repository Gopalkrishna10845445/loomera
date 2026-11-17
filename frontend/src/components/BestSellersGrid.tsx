"use client";

import React from "react";
import Link from "next/link";
import { Product } from "@/types";
import { PRODUCTS } from "@/data/mockData";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";

interface BestSellersGridProps {
  products?: Product[];
}

export default function BestSellersGrid({ products }: BestSellersGridProps) {
  const allProducts = products && products.length > 0 ? products : PRODUCTS;
  // Pick curated best-seller products (classic linen shirt, trousers, handloom kurta, boys shirt)
  const bestSellers = allProducts.slice(0, 4);

  return (
    <section className="w-full py-14 sm:py-18 bg-white border-b border-[#E5E7EB]" id="best-sellers">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8 pb-4 border-b border-[#E5E7EB]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
              MOST LOVED SILHOUETTES
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mt-1">
              BEST SELLERS
            </h2>
          </div>
          <Link
            href="/collections/men"
            className="text-xs font-bold uppercase tracking-wider text-black hover:text-[#051A6E] flex items-center gap-1.5 transition-colors"
          >
            <span>SHOP ALL BEST SELLERS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
