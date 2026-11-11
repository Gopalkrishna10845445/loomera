"use client";

import React from "react";
import { RotateCcw, Sparkles } from "lucide-react";

interface EmptyStateProps {
  categoryName?: string;
  onReset: () => void;
}

export default function EmptyState({ categoryName, onReset }: EmptyStateProps) {
  return (
    <div className="py-20 sm:py-28 px-4 text-center flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-[#ece7de] shadow-2xs my-6">
      <div className="w-12 h-12 rounded-full bg-[#f4f0e7] flex items-center justify-center text-[#2A9D8F]">
        <Sparkles className="w-6 h-6 stroke-[1.75]" />
      </div>

      <div className="flex flex-col gap-1 max-w-md">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#264653]">
          No styles match this release
        </h3>
        <p className="font-sans text-xs sm:text-sm text-[#6c7062] leading-relaxed">
          {categoryName
            ? `We do not currently have items in "${categoryName}". Our atelier releases small, considered batches.`
            : "No items match your active filters. Try adjusting your selections or clear filters to view all available pieces."}
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#264653] hover:bg-[#2A9D8F] text-white font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 focus-luxury"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>View All Available Styles</span>
      </button>
    </div>
  );
}
