"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function FeaturedCollectionsBanner() {
  const collections = [
    {
      title: "EVERYDAY LINEN",
      subtitle: "UNSTRUCTURED SHIRTS & DRAWSTRING TROUSERS",
      desc: "Lightweight European flax woven for all-day breathability and effortless drape.",
      href: "/collections/men",
      image: "/assets/reference/prod_linen_shirt.jpg",
      cta: "EXPLORE EVERYDAY LINEN",
    },
    {
      title: "HANDLOOM ESSENTIALS",
      subtitle: "HERITAGE BENGAL WEAVES & ARTISANAL KURTAS",
      desc: "Hand-spun textures crafted by master weavers with refined minimal collar lines.",
      href: "/collections/handloom",
      image: "/assets/reference/col_handloom.jpg",
      cta: "DISCOVER HANDLOOM",
    },
  ];

  return (
    <section className="w-full bg-[#FAFAFA] py-14 sm:py-18 px-4 sm:px-8 border-b border-[#E5E7EB]" id="featured-collections">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-8 pb-4 border-b border-[#E5E7EB]">
          <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
            CURATED EDITIONS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mt-1">
            FEATURED COLLECTIONS
          </h2>
        </div>

        {/* Full-Width Editorial Banners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {collections.map((col) => (
            <div
              key={col.title}
              className="group relative bg-white border border-[#E5E7EB] hover:border-black transition-colors rounded-[8px] overflow-hidden flex flex-col justify-between"
            >
              {/* Image banner */}
              <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-gray-100 overflow-hidden">
                <Image
                  src={col.image}
                  alt={col.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <span className="text-[11px] font-bold uppercase tracking-[2px] text-gray-300">
                    {col.subtitle}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white mt-0.5">
                    {col.title}
                  </h3>
                </div>
              </div>

              {/* Description & Action */}
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-gray-600 max-w-md">
                  {col.desc}
                </p>
                <Link
                  href={col.href}
                  className="btn-primary whitespace-nowrap h-11 px-6 inline-flex items-center gap-2"
                >
                  <span>{col.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
