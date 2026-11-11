"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("LOOMERA Global Root Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-[#264653] font-sans min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E76F51]/10 border border-[#E76F51]/20 flex items-center justify-center text-[#E76F51]">
            <AlertCircle className="w-8 h-8 stroke-[1.5]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#264653] mb-3">
            LOOMERA System Pause
          </h1>

          <p className="text-sm text-[#474741] mb-6 leading-relaxed">
            A critical application error occurred. We apologize for the inconvenience and are working to restore normal atelier services.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 bg-[#264653] text-white px-6 py-3 text-xs uppercase tracking-widest font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Atelier
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 border border-[#264653]/30 text-[#264653] px-6 py-3 text-xs uppercase tracking-widest font-semibold"
            >
              Storefront
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
