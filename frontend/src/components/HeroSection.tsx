"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-[600px] sm:min-h-[700px] lg:min-h-[780px] flex items-center bg-black overflow-hidden">
      {/* Background Edge-to-Edge Campaign Imagery */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/reference/hero_model.jpg"
          alt="Gentleman in natural European linen shirt"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_20%] md:object-[54%_20%]"
        />
        {/* High-Contrast Editorial Linear Dark Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent w-full md:w-[65%] lg:w-[50%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent h-32 bottom-0 top-auto" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-24">
        <div className="max-w-2xl flex flex-col items-start gap-4 sm:gap-6 text-white">
          {/* Campaign Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-[#051A6E] text-white px-3 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-[2px]">
            <span>NEW SEASON CAMPAIGN &bull; SUMMER EDIT</span>
          </div>

          {/* Bold Display Headline (Futura 48px Hierarchy) */}
          <h1 className="font-headline-display text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white leading-[1.05]">
            PURE LINEN. <br />
            MODERN RETAIL.
          </h1>

          {/* Short Supporting Editorial Copy */}
          <p className="text-sm sm:text-base lg:text-lg text-gray-200 font-normal leading-relaxed max-w-xl">
            Thoughtful menswear and young gentleman&apos;s tailoring sculpted from raw European flax linen, breathable cottons, and master heritage handlooms.
          </p>

          {/* Dual Action CTAs: Shop Men & Shop Boys (44px Square Corners) */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-4 w-full sm:w-auto">
            <Link
              href="/collections/men"
              className="btn-primary w-full sm:w-48 text-center text-xs font-bold uppercase tracking-wider h-11"
            >
              SHOP MEN
            </Link>
            <Link
              href="/collections/boys"
              className="btn-secondary w-full sm:w-48 text-center text-xs font-bold uppercase tracking-wider h-11 bg-white text-black hover:bg-gray-100 hover:text-black border-none"
            >
              SHOP BOYS
            </Link>
          </div>

          {/* Commercial Reassurance Badge */}
          <div className="flex items-center gap-4 pt-4 text-xs uppercase tracking-wider text-gray-300 font-semibold border-t border-white/20 w-full sm:w-auto">
            <span>Free Express Delivery &gt; ₹2,999</span>
            <span>&bull;</span>
            <span>15-Day Doorstep Returns</span>
          </div>
        </div>
      </div>
    </section>
  );
}
