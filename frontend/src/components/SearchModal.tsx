"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { formatInr } from "@/lib/currency";

export default function SearchModal() {
  const { isSearchOpen, closeSearch } = useCart();
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState<Product[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const handleClose = React.useCallback(() => {
    setQuery("");
    setApiResults(null);
    closeSearch();
  }, [closeSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, handleClose]);

  // Query live /api/products?search=... endpoint
  useEffect(() => {
    if (!query.trim()) {
      const resetTimer = setTimeout(() => {
        setApiResults(null);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.products)) {
            setApiResults(data.products);
          }
        })
        .catch(() => {});
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Record search in background
  useEffect(() => {
    const q = query.trim();
    if (q.length >= 3) {
      const timer = setTimeout(() => {
        fetch("/api/history/searches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        }).catch(() => {});
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [query]);

  if (!isSearchOpen) return null;

  const popularSearches = [
    "Linen Shirt",
    "Handloom Kurta",
    "Boys Drawstring Shorts",
    "Trousers",
    "Textured Casual Shirt",
    "Summer",
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Search LOOMERA"
    >
      <div className="w-full bg-white shadow-2xl border-b border-[#E5E7EB] pt-6 pb-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Top Search Input Bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
            <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-full px-5 py-2.5 border border-[#E5E7EB]">
              <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by garment, fabric, color, or collection..."
                aria-label="Search query"
                className="w-full bg-transparent text-sm sm:text-base font-futura text-black placeholder:text-gray-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-gray-400 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-black hover:text-[#051A6E] cursor-pointer"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Keywords */}
          {!query && (
            <div className="pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                POPULAR SEARCHES
              </p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-black text-xs font-medium rounded-none border border-gray-200 cursor-pointer transition-colors uppercase tracking-wider"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && apiResults && (
            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  {apiResults.length} {apiResults.length === 1 ? "RESULT" : "RESULTS"} FOUND FOR &ldquo;{query}&rdquo;
                </p>
                <Link
                  href={`/collections/men`}
                  onClick={handleClose}
                  className="text-xs font-bold uppercase tracking-wider text-[#051A6E] hover:underline"
                >
                  View All Products &rarr;
                </Link>
              </div>

              {apiResults.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-sm font-bold text-black uppercase">NO GARMENTS MATCHED YOUR SEARCH</p>
                  <p className="text-xs mt-1">Try searching for &quot;linen&quot;, &quot;shirt&quot;, or &quot;kurta&quot;.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                  {apiResults.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      onClick={handleClose}
                      className="group flex flex-col bg-white border border-[#E5E7EB] hover:border-black transition-colors rounded-[4px] overflow-hidden p-2"
                    >
                      <div className="relative w-full aspect-[3/4] bg-gray-100 mb-2 overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          sizes="150px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">
                        {product.category}
                      </span>
                      <h4 className="text-xs font-bold text-black group-hover:text-[#051A6E] line-clamp-1 uppercase">
                        {product.title}
                      </h4>
                      <p className="text-xs font-bold text-black mt-1">
                        {formatInr(product.price)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[30vh]" onClick={handleClose} />
    </div>
  );
}
