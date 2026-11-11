"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { LoomeraEmblem } from "./Header";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { showToast } = useCart();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Please provide a valid email address", "error");
      return;
    }
    showToast("Welcome to the LOOMERA Atelier Gazette", "mail");
    setEmail("");
  };

  return (
    <footer id="footer" className="w-full bg-[#264653] text-[#fbf9f4] mt-space-3xl border-t border-[#2A9D8F]/20 scroll-mt-24 md:scroll-mt-28">
      <div className="max-w-[1440px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop pt-space-3xl pb-space-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter-desktop">
          {/* Brand Info & Gazette Signup */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <LoomeraEmblem className="w-7 h-7" />
              <span className="font-headline-sm text-headline-sm uppercase text-white tracking-wider font-bold">
                LOOMERA
              </span>
            </div>
            <p className="font-body-md text-body-md text-[#d3dad8] max-w-sm leading-relaxed">
              Artisanal menswear and young gentleman&apos;s tailoring. Hand-spun raw
              linens, organic cottons, and master weaver silks crafted for
              generations.
            </p>
            <div className="pt-space-md">
              <p className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] mb-space-sm font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E76F51]"></span>
                <span>Atelier Gazette</span>
              </p>
              <form onSubmit={handleSubscribe} className="flex max-w-sm shadow-md">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email for quiet releases"
                  aria-label="Atelier Gazette email subscription"
                  className="bg-white/10 text-white font-body-sm text-body-sm px-space-md py-space-sm flex-1 focus-luxury placeholder:text-white/50 border border-white/20 border-r-0"
                />
                <button
                  type="submit"
                  className="bg-[#E76F51] text-white font-label-interactive text-label-interactive uppercase px-space-lg hover:bg-[#d45d3f] transition-colors focus-luxury cursor-pointer font-bold tracking-wider"
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          {/* Wardrobe Links */}
          <div className="lg:col-span-2 flex flex-col gap-space-sm">
            <h3 className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] mb-space-sm font-bold">
              Wardrobe
            </h3>
            <Link
              href="/collections/men"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Men&apos;s Atelier
            </Link>
            <Link
              href="/collections/boys"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Boys&apos; Tailoring
            </Link>
            <Link
              href="/collections/kids"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Kids Essentials
            </Link>
            <Link
              href="/collections/father-son"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Father &amp; Son Sets
            </Link>
            <Link
              href="/collections/handloom"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Handloom Silks
            </Link>
          </div>

          {/* Craft & Lineage Links */}
          <div className="lg:col-span-3 flex flex-col gap-space-sm">
            <h3 className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] mb-space-sm font-bold">
              Craft &amp; Lineage
            </h3>
            <a
              href="#fabrics"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              The Linen &amp; Silk Guide
            </a>
            <a
              href="#manifesto"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Master Weavers
            </a>
            <button
              type="button"
              onClick={() => showToast("Bespoke appointments open for seasonal batches", "schedule")}
              className="text-left font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5 cursor-pointer"
            >
              Bespoke Fitting Service
            </button>
            <a
              href="#manifesto"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Sustainable Provenance
            </a>
          </div>

          {/* Concierge Links */}
          <div className="lg:col-span-3 flex flex-col gap-space-sm">
            <h3 className="font-label-caps text-label-caps uppercase tracking-widest text-[#2A9D8F] mb-space-sm font-bold">
              Concierge
            </h3>
            <button
              type="button"
              onClick={() => showToast("Care concierge: care@loomera-atelier.com", "info")}
              className="text-left font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5 cursor-pointer"
            >
              Care &amp; Alterations
            </button>
            <button
              type="button"
              onClick={() => showToast(`Complimentary insured express delivery on orders above ${formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}`, "local_shipping")}
              className="text-left font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5 cursor-pointer"
            >
              Worldwide Delivery
            </button>
            <Link
              href="/orders"
              className="font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5"
            >
              Order Tracking
            </Link>
            <button
              type="button"
              onClick={() => showToast("Atelier concierge hotline: +1 (800) 589-LOOM", "call")}
              className="text-left font-body-md text-body-md text-[#d3dad8] hover:text-white transition-colors focus-luxury rounded py-0.5 cursor-pointer"
            >
              Contact Atelier
            </button>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="mt-space-2xl pt-space-lg border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-[#b2c0bc] font-body-sm text-body-sm gap-space-md">
          <p>© 2025 LOOMERA Tailoring Guild. All rights reserved.</p>
          <div className="flex items-center gap-space-lg">
            <span className="hover:text-white transition-colors cursor-pointer focus-luxury rounded">
              Privacy Manifesto
            </span>
            <span className="hover:text-white transition-colors cursor-pointer focus-luxury rounded">
              Terms of Service
            </span>
            <span className="hover:text-white transition-colors cursor-pointer focus-luxury rounded">
              Ethical Commitments
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
