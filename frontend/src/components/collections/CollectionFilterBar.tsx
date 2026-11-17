"use client";

import React, { useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

export interface FilterState {
  department?: string;
  category?: string;
  priceRange?: string;
  size?: string;
  color?: string;
  inStockOnly?: boolean;
  sortBy: string;
}

interface CollectionFilterBarProps {
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  availableSizes?: string[];
  availableColors?: { name: string; color: string }[];
  isNewArrivalsPage?: boolean;
  departmentOptions?: string[];
}

export const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest First" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name-asc", label: "Name: A to Z" },
];

export const PRICE_RANGES = [
  { id: "all", label: "All Prices" },
  { id: "under-2000", label: "Under ₹2,000" },
  { id: "2000-2700", label: "₹2,000 – ₹2,700" },
  { id: "above-2700", label: "Above ₹2,700" },
];

export default function CollectionFilterBar({
  filterState,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  availableSizes = ["S", "M", "L", "XL", "38", "40", "4 YRS", "6 YRS"],
  availableColors = [
    { name: "Cream", color: "#ede8de" },
    { name: "Navy", color: "#051A6E" },
    { name: "Olive", color: "#545b45" },
    { name: "Sage", color: "#7d8c75" },
    { name: "Rust", color: "#b85233" },
    { name: "Teal", color: "#2A9D8F" },
  ],
  isNewArrivalsPage = false,
  departmentOptions = ["All", "Men", "Boys", "Handloom"],
}: CollectionFilterBarProps) {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const hasActiveFilters = Boolean(
    (filterState.department && filterState.department !== "All") ||
      (filterState.priceRange && filterState.priceRange !== "all") ||
      filterState.size ||
      filterState.color ||
      filterState.inStockOnly ||
      filterState.sortBy !== "featured"
  );

  return (
    <div id="filter-bar" className="w-full bg-white border-b border-[#E5E7EB] sticky top-18 sm:top-20 z-20 py-3">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Department Pills (if New Arrivals) + Filter Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {isNewArrivalsPage && (
              <div className="flex items-center gap-1.5 mr-2" role="group" aria-label="Department Filter">
                {departmentOptions.map((dept) => {
                  const isSelected = (filterState.department || "All") === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() =>
                        onFilterChange({
                          ...filterState,
                          department: dept === "All" ? undefined : dept,
                        })
                      }
                      className={`px-3 py-1.5 text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer border transition-colors ${
                        isSelected
                          ? "bg-[#051A6E] text-white border-[#051A6E]"
                          : "bg-white text-black border-[#E5E7EB] hover:bg-gray-100"
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer rounded-none ${
                filterDrawerOpen || hasActiveFilters
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#E5E7EB] hover:border-black"
              }`}
              aria-expanded={filterDrawerOpen}
              aria-label="Toggle filter controls"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>FILTERS</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#051A6E]" />
              )}
            </button>

            {/* Clear All Action */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-bold uppercase tracking-wider transition-colors cursor-pointer ml-2"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>CLEAR ALL</span>
              </button>
            )}
          </div>

          {/* Right: Results Count + Sort Dropdown */}
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs text-gray-500 uppercase tracking-wider hidden sm:inline font-futura">
              SHOWING <strong className="text-black font-bold">{filteredCount}</strong> OF {totalCount} STYLES
            </span>

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-dropdown" className="text-xs uppercase font-bold text-gray-500 hidden md:inline">
                SORT BY:
              </label>
              <select
                id="sort-dropdown"
                value={filterState.sortBy}
                onChange={(e) =>
                  onFilterChange({ ...filterState, sortBy: e.target.value })
                }
                className="text-xs uppercase font-bold tracking-wider text-black bg-white border border-[#E5E7EB] hover:border-black rounded-none px-3 py-2 cursor-pointer outline-none transition-colors"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expandable Filter Drawer Panel */}
        {filterDrawerOpen && (
          <div className="mt-4 pt-4 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-none">
            {/* Price Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-black">
                PRICE RANGE
              </span>
              <div className="flex flex-col gap-1.5">
                {PRICE_RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() =>
                      onFilterChange({
                        ...filterState,
                        priceRange: r.id === "all" ? undefined : r.id,
                      })
                    }
                    className={`text-left text-xs uppercase font-medium px-2.5 py-1.5 transition-colors cursor-pointer ${
                      (filterState.priceRange === r.id ||
                        (!filterState.priceRange && r.id === "all"))
                        ? "bg-[#051A6E] text-white font-bold"
                        : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-black">
                SIZE
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableSizes.map((sz) => {
                  const isSelected = filterState.size === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        onFilterChange({
                          ...filterState,
                          size: isSelected ? undefined : sz,
                        })
                      }
                      className={`min-w-9 h-8 px-2 text-xs font-bold uppercase transition-colors cursor-pointer border ${
                        isSelected
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-[#E5E7EB] hover:border-black"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Swatch Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-black">
                COLOUR
              </span>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((cl) => {
                  const isSelected = filterState.color?.toLowerCase() === cl.name.toLowerCase();
                  return (
                    <button
                      key={cl.name}
                      type="button"
                      onClick={() =>
                        onFilterChange({
                          ...filterState,
                          color: isSelected ? undefined : cl.name,
                        })
                      }
                      title={cl.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs uppercase font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-black text-white border-black font-bold"
                          : "bg-white text-black border-[#E5E7EB] hover:border-black"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: cl.color }}
                      />
                      <span>{cl.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-Stock Toggle */}
            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(filterState.inStockOnly)}
                  onChange={(e) =>
                    onFilterChange({
                      ...filterState,
                      inStockOnly: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#051A6E] border-[#E5E7EB] rounded-none focus:ring-[#051A6E]"
                />
                <span className="text-xs uppercase font-bold tracking-wider text-black">
                  IN-STOCK STYLES ONLY
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
