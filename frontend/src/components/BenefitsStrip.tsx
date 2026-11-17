"use client";

import React from "react";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";
import { Truck, RefreshCw, ShieldCheck, Feather } from "lucide-react";

export default function BenefitsStrip() {
  const benefits = [
    {
      icon: Truck,
      title: "FREE EXPRESS DELIVERY",
      desc: `On all qualifying orders above ${formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}`,
    },
    {
      icon: RefreshCw,
      title: "15-DAY DOORSTEP RETURNS",
      desc: "Hassle-free pickups for unworn, tagged pieces",
    },
    {
      icon: Feather,
      title: "100% PURE FLAX & HANDLOOM",
      desc: "Zero synthetic blends. Natural breathability.",
    },
    {
      icon: ShieldCheck,
      title: "ENCRYPTED CHECKOUT",
      desc: "Secure 256-bit payment via Razorpay",
    },
  ];

  return (
    <section className="w-full bg-white border-y border-[#E5E7EB] py-6 sm:py-8" id="benefits">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-none bg-gray-100 flex items-center justify-center text-[#051A6E] flex-shrink-0">
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    {b.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
