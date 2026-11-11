"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface QuickPromptChipsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export default function QuickPromptChips({
  suggestions,
  onSelect,
  disabled = false,
}: QuickPromptChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 py-1.5">
      {suggestions.map((suggestion, idx) => (
        <button
          key={`${suggestion}-${idx}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
          className="inline-flex items-center gap-1 text-[11px] font-sans font-medium px-2.5 py-1 rounded-full border border-[#264653]/15 bg-[#FAF8F5] text-[#264653] hover:bg-[#264653] hover:text-white hover:border-[#264653] transition-all shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
        >
          <Sparkles className="w-2.5 h-2.5 text-[#2A9D8F]" />
          <span>{suggestion}</span>
        </button>
      ))}
    </div>
  );
}
