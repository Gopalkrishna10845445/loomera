"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-[580px] sm:min-h-[640px] lg:min-h-[740px] max-h-[800px] flex items-center bg-[#faf7f2] overflow-hidden pt-28 sm:pt-32 lg:pt-34 pb-12 sm:pb-14 lg:pb-16">
      {/* Background Editorial Imagery */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/reference/hero_model.jpg"
          alt="Editorial portrait of gentleman in natural beige linen collarless shirt"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_24%] md:object-[55%_22%] lg:object-[54%_20%]"
        />
        {/* Warm luxury editorial gradient scrim for clear text contrast without washing out the model */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#faf7f2]/85 via-[#faf7f2]/50 to-transparent w-full md:w-[60%] lg:w-[48%] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#faf7f2]/80 via-transparent to-transparent h-24 bottom-0 top-auto pointer-events-none" />
      </div>

      {/* Hero Typography & Actions */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-6 sm:px-10 lg:px-16 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
          {/* Left Column Content */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 sm:gap-5">
            {/* Eyebrow matching reference */}
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2.5px] bg-[#E9C46A] rounded-full inline-block" />
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#525547] font-bold">
                NATURAL FABRICS &bull; TIMELESS STYLE
              </span>
            </div>

            {/* Headline matching reference */}
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl tracking-tight text-[#264653] leading-[1.05]">
              Everyday <br />
              <span className="font-serif italic text-[#264653]">Extraordinary</span>
            </h1>

            {/* Supporting description matching reference */}
            <p className="text-[#525547] max-w-lg leading-relaxed text-sm sm:text-base font-normal">
              Premium linen &amp; handloom clothing for the modern gentleman.
            </p>

            {/* CTAs matching reference labels & styling */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
              <Link
                href="/collections/men"
                className="inline-flex items-center justify-center bg-[#E76F51] hover:bg-[#d85e40] text-white font-sans text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-7 py-3 rounded-full transition-all duration-200 focus-luxury shadow-md font-semibold cursor-pointer"
              >
                <span>Shop Men</span>
                <span className="ml-2 font-bold">&rarr;</span>
              </Link>
              <Link
                href="/collections/handloom"
                className="inline-flex items-center justify-center bg-white/90 hover:bg-white text-[#264653] font-sans text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-7 py-3 rounded-full transition-colors duration-200 border border-[#d8d3c7] focus-luxury shadow-xs font-semibold cursor-pointer"
              >
                Explore Handloom
              </Link>
            </div>

            {/* Social Proof matching reference: 3 customer avatars + stars + 10K+ Happy Customers */}
            <div className="flex items-center gap-3 pt-2">
              {/* Overlapping Avatars */}
              <div className="flex -space-x-2 overflow-hidden">
                <Image
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar 1"
                  width={28}
                  height={28}
                  unoptimized
                />
                <Image
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar 2"
                  width={28}
                  height={28}
                  unoptimized
                />
                <Image
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar 3"
                  width={28}
                  height={28}
                  unoptimized
                />
              </div>

              <div className="flex flex-col text-xs leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#E9C46A] text-xs">★★★★★</span>
                  <span className="text-[#264653] font-bold text-xs">4.8/5</span>
                </div>
                <span className="text-[#646857] text-[11px] font-medium">
                  10K+ Happy Customers
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Decorative Script Text with Yellow Swoosh */}
          <div className="hidden lg:flex lg:col-span-5 justify-end relative self-center">
            <div className="relative text-right pr-4 xl:pr-8">
              <span className="font-serif italic text-3xl xl:text-4xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] block font-light leading-snug">
                Linen <br /> that lives <br /> with you
              </span>
              {/* Yellow Underline Swoosh matching reference */}
              <svg
                viewBox="0 0 120 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 ml-auto mt-1"
              >
                <path
                  d="M5 14C35 4 85 4 115 15"
                  stroke="#F4ED4F"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Left Slider Arrow < */}
      <button
        type="button"
        aria-label="Previous slide"
        className="hidden xl:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/70 hover:bg-white text-[#264653] items-center justify-center shadow-sm backdrop-blur-xs transition-colors cursor-pointer"
      >
        <span className="text-sm font-bold">&lsaquo;</span>
      </button>

      {/* Right Slider Arrow > */}
      <button
        type="button"
        aria-label="Next slide"
        className="hidden xl:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/70 hover:bg-white text-[#264653] items-center justify-center shadow-sm backdrop-blur-xs transition-colors cursor-pointer"
      >
        <span className="text-sm font-bold">&rsaquo;</span>
      </button>

      {/* Carousel Pagination Dots at Bottom Center */}
      <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-black/25" />
        <span className="w-5 h-2 rounded-full bg-[#E76F51]" />
        <span className="w-2 h-2 rounded-full bg-black/25" />
        <span className="w-2 h-2 rounded-full bg-black/25" />
      </div>
    </section>
  );
}
