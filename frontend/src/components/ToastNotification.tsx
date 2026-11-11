"use client";

import React from "react";
import { CheckCircle, ShoppingBag, Heart, Info, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/context/CartContext";

export default function ToastNotification() {
  const { toast } = useCart();

  const renderIcon = () => {
    switch (toast.icon) {
      case "shopping_bag":
        return <ShoppingBag className="w-5 h-5 text-[#2A9D8F] stroke-[2]" />;
      case "favorite":
      case "favorite_border":
        return <Heart className="w-5 h-5 text-[#E76F51] stroke-[2]" />;
      case "delete_outline":
        return <Trash2 className="w-5 h-5 text-[#E76F51] stroke-[2]" />;
      case "error":
      case "alert":
        return <AlertCircle className="w-5 h-5 text-[#E76F51] stroke-[2]" />;
      case "info":
        return <Info className="w-5 h-5 text-[#2A9D8F] stroke-[2]" />;
      default:
        return <CheckCircle className="w-5 h-5 text-[#2A9D8F] stroke-[2]" />;
    }
  };

  return (
    <AnimatePresence>
      {toast.isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 bg-[#264653] text-[#fbf9f4] px-space-lg py-space-md shadow-2xl flex items-center gap-space-md border border-[#2A9D8F]/40 max-w-sm rounded-xs"
        >
          {renderIcon()}
          <span className="font-label-interactive text-label-interactive text-[#fbf9f4] text-xs sm:text-sm font-medium">
            {toast.message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
