"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/context/CartContext";

export default function SizeGuideModal() {
  const { isSizeModalOpen, closeSizeModal } = useCart();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSizeModalOpen) {
        closeSizeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSizeModalOpen, closeSizeModal]);

  return (
    <AnimatePresence>
      {isSizeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Atelier Size Guide"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#264653]/50 backdrop-blur-xs"
            onClick={closeSizeModal}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-xl bg-surface p-space-xl shadow-2xl flex flex-col gap-space-md border border-stitch z-10 my-8 rounded-xs"
          >
            <div className="flex items-center justify-between border-b border-stitch pb-3">
              <div>
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] font-bold">
                  Atelier Tailoring Guide
                </span>
                <h3 className="font-headline-md text-headline-md text-[#264653] mt-1">
                  FIT &amp; PROPORTIONS
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSizeModal}
                aria-label="Close size guide"
                className="text-[#474741] hover:text-[#264653] p-2 -mr-2 rounded-full hover:bg-white/50 focus-luxury cursor-pointer transition-colors"
              >
                <X className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>

            <p className="font-body-md text-body-md text-[#474741]">
              LOOMERA silhouettes feature an architectural, relaxed fit designed for
              natural breathability. We recommend your true size.
            </p>

            {/* Menswear table */}
            <div className="flex flex-col gap-space-xs mt-2">
              <span className="font-label-caps text-[11px] uppercase tracking-wider text-[#264653] font-bold">
                Men&apos;s Tops &amp; Kurtas
              </span>
              <div className="border border-stitch overflow-x-auto rounded-2xs">
                <table className="w-full text-left font-body-sm text-body-sm min-w-[340px]">
                  <thead className="bg-surface-container font-label-caps text-[10px] uppercase text-[#264653] border-b border-stitch">
                    <tr>
                      <th className="p-2.5">Size</th>
                      <th className="p-2.5">Chest (Inches)</th>
                      <th className="p-2.5">Shoulder (Inches)</th>
                      <th className="p-2.5">Collar (Inches)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stitch text-[#264653]">
                    <tr>
                      <td className="p-2.5 font-bold">S</td>
                      <td className="p-2.5">36 - 38</td>
                      <td className="p-2.5">17.5</td>
                      <td className="p-2.5">15.0</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">M</td>
                      <td className="p-2.5">38 - 40</td>
                      <td className="p-2.5">18.0</td>
                      <td className="p-2.5">15.5</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">L</td>
                      <td className="p-2.5">40 - 42</td>
                      <td className="p-2.5">18.5</td>
                      <td className="p-2.5">16.0</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">XL</td>
                      <td className="p-2.5">42 - 44</td>
                      <td className="p-2.5">19.0</td>
                      <td className="p-2.5">16.5</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">XXL</td>
                      <td className="p-2.5">44 - 46</td>
                      <td className="p-2.5">19.5</td>
                      <td className="p-2.5">17.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Boys table note */}
            <div className="flex flex-col gap-space-xs mt-2">
              <span className="font-label-caps text-[11px] uppercase tracking-wider text-[#264653] font-bold">
                Boys&apos; Tailoring (4-14 YRS)
              </span>
              <p className="font-body-sm text-[#474741] text-[12px] leading-relaxed">
                Sizes directly match your young gentleman&apos;s age with generous
                seam allowances for natural growth and active movement.
              </p>
            </div>

            <button
              type="button"
              onClick={closeSizeModal}
              className="mt-space-md w-full bg-[#264653] text-white font-label-interactive text-label-interactive uppercase py-3.5 hover:bg-[#2A9D8F] transition-colors cursor-pointer focus-luxury shadow-md font-semibold rounded-xs"
            >
              Confirm Measurements
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
