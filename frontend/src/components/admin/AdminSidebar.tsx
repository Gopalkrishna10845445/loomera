"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionUser } from "@/lib/auth/session";

interface AdminSidebarProps {
  user: SessionUser;
}

const navItems = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/intelligence", label: "AI Command Center", icon: "🧠" },
  { href: "/admin/products", label: "Garment Catalog", icon: "👗" },
  { href: "/admin/inventory", label: "Inventory & Stock", icon: "📦" },
  { href: "/admin/orders", label: "Orders & Fulfillment", icon: "🛍️" },
  { href: "/admin/returns", label: "Returns & Exchanges", icon: "🔄" },
  { href: "/admin/promotions", label: "Coupons & Campaigns", icon: "🏷️" },
  { href: "/admin/support", label: "Customer Helpdesk", icon: "💬" },
  { href: "/admin/customers", label: "Patrons Directory", icon: "👥" },
  { href: "/admin/analytics", label: "Business Intelligence", icon: "📈" },
  { href: "/admin/audit-logs", label: "Security & Audit", icon: "🛡️" },
];

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCurrent = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Mobile Bar */}
      <div className="lg:hidden flex items-center justify-between bg-[#19323A] px-4 py-3 border-b border-white/10 text-white sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <span className="font-serif tracking-widest text-lg font-bold text-[#E76F51]">LOOMERA</span>
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-medium px-2 py-0.5 rounded bg-white/5 border border-white/10">
            Atelier
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:text-white"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1A333B] text-[#FAF8F5] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Atelier Brand Header */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="group block">
            <div className="flex items-center justify-between">
              <span className="font-serif tracking-[0.25em] text-2xl font-bold text-white group-hover:text-[#E76F51] transition-colors">
                LOOMERA
              </span>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-mono font-semibold bg-[#2A9D8F]/20 text-[#2A9D8F] border border-[#2A9D8F]/30">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-[#FAF8F5]/60 mt-1 uppercase tracking-wider font-sans">
              Atelier Command Center
            </p>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isCurrent(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-[#264653] text-white shadow-sm border border-[#2A9D8F]/40"
                    : "text-[#FAF8F5]/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E76F51]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Storefront Switcher */}
        <div className="p-4 border-t border-white/10 bg-[#142930]">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <p className="text-xs text-[#FAF8F5]/50 truncate">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2A9D8F]/20 border border-[#2A9D8F]/40 flex items-center justify-center text-xs font-semibold text-[#2A9D8F]">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
            <Link
              href="/"
              className="flex-1 text-center text-xs py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
            >
              ← Storefront
            </Link>
            <Link
              href="/orders"
              className="flex-1 text-center text-xs py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
            >
              My Orders
            </Link>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
