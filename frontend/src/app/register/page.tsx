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
import { Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/account";

  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password validation hints
  const hasMinLen = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === passwordConfirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLen || !hasLetter || !hasNumber) {
      setError("Password must be at least 8 characters with at least one letter and one number.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register(fullName, email, password, passwordConfirmation);
      if (!res.success) {
        setError(res.error || "Registration failed.");
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
          NEW TO LOOMERA
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-black mt-1">
          CREATE ACCOUNT
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-2">
          Join for instant checkout, order tracking, and exclusive edit access.
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
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="text-xs uppercase font-bold tracking-wider text-black block mb-1.5"
            >
              FULL NAME *
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arjun Mehta"
                className="w-full bg-white pl-10 pr-4 py-3 text-sm text-black border border-[#E5E7EB] focus:border-black outline-none placeholder:text-gray-400 font-futura"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Email Address */}
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

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="text-xs uppercase font-bold tracking-wider text-black block mb-1.5"
            >
              PASSWORD *
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters (letters & numbers)"
                className="w-full bg-white pl-10 pr-4 py-3 text-sm text-black border border-[#E5E7EB] focus:border-black outline-none placeholder:text-gray-400 font-futura"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="passwordConfirmation"
              className="text-xs uppercase font-bold tracking-wider text-black block mb-1.5"
            >
              CONFIRM PASSWORD *
            </label>
            <div className="relative">
              <input
                id="passwordConfirmation"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-white pl-10 pr-4 py-3 text-sm text-black border border-[#E5E7EB] focus:border-black outline-none placeholder:text-gray-400 font-futura"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Validation Checklist */}
          {password.length > 0 && (
            <div className="bg-gray-50 p-3 border border-[#E5E7EB] flex flex-col gap-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLen ? "text-[#027A48]" : "text-gray-400"}`} />
                <span className={hasMinLen ? "text-black font-bold" : ""}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasLetter && hasNumber ? "text-[#027A48]" : "text-gray-400"}`} />
                <span className={hasLetter && hasNumber ? "text-black font-bold" : ""}>Contains letters &amp; numbers</span>
              </div>
              {passwordConfirmation.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? "text-[#027A48]" : "text-[#D92D20]"}`} />
                  <span className={passwordsMatch ? "text-[#027A48] font-bold" : "text-[#D92D20]"}>
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full h-12 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>CREATING ACCOUNT...</span>
              ) : (
                <>
                  <span>CREATE ACCOUNT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-gray-600">
            Already registered?{" "}
            <Link
              href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="text-[#051A6E] font-bold hover:underline"
            >
              Sign In &rarr;
            </Link>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-futura">
          <ShieldCheck className="w-3.5 h-3.5 text-[#051A6E]" />
          <span>Argon2id Encrypted &bull; Server-Side Session Protection</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="w-full py-12 sm:py-16 flex-1 flex items-center justify-center">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-8">
          <Suspense fallback={<div className="text-center py-12 text-sm text-gray-500">Loading registration...</div>}>
            <RegisterForm />
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
