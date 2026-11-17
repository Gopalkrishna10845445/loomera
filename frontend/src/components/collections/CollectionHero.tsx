"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    <section className="relative w-full bg-white border-b border-[#E5E7EB] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-6 font-futura"
        >
          <Link href="/" className="hover:text-black transition-colors">
            HOME
          </Link>
          <span>/</span>
          <Link href="/collections/men" className="hover:text-black transition-colors">
            COLLECTIONS
          </Link>
          <span>/</span>
          <span className="text-black font-bold">{config.headline.replace(".", "").toUpperCase()}</span>
        </nav>

        {/* Editorial Split Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Typography & Conversion Info */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
                {config.eyebrow.toUpperCase()}
              </span>
              <span className="text-xs uppercase font-bold px-2 py-0.5 bg-gray-100 text-gray-800">
                {itemCount} {itemCount === 1 ? "STYLE" : "STYLES"}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-black leading-[1.08]">
              {config.headline.toUpperCase()}{" "}
              {config.headlineBreak && (
                <span className="block text-gray-600 font-bold mt-1">
                  {config.headlineBreak.toUpperCase()}
                </span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-gray-600 max-w-xl leading-relaxed">
              {config.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {config.primaryCta && (
                <button
                  type="button"
                  onClick={onPrimaryClick}
                  className="btn-primary h-11 px-6 text-xs uppercase font-bold tracking-wider inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>{config.primaryCta.label.toUpperCase()}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {config.secondaryCta && (
                <button
                  type="button"
                  onClick={onSecondaryClick}
                  className="btn-secondary h-11 px-6 text-xs uppercase font-bold tracking-wider cursor-pointer"
                >
                  {config.secondaryCta.label.toUpperCase()}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Editorial Visual */}
          <div className="lg:col-span-5 relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-[8px] overflow-hidden bg-gray-100 border border-[#E5E7EB]">
            <Image
              src={config.heroImage}
              alt={config.heroImageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
