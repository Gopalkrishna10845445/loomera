"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, ArrowRight, Trash2, Plus, Minus } from "lucide-react";
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

  const router = useRouter();

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

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast("Please add items to proceed", "alert");
      return;
    }
    closeCart();
    router.push("/checkout");
  };

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white flex flex-col shadow-2xl border-l border-[#E5E7EB]">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-black" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
              SHOPPING BAG ({totalItems})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-1.5 text-black hover:text-[#051A6E] transition-colors cursor-pointer"
            aria-label="Close Shopping Bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="px-5 py-3 bg-gray-50 border-b border-[#E5E7EB] text-xs font-futura">
          {isFreeShipping ? (
            <p className="font-bold text-[#027A48] flex items-center gap-1.5 uppercase tracking-wide">
              <span>✓ FREE STANDARD DELIVERY UNLOCKED</span>
            </p>
          ) : (
            <div>
              <p className="text-gray-700 font-medium">
                Add <span className="font-bold text-black">{formatInr(amountRemaining)}</span> more for Free Delivery
              </p>
              <div className="w-full bg-gray-200 h-1.5 mt-2 rounded-none overflow-hidden">
                <div
                  className="bg-[#051A6E] h-full transition-all duration-300"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-black">
                YOUR BAG IS CURRENTLY EMPTY
              </p>
              <p className="text-xs text-gray-500 max-w-xs">
                Explore our curated linen shirts, trousers, and boys&apos; tailoring.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="btn-primary mt-4 w-48 text-center"
              >
                START SHOPPING
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-3 border border-[#E5E7EB] bg-white rounded-[4px]"
              >
                {/* Product Thumbnail */}
                <div className="relative w-20 h-24 bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.productId || item.id}`}
                        onClick={closeCart}
                        className="text-xs font-bold text-black hover:text-[#051A6E] transition-colors line-clamp-1 uppercase tracking-tight"
                      >
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                      <span>Colour: <strong className="text-black">{item.color}</strong></span>
                      <span>&bull;</span>
                      <span>Size: <strong className="text-black">{item.size}</strong></span>
                    </div>

                    <p className="text-xs font-bold text-black mt-1">
                      {formatInr(item.price)}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center border border-[#E5E7EB]">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-black cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-black">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-black cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-black">
                      {formatInr(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-white space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600 uppercase tracking-wider text-xs">
                SUBTOTAL
              </span>
              <span className="font-bold text-black text-base">
                {formatInr(subtotal)}
              </span>
            </div>

            <p className="text-[11px] text-gray-500 leading-tight">
              Taxes and shipping calculated at checkout. Free 15-day doorstep returns.
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              className="btn-primary w-full h-12 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>CHECKOUT NOW</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={closeCart}
              className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black py-1 cursor-pointer"
            >
              CONTINUE SHOPPING
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
