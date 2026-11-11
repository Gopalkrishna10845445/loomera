"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage as ChatMessageType, AssistantFilters } from "@/lib/ai/types";
import ChatMessage, { TypingIndicator } from "./ChatMessage";
import { useAuth } from "@/context/AuthContext";

let globalMessageSeq = 0;
function nextMsgId(prefix: string): string {
  globalMessageSeq += 1;
  return `${prefix}-${globalMessageSeq}`;
}

export default function AiAssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<AssistantFilters>({});
  const [messages, setMessages] = useState<ChatMessageType[]>(() => [
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Welcome to LOOMERA. I am your personal shopping consultant. How may I assist your wardrobe selection today? You can ask me to discover pure linen shirts, boys' artisan tailoring, or filter by price and color.",
      suggestions: [
        "Recommend pieces for me",
        "Compare Classic Linen Shirt and Textured Casual Shirt",
        "Is Classic Linen Shirt available in XL?",
        "Linen shirts under ₹2,000",
      ],
      createdAt: 0,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setErrorMsg(null);
    setInputMessage("");

    const userMsg: ChatMessageType = {
      id: nextMsgId("user"),
      role: "user",
      content: text,
      createdAt: 0,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8),
          filters: activeFilters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to consult atelier concierge");
      }

      if (data.filters) {
        setActiveFilters(data.filters);
      }

      const assistantMsg: ChatMessageType = {
        id: nextMsgId("assistant"),
        role: "assistant",
        content: data.message,
        products: data.products || [],
        filters: data.filters || {},
        suggestions: data.suggestions || [],
        availability: data.availability,
        restock: data.restock,
        comparison: data.comparison,
        recommendations: data.recommendations,
        complementary: data.complementary,
        createdAt: 0,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Our atelier concierge encountered an issue. Please try again.";
      setErrorMsg(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setActiveFilters({});
    setErrorMsg(null);
    const patronGreeting = user?.fullName
      ? `Welcome back, ${user.fullName.split(" ")[0]}.`
      : "Welcome to LOOMERA.";
    setMessages([
      {
        id: nextMsgId("welcome"),
        role: "assistant",
        content: `${patronGreeting} Your shopping filters have been reset. What would you like to explore across the LOOMERA atelier?`,
        suggestions: [
          "Linen shirts under ₹2,000",
          "Boys' tailoring",
          "Pure Handloom kurtas",
          "Free shipping details",
        ],
        createdAt: 0,
      },
    ]);
  };

  const hasActiveFilters = Object.values(activeFilters).some(
    (v) => v !== undefined && v !== null && v !== ""
  );

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open LOOMERA Atelier AI Assistant"
          data-testid="ai-assistant-trigger"
          className="relative flex items-center gap-2.5 px-4 py-3 bg-[#264653] text-[#FAF8F5] rounded-full shadow-xl hover:shadow-2xl border border-[#2A9D8F]/40 hover:border-[#2A9D8F] transition-all group"
        >
          <div className="w-6 h-6 rounded-full bg-[#2A9D8F]/30 flex items-center justify-center text-[#2A9D8F] group-hover:scale-110 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-[#F4ED4F]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-serif text-xs font-semibold tracking-wide">
              Atelier Concierge
            </span>
            <span className="font-sans text-[9px] uppercase tracking-widest text-[#2A9D8F] font-bold">
              AI Shopping Advisor
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
        </motion.button>
      </div>

      {/* Slide-over / Modal Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] h-[640px] max-h-[88vh] bg-[#FAF8F5]/98 backdrop-blur-md rounded-2xl shadow-2xl border border-[#264653]/15 flex flex-col overflow-hidden text-[#264653]"
            data-testid="ai-assistant-drawer"
          >
            {/* Header */}
            <div className="p-3.5 bg-white border-b border-[#e8e4db] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#264653] flex items-center justify-center text-[#F4ED4F] shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-semibold tracking-wide text-[#264653]">
                    LOOMERA Concierge
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F]" />
                    <p className="font-sans text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                      Artisan Wardrobe Advisor
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset conversation and filters"
                  aria-label="Reset conversation"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-[#264653] hover:bg-stone-100 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Concierge"
                  aria-label="Close Concierge"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-[#264653] hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Filters Pill Bar (if filters are active) */}
            {hasActiveFilters && (
              <div className="px-3.5 py-1.5 bg-[#FAF8F5] border-b border-[#e8e4db] flex items-center justify-between text-[11px] font-sans">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                  <span className="text-stone-400 uppercase text-[9px] font-semibold tracking-wider">
                    Filters:
                  </span>
                  {activeFilters.fabric && (
                    <span className="px-2 py-0.5 rounded-full bg-[#264653]/10 text-[#264653] font-medium text-[10px]">
                      {activeFilters.fabric}
                    </span>
                  )}
                  {activeFilters.color && (
                    <span className="px-2 py-0.5 rounded-full bg-[#264653]/10 text-[#264653] font-medium text-[10px]">
                      {activeFilters.color}
                    </span>
                  )}
                  {activeFilters.category && (
                    <span className="px-2 py-0.5 rounded-full bg-[#264653]/10 text-[#264653] font-medium text-[10px]">
                      {activeFilters.category}
                    </span>
                  )}
                  {activeFilters.maxPrice && (
                    <span className="px-2 py-0.5 rounded-full bg-[#264653]/10 text-[#264653] font-medium text-[10px]">
                      ≤ ₹{activeFilters.maxPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  {activeFilters.size && (
                    <span className="px-2 py-0.5 rounded-full bg-[#264653]/10 text-[#264653] font-medium text-[10px]">
                      Size {activeFilters.size}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] text-[#E76F51] hover:underline font-medium shrink-0 ml-2"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onSuggestionClick={(s) => handleSendMessage(s)}
                  isLoading={isLoading}
                />
              ))}

              {isLoading && <TypingIndicator />}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-sans">
                  {errorMsg}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (from last message) */}
            {messages.length > 0 &&
              messages[messages.length - 1].suggestions &&
              messages[messages.length - 1].suggestions!.length > 0 &&
              !isLoading && (
                <div className="px-3.5 py-1.5 border-t border-[#e8e4db] bg-stone-50/70 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1.5">
                    {messages[messages.length - 1].suggestions!.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSendMessage(s)}
                        className="text-[10px] font-sans font-medium px-2.5 py-1 rounded-full border border-stone-200 bg-white text-stone-700 hover:border-[#264653] hover:text-[#264653] transition-colors whitespace-nowrap shadow-2xs"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-[#e8e4db] flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about fabrics, sizes, or styling..."
                disabled={isLoading}
                maxLength={500}
                className="flex-1 bg-[#FAF8F5] border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-sans text-[#264653] placeholder:text-stone-400 focus:outline-none focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] transition-all disabled:opacity-50"
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                disabled={!inputMessage.trim() || isLoading}
                aria-label="Send message to Concierge"
                className="w-8 h-8 rounded-xl bg-[#264653] text-white flex items-center justify-center hover:bg-[#1e3742] transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-xs shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
