import React from "react";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";

export default function BenefitsStrip() {
  return (
    <section className="w-full py-3 sm:py-4 bg-transparent scroll-mt-24 md:scroll-mt-28" id="benefits">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full bg-white/95 rounded-full border border-[#e5e1d8] shadow-[0_2px_10px_rgba(38,70,83,0.04)] py-3 px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 md:gap-2">
            {/* 1. Natural & Breathable Fabrics */}
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#264653]">
              <svg className="w-4 h-4 text-[#2A9D8F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918" />
              </svg>
              <span>Natural &amp; Breathable Fabrics</span>
            </div>

            {/* 2. Free Shipping on threshold */}
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#264653]">
              <svg className="w-4 h-4 text-[#2A9D8F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 0 0-1.125-1.125H3.375A1.125 1.125 0 0 0 2.25 3.75v10.5c0 .621.504 1.125 1.125 1.125H5.25m9-7.5H2.25" />
              </svg>
              <span>Free Shipping on {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}+</span>
            </div>

            {/* 3. Easy 7-Day Returns */}
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#264653]">
              <svg className="w-4 h-4 text-[#2A9D8F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              <span>Easy 7-Day Returns</span>
            </div>

            {/* 4. Secure Payments */}
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#264653]">
              <svg className="w-4 h-4 text-[#2A9D8F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span>Secure Payments</span>
            </div>

            {/* 5. Sustainable & Ethical */}
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#264653]">
              <svg className="w-4 h-4 text-[#2A9D8F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.333A12.018 12.018 0 0 0 12 9c-2.559 0-4.936.8-6.9 2.167V21h13.8Z" />
              </svg>
              <span>Sustainable &amp; Ethical</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
