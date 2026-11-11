"use client";

import React from "react";

interface CategoryChipsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
}

export default function CategoryChips({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}: CategoryChipsProps) {
  return (
    <div className="w-full border-b border-[#ece7de] bg-[#fdfcf9] py-3 sm:py-4">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth"
            role="tablist"
            aria-label="Collection categories"
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts ? categoryCounts[cat] : undefined;

              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectCategory(cat)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer focus-luxury active:scale-95 ${
                    isSelected
                      ? "bg-[#264653] text-white shadow-xs"
                      : "bg-white text-[#525547] hover:text-[#264653] hover:bg-[#f3efe8] border border-[#e2ddd4]"
                  }`}
                >
                  <span>{cat}</span>
                  {typeof count === "number" && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-[#ece7de] text-[#525547]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
