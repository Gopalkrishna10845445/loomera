"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function CollectionsGrid() {
  // 3 Prominent Collection Cards matching the reference
  const primaryCollections = [
    {
      key: "men",
      title: "Men's Collection",
      desc: "Modern essentials for every occasion.",
      linkText: "Explore Men",
      href: "/collections/men",
      image: "/assets/reference/col_men.jpg",
    },
    {
      key: "boys",
      title: "Boys' Collection",
      desc: "Comfortable styles for growing explorers.",
      linkText: "Explore Boys",
      href: "/collections/boys",
      image: "/assets/reference/col_boys_smiling.jpg",
    },
    {
      key: "handloom",
      title: "Handloom Collection",
      desc: "Tradition woven for today.",
      linkText: "Explore Handloom",
      href: "/collections/handloom",
      image: "/assets/reference/col_handloom.jpg",
    },
  ];

  return (
    <section className="w-full relative z-20 pt-3 pb-6 px-4 sm:px-6 lg:px-8 scroll-mt-24 md:scroll-mt-28" id="collections">
      <div className="max-w-[1440px] mx-auto">
        {/* 3 Horizontal Split Cards matching the reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {primaryCollections.map((col) => (
            <div
              key={col.key}
              className="transition-transform duration-300 hover:-translate-y-1"
            >
              <Link
                href={col.href}
                className="flex flex-row md:flex-col lg:flex-row items-center md:items-start lg:items-center bg-white rounded-2xl border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(38,70,83,0.1)] transition-all duration-300 overflow-hidden group h-full"
              >
                {/* Left/Top Image */}
                <div className="relative w-36 sm:w-40 md:w-full lg:w-44 h-32 sm:h-36 md:h-36 lg:h-36 flex-shrink-0 overflow-hidden">
                  <Image
                    src={col.image}
                    alt={col.title}
                    fill
                    sizes="(max-width: 768px) 160px, (max-width: 1024px) 300px, 180px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col justify-center px-4 py-3 sm:px-5 sm:py-4 md:p-4 lg:px-5 lg:py-4 flex-1 min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#264653] group-hover:text-[#2A9D8F] transition-colors leading-snug">
                    {col.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-2">
                    {col.desc}
                  </p>

                  <div className="mt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2A9D8F] group-hover:text-[#264653] transition-colors">
                      <span>{col.linkText}</span>
                      <span className="transition-transform group-hover:translate-x-1 font-bold">&rarr;</span>
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
