"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";
import { Mail, Phone, Truck, RefreshCw } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { showToast } = useCart();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Please provide a valid email address", "alert");
      return;
    }
    showToast("Thank you for subscribing to LOOMERA updates", "check_circle");
    setEmail("");
  };

  return (
    <footer id="footer" className="w-full bg-[#2D2D2D] text-white border-t border-gray-800">
      {/* Newsletter Signup Banner */}
      <div className="w-full bg-black/40 border-b border-gray-800 py-10 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
              SIGN UP FOR 10% OFF YOUR FIRST ORDER
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Be the first to hear about seasonal collections, private edits, and linen care essentials.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col sm:flex-row gap-2 max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              aria-label="Newsletter email address"
              className="bg-white text-black px-4 py-3 h-11 text-xs sm:text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-[#051A6E]"
            />
            <button
              type="submit"
              className="btn-primary h-11 px-6 whitespace-nowrap"
            >
              SUBSCRIBE
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Column 1: Brand Info */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 flex flex-col gap-4">
            <span className="text-2xl font-bold font-futura tracking-[0.14em] text-white uppercase">
              LOOMERA
            </span>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Modern men&apos;s and boys&apos; fashion commerce sculpted from pure European flax linen, organic cotton, and heritage Indian handlooms.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400 pt-2">
              <span className="hover:text-white transition-colors cursor-pointer" title="Instagram">INSTAGRAM</span>
              <span className="hover:text-white transition-colors cursor-pointer" title="Twitter / X">TWITTER</span>
              <span className="hover:text-white transition-colors cursor-pointer" title="Facebook">FACEBOOK</span>
            </div>
          </div>

          {/* Column 2: Customer Service */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              CUSTOMER SERVICE
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-gray-400">
              <li>
                <Link href="/guides/linen-care" className="hover:text-white transition-colors">
                  Help &amp; FAQs
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => showToast("Easy 15-day doorstep returns on all unworn items", "local_shipping")}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Returns &amp; Refunds
                </button>
              </li>
              <li>
                <Link href="/guides/linen-care" className="hover:text-white transition-colors">
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Shopping & Collections */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              COLLECTIONS
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-gray-400">
              <li>
                <Link href="/collections/men" className="hover:text-white transition-colors">
                  Men&apos;s Linen Shirts
                </Link>
              </li>
              <li>
                <Link href="/collections/boys" className="hover:text-white transition-colors">
                  Boys&apos; Collection
                </Link>
              </li>
              <li>
                <Link href="/collections/handloom" className="hover:text-white transition-colors">
                  Handloom Kurtas
                </Link>
              </li>
              <li>
                <Link href="/collections/new-arrivals" className="hover:text-white transition-colors">
                  New Season Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: About LOOMERA */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              ABOUT LOOMERA
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-gray-400">
              <li>
                <Link href="/#brand-story" className="hover:text-white transition-colors">
                  Our Brand Story
                </Link>
              </li>
              <li>
                <Link href="/guides/linen-care" className="hover:text-white transition-colors">
                  Fabric Craftsmanship
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => showToast("Corporate & wholesale inquiries: care@loomera.com", "info")}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Careers &amp; Guild
                </button>
              </li>
              <li>
                <Link href="/campaign/summer" className="hover:text-white transition-colors">
                  Seasonal Campaigns
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Contact & Delivery */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              CONTACT &amp; DELIVERY
            </h4>
            <div className="flex flex-col gap-2 text-xs text-gray-400">
              <p className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>Free delivery over {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}</span>
              </p>
              <p className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>15-Day Doorstep Returns</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>+91 (080) 4567-8900</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>care@loomera.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 LOOMERA RETAIL LTD. ALL RIGHTS RESERVED.</p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => showToast("Privacy Policy: LOOMERA does not sell patron data.", "info")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => showToast("Terms of Sale: Authentic Indian Handloom & Pure Flax Guarantees.", "info")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              onClick={() => showToast("Secure Payment Processing via Razorpay Encrypted Gateway", "info")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Payment Security
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
