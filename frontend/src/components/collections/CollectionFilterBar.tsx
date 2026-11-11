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
    { name: "Navy", color: "#243642" },
    { name: "Olive", color: "#545b45" },
    { name: "Sage", color: "#7d8c75" },
    { name: "Rust", color: "#b85233" },
    { name: "Teal", color: "#2A9D8F" },
  ],
  isNewArrivalsPage = false,
  departmentOptions = ["All", "Men", "Boys", "Handloom"],
}: CollectionFilterBarProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const hasActiveFilters = Boolean(
    (filterState.department && filterState.department !== "All") ||
      (filterState.priceRange && filterState.priceRange !== "all") ||
      filterState.size ||
      filterState.color ||
      filterState.inStockOnly ||
      filterState.sortBy !== "featured"
  );

  return (
    <div id="filter-bar" className="w-full bg-white border-b border-[#ece7de] sticky top-16 sm:top-18 z-20 py-3 shadow-2xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Department Chips or Filter Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {isNewArrivalsPage && (
              <div className="flex items-center gap-1.5 mr-2" role="group" aria-label="Department Filter">
                {departmentOptions.map((dept) => {
                  const isSelected =
                    (filterState.department || "All") === dept;
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
                      className={`px-3 py-1.5 rounded-full font-sans text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#264653] text-white shadow-2xs"
                          : "bg-[#f5f2eb] text-[#525547] hover:bg-[#ede7dc] hover:text-[#264653]"
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter Toggle for Mobile / Detailed controls */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#d8d3c7] hover:border-[#264653] font-sans text-xs uppercase tracking-wider text-[#264653] font-semibold cursor-pointer transition-colors"
              aria-expanded={mobileDrawerOpen}
              aria-label="Toggle filter controls"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#E76F51]" />
              )}
            </button>

            {/* Reset Filters Action */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 text-xs text-[#E76F51] hover:text-[#264653] font-sans font-semibold uppercase tracking-wider transition-colors cursor-pointer ml-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Right: Results Count + Sort Dropdown */}
          <div className="flex items-center gap-3 sm:gap-5 ml-auto">
            <span className="font-sans text-xs text-[#6c7062] font-medium hidden sm:inline">
              Showing <strong className="text-[#264653]">{filteredCount}</strong> of {totalCount} styles
            </span>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sort-dropdown" className="font-sans text-xs text-[#6c7062] hidden md:inline">
                Sort:
              </label>
              <select
                id="sort-dropdown"
                value={filterState.sortBy}
                onChange={(e) =>
                  onFilterChange({ ...filterState, sortBy: e.target.value })
                }
                className="font-sans text-xs uppercase tracking-wider font-semibold text-[#264653] bg-[#f8f5ee] border border-[#d8d3c7] rounded-lg px-2.5 py-1.5 focus-luxury cursor-pointer outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expandable Filter Drawer Panel */}
        {mobileDrawerOpen && (
          <div className="mt-3 pt-3 border-t border-[#ece7de] grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fadeIn">
            {/* Price Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] uppercase tracking-wider text-[#6c7062] font-bold">
                Price
              </span>
              <div className="flex flex-wrap gap-1.5">
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
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-sans cursor-pointer transition-colors ${
                      (filterState.priceRange || "all") === r.id
                        ? "bg-[#264653] text-white border-[#264653] font-semibold"
                        : "bg-white text-[#525547] border-[#d8d3c7] hover:border-[#264653]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            {availableSizes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#6c7062] font-bold">
                  Size
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
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-sans cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#264653] text-white border-[#264653] font-semibold"
                            : "bg-white text-[#525547] border-[#d8d3c7] hover:border-[#264653]"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Swatch Filter */}
            {availableColors.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#6c7062] font-bold">
                  Color Tone
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableColors.map((c) => {
                    const isSelected = filterState.color === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filterState,
                            color: isSelected ? undefined : c.name,
                          })
                        }
                        title={c.name}
                        aria-label={`Filter by ${c.name}`}
                        className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#264653] text-white border-[#264653] font-semibold"
                            : "bg-white text-[#525547] border-[#d8d3c7] hover:border-[#264653]"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/15 inline-block"
                          style={{ backgroundColor: c.color }}
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Reset & Close */}
            <div className="flex items-end justify-between sm:justify-end gap-2 pt-1">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="font-sans text-xs uppercase tracking-wider font-semibold text-[#E76F51] hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="font-sans text-xs uppercase tracking-wider font-semibold text-[#264653] bg-[#f0ece3] px-3 py-1.5 rounded-md hover:bg-[#e6e0d5] cursor-pointer"
              >
                Apply &amp; Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
