"use client";

import React, { useState } from "react";
import { Sparkles, Bell, Check, Clock, Scale, Shirt } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/lib/ai/types";
import AssistantProductCard from "./AssistantProductCard";
import QuickPromptChips from "./QuickPromptChips";
import { useAuth } from "@/context/AuthContext";

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestionClick?: (prompt: string) => void;
  isLoading?: boolean;
}

export default function ChatMessage({
  message,
  onSuggestionClick,
  isLoading = false,
}: ChatMessageProps) {
  const { user } = useAuth();
  const isUser = message.role === "user";
  const [isNotified, setIsNotified] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const handleNotifyMe = async (variantId: string) => {
    if (!user) {
      setNotifyMsg("Please sign in to your patron account to receive restock alerts.");
      return;
    }

    try {
      const res = await fetch("/api/restock-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsNotified(true);
        setNotifyMsg(data.message || "Restock alert registered.");
      } else {
        setNotifyMsg(data.error || "Could not register alert.");
      }
    } catch {
      setNotifyMsg("Failed to subscribe to restock alert.");
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-3.5">
        <div className="max-w-[85%] bg-[#051A6E] text-white rounded-lg px-3.5 py-2.5 text-xs font-sans leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-4 text-left">
      {/* Concierge Avatar & Title */}
      <div className="flex items-center gap-1.5 mb-1.5 text-neutral-500">
        <div className="w-5 h-5 rounded-full bg-[#051A6E]/10 flex items-center justify-center text-[#051A6E]">
          <Sparkles className="w-3 h-3" />
        </div>
        <span className="text-[11px] font-sans font-bold text-black uppercase tracking-wider">
          LOOMERA AI
        </span>
      </div>

      {/* Message Bubble */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 text-xs text-black font-sans leading-relaxed">
        {message.content}
      </div>

      {/* Product Comparison View */}
      {message.comparison && (
        <div className="mt-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white text-xs font-sans">
          <div className="flex items-center gap-1.5 font-sans font-bold text-black uppercase tracking-wide border-b border-[#E5E7EB] pb-2 mb-2">
            <Scale className="w-3.5 h-3.5 text-[#051A6E]" />
            <span>Garment Comparison Matrix</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="py-1 px-2 font-bold text-neutral-500 uppercase tracking-wider w-1/3">Attribute</th>
                  {message.comparison.products.map((p) => (
                    <th key={p.id} className="py-1 px-2 font-bold text-black w-1/3">
                      {p.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {message.comparison.attributes.map((attr) => (
                  <tr key={attr.key} className="hover:bg-neutral-50">
                    <td className="py-1.5 px-2 font-medium text-neutral-600">{attr.label}</td>
                    {attr.values.map((v) => (
                      <td key={v.productId} className="py-1.5 px-2 text-black">
                        {v.displayValue}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message.comparison.differences && message.comparison.differences.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#E5E7EB] text-[10px] text-neutral-600">
              <span className="font-bold text-black">Key Distinction: </span>
              {message.comparison.differences[0]}
            </div>
          )}
        </div>
      )}

      {/* Complementary Styling Advice Component */}
      {message.complementary && message.complementary.length > 0 && (
        <div className="mt-2.5 p-2.5 rounded-lg border border-[#E5E7EB] bg-neutral-50 text-xs font-sans">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#051A6E] uppercase tracking-wide mb-1.5">
            <Shirt className="w-3.5 h-3.5" />
            <span>Complete The Look Recommendation</span>
          </div>
          <p className="text-[11px] text-neutral-700 italic mb-2">
            &ldquo;{message.complementary[0].stylingAdvice}&rdquo;
          </p>
        </div>
      )}

      {/* Availability Card Component */}
      {message.availability && (
        <div className="mt-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white text-xs font-sans">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-black">
              {message.availability.title}
            </span>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                message.availability.status === "in_stock"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : message.availability.status === "low_stock"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-red-50 text-[#D92D20] border border-red-200"
              }`}
            >
              {message.availability.status === "in_stock"
                ? "In Stock"
                : message.availability.status === "low_stock"
                ? `Low Stock (${message.availability.stock} left)`
                : "Out of Stock"}
            </span>
          </div>

          {message.availability.size && (
            <div className="text-[11px] text-neutral-600 mb-1">
              Requested: <span className="font-bold text-black">Size {message.availability.size}</span>
              {message.availability.color && ` • ${message.availability.color}`}
            </div>
          )}

          {message.availability.availableSizes && message.availability.availableSizes.length > 0 && (
            <div className="text-[10px] text-neutral-500">
              Available sizes:{" "}
              <span className="text-black font-bold">
                {message.availability.availableSizes.join(", ")}
              </span>
            </div>
          )}

          {message.availability.status === "out_of_stock" && message.availability.matchingVariantId && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => handleNotifyMe(message.availability!.matchingVariantId!)}
                disabled={isNotified}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#051A6E] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#041456] transition-colors disabled:opacity-70"
              >
                {isNotified ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Alert Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3 text-white" />
                    <span>Notify Me When Available</span>
                  </>
                )}
              </button>
            </div>
          )}

          {notifyMsg && (
            <div className="mt-1.5 text-[10px] text-stone-500 italic">
              {notifyMsg}
            </div>
          )}
        </div>
      )}

      {/* Restock Schedule Card Component */}
      {message.restock && message.restock.hasRestockInfo && (
        <div className="mt-2.5 p-2.5 rounded-xl border border-teal-200 bg-teal-50/50 shadow-2xs text-xs font-sans text-[#264653]">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-[#2A9D8F] mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Artisan Restock Scheduled</span>
          </div>
          <p className="text-[11px] text-stone-600">
            {message.restock.message}
          </p>
        </div>
      )}

      {/* Product Cards Grid / Carousel */}
      {message.products && message.products.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {message.products.map((product) => {
            const recMeta = message.recommendations?.find((r) => r.product.id === product.id);
            return (
              <div key={product.id} className="relative flex flex-col">
                <AssistantProductCard product={product} />
                {recMeta && (
                  <div className="mt-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#E76F51]" />
                    <span className="truncate">{recMeta.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Suggested Follow-up Chips */}
      {message.suggestions && message.suggestions.length > 0 && onSuggestionClick && (
        <div className="mt-2.5">
          <div className="text-[10px] font-sans uppercase tracking-wider text-stone-400 mb-1">
            Suggested Consultations:
          </div>
          <QuickPromptChips
            suggestions={message.suggestions}
            onSelect={onSuggestionClick}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 mb-4 text-left">
      <div className="w-5 h-5 rounded-full bg-[#2A9D8F]/15 flex items-center justify-center text-[#2A9D8F]">
        <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} />
      </div>
      <div className="bg-[#FAF8F5] border border-[#e8e4db] rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
        <span className="text-[11px] font-sans text-stone-500">
          Consulting the atelier catalog
        </span>
        <div className="flex items-center gap-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
