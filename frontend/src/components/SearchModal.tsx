"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/context/CartContext";
import { PRODUCTS } from "@/data/mockData";
import { Product } from "@/types";
import { formatInr } from "@/lib/currency";

export default function SearchModal() {
  const { isSearchOpen, closeSearch, addToCart } = useCart();
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
      return;
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
        .catch(() => {
          // Gracefully ignore abort or fetch issues
        });
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

  const matches = React.useMemo(() => {
    if (!query.trim()) return [];
    if (apiResults !== null) return apiResults;
    return PRODUCTS.filter(
      (p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.desc.toLowerCase().includes(query.toLowerCase()) ||
        p.badge.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, apiResults]);

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Archive Search"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#264653]/50 backdrop-blur-xs"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-2xl mt-24 md:mt-28 bg-surface p-space-xl shadow-2xl flex flex-col gap-space-md border border-stitch z-10 rounded-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] font-bold">
                Atelier Archive Search
              </span>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close search"
                className="text-[#474741] hover:text-[#264653] p-2 -mr-2 rounded-full hover:bg-white/50 focus-luxury cursor-pointer transition-colors"
              >
                <X className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>

            {/* Input Field */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  if (!val.trim()) setApiResults(null);
                }}
                placeholder="Type to filter linen shirts, kurtas, trousers..."
                className="w-full bg-surface-container-low p-space-md pr-12 font-body-md text-[#264653] focus:outline-none placeholder:text-[#787770] border border-stitch focus-luxury rounded-2xs"
              />
              <Search className="w-5 h-5 text-[#2A9D8F] absolute right-4 top-3.5 stroke-[1.75]" />
            </div>

            {/* Live Filter Results */}
            <div className="flex flex-col gap-space-sm max-h-80 overflow-y-auto">
              {!query.trim() ? (
                <p className="font-body-sm text-body-sm text-[#474741] italic py-4 text-center">
                  Enter a keyword to inspect silhouettes and fabric blends...
                </p>
              ) : matches.length === 0 ? (
                <p className="font-body-sm text-body-sm text-[#474741] py-4 text-center">
                  No tailoring archives matching &ldquo;{query}&rdquo;.
                </p>
              ) : (
                matches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      addToCart(item, item.swatches[0]?.name, item.sizes[0], 1);
                      handleClose();
                    }}
                    className="p-space-sm bg-surface-container-low hover:bg-[#2A9D8F]/15 text-left cursor-pointer flex justify-between items-center transition-colors border border-stitch focus-luxury w-full rounded-2xs"
                  >
                    <div>
                      <h5 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                        {item.title}
                      </h5>
                      <p className="font-label-caps text-[10px] text-[#474741] uppercase font-medium">
                        {item.badge} &bull; {item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-label-price text-label-price text-[#264653] font-bold block">
                        {formatInr(item.price)}
                      </span>
                      <span className="font-label-caps text-[10px] text-[#2A9D8F] uppercase font-bold">
                        + Quick Add
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
