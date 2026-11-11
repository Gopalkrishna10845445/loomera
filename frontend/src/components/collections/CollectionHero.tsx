"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { CollectionConfig } from "@/data/collectionsData";

interface CollectionHeroProps {
  config: CollectionConfig;
  itemCount: number;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export default function CollectionHero({
  config,
  itemCount,
  onPrimaryClick,
  onSecondaryClick,
}: CollectionHeroProps) {
  return (
    <section className="relative w-full overflow-hidden bg-[#faf8f5] border-b border-[#ece7de]">
      {/* Editorial Backdrop with Image */}
      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16 lg:pb-20">
        {/* Breadcrumb Bar */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-sans font-medium uppercase tracking-wider text-[#6c7062] mb-6 sm:mb-8"
        >
          <Link
            href="/"
            className="hover:text-[#264653] transition-colors focus-luxury rounded"
          >
            Atelier
          </Link>
          <ChevronRight className="w-3 h-3 text-[#9a9e90]" />
          <span className="text-[#6c7062]">Collections</span>
          <ChevronRight className="w-3 h-3 text-[#9a9e90]" />
          <span className="text-[#264653] font-bold">{config.headline.replace(".", "")}</span>
        </nav>

        {/* Hero Grid: Split Editorial Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Typography & CTAs */}
          <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6 z-10">
            {/* Eyebrow with Brand Gold Accent */}
            <div className="flex items-center gap-2.5">
              <span className="w-7 sm:w-8 h-[2.5px] bg-[#E9C46A] rounded-full inline-block" />
              <span className="font-sans text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#525547] font-bold">
                {config.eyebrow}
              </span>
              <span className="hidden sm:inline-block text-[#b0aba0]">&bull;</span>
              <span className="hidden sm:inline-block font-sans text-[11px] uppercase tracking-wider text-[#2A9D8F] font-bold">
                {itemCount} Styles
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-[#264653] font-bold tracking-tight leading-[1.08]">
              {config.headline}{" "}
              {config.headlineBreak && (
                <span className="block font-serif italic text-[#264653]/90 font-normal mt-0.5 sm:mt-1">
                  {config.headlineBreak}
                </span>
              )}
            </h1>

            {/* Editorial Description */}
            <p className="font-sans text-sm sm:text-base text-[#525547] max-w-xl leading-relaxed">
              {config.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={onPrimaryClick}
                className="inline-flex items-center justify-center gap-2 bg-[#E76F51] hover:bg-[#d85e40] text-white font-sans text-xs sm:text-[13px] uppercase tracking-wider px-6 sm:px-7 py-3 rounded-full transition-all duration-200 focus-luxury shadow-md font-semibold cursor-pointer active:scale-95"
              >
                <span>{config.primaryCta.label}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>

              <button
                type="button"
                onClick={onSecondaryClick}
                className="inline-flex items-center justify-center gap-2 bg-white/90 hover:bg-white text-[#264653] hover:text-[#2A9D8F] font-sans text-xs sm:text-[13px] uppercase tracking-wider px-6 sm:px-7 py-3 rounded-full transition-colors duration-200 border border-[#d8d3c7] focus-luxury shadow-xs font-semibold cursor-pointer active:scale-95"
              >
                <span>{config.secondaryCta.label}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Fashion Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/5] max-h-[460px] rounded-2xl overflow-hidden shadow-lg border border-[#e5dfd3] bg-[#f2ede4]">
              <Image
                src={config.heroImage}
                alt={config.heroImageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover object-[center_28%] transition-transform duration-700 ease-out hover:scale-105"
              />

              {/* Luxury Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#264653]/35 via-transparent to-transparent pointer-events-none" />

              {/* Floating Creative Direction Pill */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/60 shadow-xs flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-[#2A9D8F]" />
                <span className="font-sans text-[10px] sm:text-[10.5px] uppercase tracking-wider text-[#264653] font-bold">
                  {config.creativeDirection}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
