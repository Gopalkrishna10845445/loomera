"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/account";

  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || "Invalid credentials.");
        setIsSubmitting(false);
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header Banner */}
      <div className="text-center mb-space-xl">
        <span className="font-label-caps text-label-caps text-[#2A9D8F] uppercase tracking-widest font-bold">
          Patron Concierge
        </span>
        <h1 className="font-headline-lg text-3xl sm:text-4xl text-[#264653] font-serif mt-2">
          WELCOME BACK
        </h1>
        <p className="font-body-md text-[#474741] mt-2 text-sm">
          Access your personal tailoring archive, saved silhouettes, and order dispatches.
        </p>
      </div>

      {/* Card Form */}
      <div className="bg-surface-container-low p-space-xl sm:p-8 border border-stitch rounded-xs shadow-xs">
        {error && (
          <div
            role="alert"
            className="mb-space-md p-3.5 bg-[#E76F51]/10 border border-[#E76F51]/30 rounded-2xs flex items-start gap-2.5 text-[#E76F51] text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <div>
            <label
              htmlFor="email"
              className="font-label-caps text-[10px] uppercase text-[#474741] block mb-1.5 font-semibold tracking-wider"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patron@example.com"
                className="w-full bg-surface pl-10 pr-space-md py-3 font-body-md text-sm text-[#264653] border border-stitch rounded-2xs focus-luxury transition-all placeholder:text-[#8a8a82]"
              />
              <Mail className="w-4 h-4 text-[#8a8a82] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="font-label-caps text-[10px] uppercase text-[#474741] block font-semibold tracking-wider"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface pl-10 pr-space-md py-3 font-body-md text-sm text-[#264653] border border-stitch rounded-2xs focus-luxury transition-all placeholder:text-[#8a8a82]"
              />
              <Lock className="w-4 h-4 text-[#8a8a82] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="pt-space-xs">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#264653] text-white font-label-interactive text-xs uppercase tracking-widest py-3.5 hover:bg-[#2A9D8F] transition-all shadow-xs font-semibold rounded-2xs cursor-pointer focus-luxury flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Authenticating Patron...</span>
              ) : (
                <>
                  <span>Sign In to Atelier</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-space-lg pt-space-md border-t border-stitch text-center">
          <p className="font-body-sm text-xs text-[#525547]">
            New to Loomera?{" "}
            <Link
              href={`/register${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="text-[#2A9D8F] hover:text-[#264653] font-semibold underline underline-offset-4 transition-colors"
            >
              Create an Atelier Account
            </Link>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#8a8a82] uppercase tracking-wider font-label-caps">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
          <span>Encrypted Server Session &bull; INR Checkout</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <main className="w-full pt-36 pb-space-3xl flex-1 flex items-center justify-center">
          <div className="max-w-[1440px] w-full mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-label-caps text-[10px] uppercase text-[#474741] mb-space-lg max-w-md mx-auto">
              <Link href="/" className="hover:text-[#264653] transition-colors">
                Atelier
              </Link>
              <span>/</span>
              <span className="text-[#264653] font-bold">Sign In</span>
            </div>

            <Suspense fallback={<div className="text-center py-12 text-sm text-[#474741]">Loading Atelier Concierge...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </main>
        <Footer />
        <CartDrawer />
        <SearchModal />
        <SizeGuideModal />
        <ToastNotification />
      </div>
    </CartProvider>
  );
}
