"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function FabricInspector() {
  return (
    <section className="w-full bg-[#fcfbf7] border-t border-stone-200/60 overflow-hidden relative scroll-mt-24 md:scroll-mt-28" id="fabric-story">
      {/* Background Wheat / Botanical Decorative SVGs */}
      <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 select-none hidden lg:block">
        <svg width="420" height="280" viewBox="0 0 420 280" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 260C90 230 140 180 220 120C280 75 350 40 410 10" stroke="#c4a472" strokeWidth="1.5" strokeDasharray="3 3"/>
          <path d="M80 270C130 220 200 160 300 90C360 48 400 25 430 0" stroke="#c4a472" strokeWidth="1.5"/>
          {/* Wheat kernels */}
          <path d="M210 125 C200 115 205 100 220 105 C230 110 225 125 210 125Z" fill="#c4a472" />
          <path d="M235 105 C225 95 230 80 245 85 C255 90 250 105 235 105Z" fill="#c4a472" />
          <path d="M260 85 C250 75 255 60 270 65 C280 70 275 85 260 85Z" fill="#c4a472" />
          <path d="M290 65 C280 55 285 40 300 45 C310 50 305 65 290 65Z" fill="#c4a472" />
          <path d="M320 45 C310 35 315 20 330 25 C340 30 335 45 320 45Z" fill="#c4a472" />
        </svg>
      </div>

      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] lg:min-h-[420px]">
          {/* Left: Tactile Macro Photo of Folded Handloom Fabric */}
          <div className="lg:col-span-5 relative w-full h-[280px] sm:h-[340px] lg:h-full min-h-[320px]">
            <Image
              src="/assets/reference/fabric_story.jpg"
              alt="Rich folds of deep peacock teal and rust terracotta handloom linen"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              priority
              className="object-cover object-center"
            />
          </div>

          {/* Right: Editorial Story Copy & Craftsmanship Features */}
          <div className="lg:col-span-7 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
            {/* Eyebrow with yellow accent line */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#78716c]">
                OUR FABRIC STORY
              </span>
              <span className="w-10 h-[2.5px] bg-[#E9C46A] rounded-full inline-block" />
            </div>

            {/* Headline */}
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-[38px] font-bold text-[#264653] leading-[1.2] mb-3">
              Rooted in Tradition. <br />
              Designed for Today.
            </h2>

            {/* Layout: Copy + Button on left, 3 Features on right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mt-2">
              <div className="md:col-span-7 flex flex-col items-start">
                <p className="text-stone-600 text-sm sm:text-[15px] leading-relaxed mb-6 font-normal">
                  We work with natural fabrics like linen and handloom cotton to
                  create clothing that is breathable, durable and timeless.
                </p>

                <Link
                  href="/collections/handloom"
                  className="inline-flex items-center gap-2 bg-[#E76F51] hover:bg-[#d65f42] text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:translate-x-0.5"
                >
                  <span>Know Our Story</span>
                  <span className="text-base leading-none">→</span>
                </Link>
              </div>

              {/* 3 Vertical Features */}
              <div className="md:col-span-5 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-stone-200/80 pt-4 md:pt-0 md:pl-8">
                {/* Feature 1 */}
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center text-[#2A9D8F] flex-shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#264653] tracking-wide">
                    Natural Fibres
                  </span>
                </div>

                {/* Feature 2 */}
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#E76F51]/10 flex items-center justify-center text-[#E76F51] flex-shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18"/>
                      <path d="M3 15h18"/>
                      <path d="M9 3v18"/>
                      <path d="M15 3v18"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#264653] tracking-wide">
                    Handloom Weaves
                  </span>
                </div>

                {/* Feature 3 */}
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#264653]/10 flex items-center justify-center text-[#264653] flex-shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6"/>
                      <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#264653] tracking-wide">
                    Better Tomorrow
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
