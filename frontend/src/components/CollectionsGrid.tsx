"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function CollectionsGrid() {
  return (
    <section className="w-full bg-white py-12 sm:py-16 px-4 sm:px-8 border-b border-[#E5E7EB]" id="category-shopping">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8 pb-4 border-b border-[#E5E7EB]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
              SHOP BY CATEGORY
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mt-1">
              THE CORE DEPARTMENTS
            </h2>
          </div>
          <Link
            href="/collections/new-arrivals"
            className="text-xs font-bold uppercase tracking-wider text-black hover:text-[#051A6E] flex items-center gap-1.5 transition-colors"
          >
            <span>VIEW ALL COLLECTIONS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Two Prominent Image-Led Category Sections: MEN & BOYS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Department 1: MEN */}
          <div className="group relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[16/11] overflow-hidden bg-gray-100 border border-[#E5E7EB]">
            <Image
              src="/assets/reference/col_men.jpg"
              alt="Men's Linen Collection"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
              <span className="text-xs uppercase font-bold tracking-[2px] text-gray-300">
                TAILORED CASUAL &amp; SHIRTS
              </span>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white mt-1 mb-4">
                MEN
              </h3>
              <p className="text-xs sm:text-sm text-gray-200 max-w-md mb-6 line-clamp-2">
                Pure European flax linen shirts, breathable drawstring trousers, and unstructured luxury tailoring.
              </p>
              <div>
                <Link
                  href="/collections/men"
                  className="btn-primary w-44 text-center font-bold tracking-wider uppercase h-11 inline-flex items-center justify-center"
                >
                  SHOP NOW
                </Link>
              </div>
            </div>
          </div>

          {/* Department 2: BOYS */}
          <div className="group relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[16/11] overflow-hidden bg-gray-100 border border-[#E5E7EB]">
            <Image
              src="/assets/reference/col_boys_smiling.jpg"
              alt="Boys' Linen & Handloom Collection"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
              <span className="text-xs uppercase font-bold tracking-[2px] text-gray-300">
                YOUNG GENTLEMEN&apos;S WARDROBE
              </span>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white mt-1 mb-4">
                BOYS
              </h3>
              <p className="text-xs sm:text-sm text-gray-200 max-w-md mb-6 line-clamp-2">
                Gentle, skin-friendly linens and durable handloom shorts crafted for celebratory events and everyday ease.
              </p>
              <div>
                <Link
                  href="/collections/boys"
                  className="btn-primary w-44 text-center font-bold tracking-wider uppercase h-11 inline-flex items-center justify-center"
                >
                  SHOP NOW
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
