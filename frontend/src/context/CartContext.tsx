"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, CartItem } from "@/types";
import { calculateCartSubtotal, calculateShipping } from "@/lib/pricing";
import { useAuth } from "@/context/AuthContext";

interface ToastState {
  message: string;
  icon: string;
  isOpen: boolean;
}

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, color?: string, size?: string, quantity?: number) => void;
  updateQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  freeShippingThreshold: number;
  freeShippingProgress: number;
  amountRemaining: number;
  isFreeShipping: boolean;

  wishlist: string[];
  toggleWishlist: (productTitle: string) => void;
  isInWishlist: (productTitle: string) => boolean;

  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  isSizeModalOpen: boolean;
  openSizeModal: () => void;
  closeSizeModal: () => void;

  toast: ToastState;
  showToast: (msg: string, icon?: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("loomera_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("loomera_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    message: "",
    icon: "check_circle",
    isOpen: false,
  });

  // When authenticated user changes or logs in, sync with server
  useEffect(() => {
    if (user) {
      fetch("/api/cart")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.items)) {
            setCart(data.items);
          }
        })
        .catch(() => {});

      fetch("/api/wishlist")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.wishlist)) {
            setWishlist(data.wishlist);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Save changes to localStorage for offline / guest resilience
  useEffect(() => {
    try {
      localStorage.setItem("loomera_cart", JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem("loomera_wishlist", JSON.stringify(wishlist));
    } catch {
      // Ignore
    }
  }, [wishlist]);

  const showToast = (message: string, icon = "check_circle") => {
    setToast({ message, icon, isOpen: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isOpen: false }));
    }, 3200);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  const openSizeModal = () => setIsSizeModalOpen(true);
  const closeSizeModal = () => setIsSizeModalOpen(false);

  const addToCart = (
    product: Product,
    color?: string,
    size?: string,
    quantity = 1
  ) => {
    const chosenColor = color || product.swatches[0]?.name || "Natural";
    const chosenSize = size || product.sizes[0] || "Standard";
    const itemId = `${product.id}-${chosenColor}-${chosenSize}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          productId: product.id,
          title: product.title,
          price: product.price,
          color: chosenColor,
          size: chosenSize,
          image: product.image,
          quantity,
        },
      ];
    });

    if (user) {
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          size: chosenSize,
          color: chosenColor,
          quantity,
        }),
      }).catch(() => {});
    }

    showToast(`Added ${product.title} (${chosenSize}) to Atelier Bag`, "shopping_bag");
    openCart();
  };

  const updateQty = (id: string, delta: number) => {
    let targetItem: CartItem | undefined;
    let targetNewQty = 0;

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            targetItem = item;
            const newQty = item.quantity + delta;
            targetNewQty = newQty;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });

    if (user && targetItem) {
      fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: targetItem.productId,
          size: targetItem.size,
          color: targetItem.color,
          quantity: targetNewQty,
        }),
      }).catch(() => {});
    }
  };

  const removeItem = (id: string) => {
    const itemToRemove = cart.find((item) => item.id === id);
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast("Removed from Atelier Bag", "delete_outline");

    if (user && itemToRemove) {
      const params = new URLSearchParams({
        productId: itemToRemove.productId,
        size: itemToRemove.size,
        color: itemToRemove.color,
      });
      fetch(`/api/cart?${params.toString()}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  };

  const clearCart = () => {
    setCart([]);
    if (user) {
      fetch("/api/cart", {
        method: "DELETE",
      }).catch(() => {});
    }
  };

  const toggleWishlist = (productTitle: string) => {
    const isPresent = wishlist.includes(productTitle);
    setWishlist((prev) => {
      if (isPresent) {
        showToast(`Removed from Wishlist`, "favorite_border");
        return prev.filter((t) => t !== productTitle);
      } else {
        showToast(`Saved to Wishlist`, "favorite");
        return [...prev, productTitle];
      }
    });

    if (user) {
      fetch("/api/wishlist", {
        method: isPresent ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productTitle }),
      }).catch(() => {});
    }
  };

  const isInWishlist = (productTitle: string) => wishlist.includes(productTitle);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = calculateCartSubtotal(cart);
  const shipping = calculateShipping(subtotal);
  const freeShippingThreshold = shipping.threshold;
  const freeShippingProgress = shipping.progressPercent;
  const amountRemaining = shipping.amountRemaining;
  const isFreeShipping = shipping.isFreeShipping;

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        openCart,
        closeCart,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
        freeShippingThreshold,
        freeShippingProgress,
        amountRemaining,
        isFreeShipping,
        wishlist,
        toggleWishlist,
        isInWishlist,
        isSearchOpen,
        openSearch,
        closeSearch,
        isSizeModalOpen,
        openSizeModal,
        closeSizeModal,
        toast,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
