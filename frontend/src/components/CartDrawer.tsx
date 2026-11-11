"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/currency";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    updateQty,
    removeItem,
    totalItems,
    subtotal,
    freeShippingProgress,
    amountRemaining,
    isFreeShipping,
    showToast,
  } = useCart();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  const router = useRouter();

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast("Please add items to proceed", "alert");
      return;
    }
    closeCart();
    router.push("/checkout");
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Atelier Shopping Bag"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[#264653]/50 backdrop-blur-xs"
            onClick={closeCart}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute top-0 right-0 h-full w-full max-w-md bg-surface flex flex-col shadow-2xl border-l border-stitch"
          >
            {/* Header */}
            <div className="p-space-lg bg-surface-container flex items-center justify-between border-b border-stitch">
              <div className="flex items-center gap-space-sm">
                <span className="font-title-editorial text-title-editorial text-[#264653] uppercase font-bold">
                  Atelier Bag
                </span>
                <span className="bg-[#E76F51] text-white font-label-caps text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="text-[#474741] hover:text-[#264653] p-2 -mr-2 rounded-full hover:bg-white/50 focus-luxury cursor-pointer transition-colors"
              >
                <X className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>

            {/* Free Shipping Progress */}
            <div className="px-space-lg py-space-sm bg-surface-container-low border-b border-stitch">
              <div className="flex justify-between items-center text-[12px] font-label-caps text-[#474741] mb-1 font-semibold">
                <span>
                  {isFreeShipping
                    ? "Complimentary shipping unlocked!"
                    : `Add ${formatInr(amountRemaining)} for complimentary delivery`}
                </span>
                <span className="font-bold text-[#264653]">{freeShippingProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#2A9D8F]"
                  initial={{ width: 0 }}
                  animate={{ width: `${freeShippingProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-space-lg flex flex-col gap-space-md">
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-[#474741] gap-3 my-auto">
                  <ShoppingBag className="w-10 h-10 text-[#787770] stroke-[1.25]" />
                  <p className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                    Your bag is currently empty
                  </p>
                  <p className="font-body-sm text-body-sm max-w-xs text-[#474741]">
                    Explore our unbleached linen tailoring to begin your personal archive.
                  </p>
                  <Link
                    href="/collections/men"
                    onClick={closeCart}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xs bg-[#264653] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#1f3742] transition-colors"
                  >
                    <span>Explore Men&apos;s Collection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-space-md bg-surface p-space-sm shadow-xs border border-stitch rounded-xs"
                    >
                      <div className="relative w-20 h-24 bg-surface-container flex-shrink-0 overflow-hidden border border-stitch">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="font-title-editorial text-title-editorial text-[#264653] leading-tight font-bold">
                            {item.title}
                          </h5>
                          <p className="font-label-caps text-[10px] text-[#474741] uppercase mt-1 font-medium">
                            Tone: {item.color} | Size: {item.size}
                          </p>
                          <p className="font-label-price text-label-price text-[#264653] font-bold mt-1">
                            {formatInr(item.price)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-stitch bg-surface-container rounded-2xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-[#2A9D8F]/15 text-[#264653] transition-colors cursor-pointer focus-luxury"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-xs font-label-interactive font-bold text-[#264653]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-[#2A9D8F]/15 text-[#264653] transition-colors cursor-pointer focus-luxury"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[11px] font-label-caps text-[#474741] hover:text-[#E76F51] uppercase transition-colors cursor-pointer focus-luxury py-1 px-1.5 font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer / Checkout Actions */}
            <div className="p-space-lg bg-surface-container-low flex flex-col gap-space-md border-t border-stitch">
              <div className="flex justify-between items-center font-label-caps text-label-caps uppercase text-[#474741] font-semibold">
                <span>Subtotal</span>
                <span className="font-label-price text-label-price text-[#264653] font-bold text-lg">
                  {formatInr(subtotal)}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-[#474741]">
                Duties and atelier delivery calculated at checkout.
              </p>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-[#E76F51] text-white font-label-interactive text-label-interactive uppercase py-4 tracking-wider hover:bg-[#d45d3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-luxury shadow-md font-semibold rounded-xs"
              >
                Proceed to Order Review →
              </button>
              <button
                type="button"
                onClick={closeCart}
                className="text-center font-label-caps text-[11px] text-[#474741] uppercase tracking-widest hover:text-[#264653] transition-colors py-1 cursor-pointer focus-luxury font-semibold"
              >
                Continue Browsing
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-stone-500 pt-2 border-t border-stone-200/80">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>Secure 256-Bit Encrypted</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>15-Day Return Privileges</span>
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
