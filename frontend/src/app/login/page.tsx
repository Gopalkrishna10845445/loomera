"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-[2px] text-[#051A6E]">
          PATRON PORTAL
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-black mt-1">
          SIGN IN
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-2">
          Access your orders, saved garments, and personal wardrobe.
        </p>
      </div>

      {/* Card Form */}
      <div className="bg-white p-6 sm:p-8 border border-[#E5E7EB]">
        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-red-50 border border-red-200 flex items-start gap-2.5 text-[#D92D20] text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="text-xs uppercase font-bold tracking-wider text-black block mb-1.5"
            >
              EMAIL ADDRESS *
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white pl-10 pr-4 py-3 text-sm text-black border border-[#E5E7EB] focus:border-black outline-none placeholder:text-gray-400 font-futura"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-xs uppercase font-bold tracking-wider text-black block"
              >
                PASSWORD *
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
                className="w-full bg-white pl-10 pr-4 py-3 text-sm text-black border border-[#E5E7EB] focus:border-black outline-none placeholder:text-gray-400 font-futura"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full h-12 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>AUTHENTICATING...</span>
              ) : (
                <>
                  <span>SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href={`/register${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="text-[#051A6E] font-bold hover:underline"
            >
              Create Account &rarr;
            </Link>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-futura">
          <ShieldCheck className="w-3.5 h-3.5 text-[#051A6E]" />
          <span>256-Bit Encrypted Session &bull; INR Orders</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="w-full py-12 sm:py-16 flex-1 flex items-center justify-center">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-8">
          <Suspense fallback={<div className="text-center py-12 text-sm text-gray-500">Loading sign in...</div>}>
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
  );
}
