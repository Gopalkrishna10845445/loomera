"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("LOOMERA Application Error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#264653] flex flex-col justify-between selection:bg-[#2A9D8F]/20">
      {/* Header */}
      <header className="border-b border-[#ECEBE4] py-6 px-8 text-center bg-white/50 backdrop-blur-sm">
        <Link
          href="/"
          className="font-serif text-2xl font-bold tracking-[0.2em] text-[#264653] uppercase hover:text-[#2A9D8F] transition-colors"
        >
          L O O M E R A
        </Link>
        <p className="text-[10px] tracking-[0.25em] text-[#2A9D8F] uppercase mt-1 font-semibold">
          Bespoke Men&apos;s &amp; Young Gentleman&apos;s Atelier
        </p>
      </header>

      {/* Main Error Presentation */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E76F51]/10 border border-[#E76F51]/20 flex items-center justify-center text-[#E76F51]">
            <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
          </div>

          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#E76F51] block mb-2">
            Temporary Interruption
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#264653] mb-4">
            An Unexpected Atelier Anomaly
          </h1>

          <p className="text-[#474741] text-sm leading-relaxed mb-8">
            Our sartorial craft engine encountered a momentary pause. Your cart and selections remain securely preserved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 bg-[#264653] hover:bg-[#1D353F] text-white px-6 py-3 rounded-none text-xs uppercase tracking-widest font-semibold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-attempt Action
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 border border-[#264653]/30 hover:bg-[#264653]/5 text-[#264653] px-6 py-3 rounded-none text-xs uppercase tracking-widest font-semibold transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              Return to Storefront
            </Link>
          </div>

          {error.digest && (
            <p className="mt-8 text-[11px] text-[#8A8A82] font-mono">
              Incident Diagnostic Reference: {error.digest}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ECEBE4] py-6 px-8 text-center text-xs text-[#8A8A82]">
        &copy; {new Date().getFullYear()} LOOMERA Atelier. Architectural Handloom Tailoring.
      </footer>
    </div>
  );
}
