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
    <div className="w-full border-b border-[#E5E7EB] bg-white py-3">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1" role="tablist">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts ? categoryCounts[cat] : undefined;

            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectCategory(cat)}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer rounded-none border ${
                  isSelected
                    ? "bg-[#051A6E] text-white border-[#051A6E]"
                    : "bg-white text-black border-[#E5E7EB] hover:bg-gray-100"
                }`}
              >
                <span>{cat}</span>
                {typeof count === "number" && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-700"
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
  );
}
