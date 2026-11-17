"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function BrandStorySection() {
  const brandPillars = [
    {
      title: "PURE FLAX LINEN",
      desc: "Cultivated with natural moisture and spun to maintain a cool, porous drape in warm climates.",
    },
    {
      title: "HERITAGE HANDLOOM",
      desc: "Woven on manual shuttle looms across master artisan clusters, lending distinct depth to every thread.",
    },
    {
      title: "TIMELESS TAILORING",
      desc: "Architectural, relaxed silhouettes designed for comfortable everyday wear across men and boys.",
    },
  ];

  return (
    <section className="w-full bg-[#FAFAFA] py-16 sm:py-24 px-4 sm:px-8 border-b border-[#E5E7EB]" id="brand-story">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Editorial Imagery */}
          <div className="lg:col-span-6 relative aspect-[4/5] sm:aspect-[1/1] overflow-hidden bg-gray-200 rounded-[8px] border border-[#E5E7EB]">
            <Image
              src="/assets/reference/fabric_story.jpg"
              alt="Artisan loom craftsmanship and linen fabric weave"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
            <div className="absolute top-4 left-4 bg-white/95 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-black border border-[#E5E7EB]">
              AUTHENTIC TEXTILE ARCHIVE
            </div>
          </div>

          {/* Right Column: Editorial Narrative */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-[2px] text-[#051A6E]">
                OUR IDENTITY
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-black mt-1 leading-[1.1]">
                CRAFTED FOR COMFORT. <br />
                WOVEN TO ENDURE.
              </h2>
            </div>

            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal">
              LOOMERA is founded on an uncompromising dedication to natural fibres. We reject synthetic blends in favor of European flax linen and traditional Indian handlooms that breathe effortlessly and soften with every wash.
            </p>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-[#E5E7EB]">
              {brandPillars.map((pillar) => (
                <div key={pillar.title} className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    {pillar.title}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/guides/linen-care"
                className="btn-primary h-11 px-6 inline-flex items-center gap-2"
              >
                <span>EXPLORE LINEN CARE GUIDE</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections/men"
                className="btn-secondary h-11 px-6 inline-flex items-center gap-2"
              >
                <span>SHOP THE COLLECTION</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
