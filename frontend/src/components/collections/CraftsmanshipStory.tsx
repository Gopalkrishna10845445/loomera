"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Feather, Wind, Compass } from "lucide-react";

export default function CraftsmanshipStory() {
  const craftPillars = [
    {
      icon: Feather,
      title: "Hand-Spun Charkha Yarn",
      desc: "Spun with deliberate rhythm, creating organic slub variations that machine spinning cannot replicate.",
    },
    {
      icon: Wind,
      title: "Microscopic Air Pockets",
      desc: "Traditional wooden looms weave with balanced tension, allowing natural ventilation and thermal ease.",
    },
    {
      icon: Compass,
      title: "Artisanal Guild Weaves",
      desc: "Crafted in small heritage batches with hand-rolled plackets, mandarin collars, and natural wooden buttons.",
    },
  ];

  return (
    <section
      id="craftsmanship-story"
      className="w-full bg-[#f6f2ea] border-y border-[#e5dfd4] py-14 sm:py-20 my-8 sm:my-12 scroll-mt-24"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Authentic Fabric Imagery */}
          <div className="lg:col-span-5 relative order-2 lg:order-1">
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-xl border border-[#ded7cb] bg-[#ede7dc]">
              <Image
                src="/assets/reference/fabric_story.jpg"
                alt="Close-up texture of handloom slub cotton showing organic weave grain"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover object-center transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#264653]/40 via-transparent to-transparent pointer-events-none" />

              {/* Provenance Badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-white/70 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] uppercase tracking-wider text-[#E76F51] font-bold block">
                    Heritage Loom Archive
                  </span>
                  <span className="font-serif text-sm text-[#264653] font-bold">
                    Bengal Weaves &bull; 175 GSM Slub
                  </span>
                </div>
                <span className="text-[11px] font-sans font-semibold text-[#525547] bg-[#f4f0e7] px-2.5 py-1 rounded-full">
                  Pure Cotton
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Craft Story */}
          <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6 order-1 lg:order-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#E76F51] inline-block" />
              <span className="font-sans text-xs uppercase tracking-[0.2em] text-[#E76F51] font-bold">
                CRAFTSMANSHIP &amp; PROVENANCE
              </span>
            </div>

            <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl text-[#264653] font-bold tracking-tight leading-tight">
              Rooted in the Rhythm <br />
              <span className="italic font-normal font-serif">of the Wooden Loom</span>
            </h2>

            <p className="font-sans text-sm sm:text-base text-[#525547] leading-relaxed max-w-2xl">
              Every LOOMERA handloom garment honors the tactile beauty of natural slub yarns.
              Hand-spun fibers hold micro air pockets that breathe with the wearer, keeping you naturally
              cool in peak summer heat and comfortably temperate when evening settles.
            </p>

            {/* 3 Pillars of Craftsmanship */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {craftPillars.map((pillar) => {
                const IconComponent = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="flex flex-col gap-2 p-4 rounded-xl bg-white/80 border border-[#e5dfd4] shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#E76F51]/10 flex items-center justify-center text-[#E76F51]">
                      <IconComponent className="w-4 h-4 stroke-[2]" />
                    </div>
                    <h3 className="font-serif text-sm font-bold text-[#264653]">
                      {pillar.title}
                    </h3>
                    <p className="font-sans text-xs text-[#525547] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Quick Action */}
            <div className="pt-2">
              <Link
                href="#products-grid"
                className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-wider font-bold text-[#E76F51] hover:text-[#264653] transition-colors"
              >
                <span>Browse Handloom Heritage Silhouettes</span>
                <span>&darr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
