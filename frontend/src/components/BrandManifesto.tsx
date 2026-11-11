"use client";

import React from "react";
import { motion } from "motion/react";

export default function BrandManifesto() {
  return (
    <section className="w-full py-space-3xl bg-[#264653] text-[#fbf9f4] scroll-mt-24 md:scroll-mt-28" id="manifesto">
      <div className="max-w-[1440px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center">
          {/* Main Manifesto Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col gap-space-lg"
          >
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E76F51]"></span>
              <span>Our Manifesto</span>
            </span>
            <h2 className="font-headline-lg text-headline-lg text-white leading-tight">
              LESS, BUT BETTER.
              <br />
              <span className="italic font-normal">CLOTHES TO PASS DOWN.</span>
            </h2>
            <p className="font-body-lg text-body-lg text-[#d3dad8] leading-relaxed">
              Fast fashion produces disposable garments destined for landfill within
              months. LOOMERA exists on the opposite spectrum. We architect clothing
              with generous seam allowances, reinforced gussets, and natural fibers
              that surrender softly to the contours of the wearer over decades.
            </p>

            <div className="grid grid-cols-2 gap-space-lg pt-space-md">
              <div>
                <span className="font-display-hero text-display-hero text-[#F4ED4F] block">
                  100%
                </span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-[#b2c0bc] font-medium">
                  Compostable Botanical Dyes
                </span>
              </div>
              <div>
                <span className="font-display-hero text-display-hero text-[#2A9D8F] block">
                  420+
                </span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-[#b2c0bc] font-medium">
                  Generational Artisan Families
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quote Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div className="relative p-space-xl bg-white/5 backdrop-blur-md border border-white/15 shadow-xl rounded-xs">
              <div className="font-title-editorial text-title-editorial italic text-[#fbf9f4] mb-space-md text-xl md:text-2xl leading-relaxed">
                “When a boy watches his father dress with deliberate care and natural
                ease, he absorbs a quiet respect for craftsmanship that lasts a
                lifetime.”
              </div>
              <div className="flex items-center gap-space-md pt-space-sm border-t border-white/15">
                <span className="w-10 h-10 rounded-full bg-[#2A9D8F] flex items-center justify-center font-title-editorial text-white font-bold shadow-inner">
                  LM
                </span>
                <div>
                  <p className="font-label-interactive text-label-interactive text-white font-bold">
                    Aravind &amp; Julian Varma
                  </p>
                  <p className="font-label-caps text-[10px] text-[#b2c0bc] uppercase tracking-wider font-semibold">
                    Founders &amp; Master Cutters, LOOMERA Guild
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
