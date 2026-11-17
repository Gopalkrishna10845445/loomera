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
      <div className="lg:hidden flex items-center justify-between bg-[#2D2D2D] px-4 py-3 border-b border-white/10 text-white sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <span className="font-sans tracking-widest text-lg font-bold text-white">LOOMERA</span>
          <span className="text-[10px] uppercase tracking-wider text-white/80 font-bold px-2 py-0.5 bg-[#051A6E] border border-white/10">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white/10 border border-white/10 text-white/80 hover:text-white"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#2D2D2D] text-white border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Atelier Brand Header */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="group block">
            <div className="flex items-center justify-between">
              <span className="font-sans tracking-[0.25em] text-2xl font-bold text-white group-hover:text-neutral-300 transition-colors">
                LOOMERA
              </span>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 font-mono font-bold bg-[#051A6E] text-white">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1 uppercase tracking-wider font-sans">
              Operations &amp; Intelligence
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
                className={`flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all ${
                  active
                    ? "bg-[#051A6E] text-white shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {active && (
                  <span className="w-1.5 h-1.5 bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Storefront Switcher */}
        <div className="p-4 border-t border-white/10 bg-[#1F1F1F]">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
              <p className="text-xs text-white/50 truncate">{user.email}</p>
            </div>
            <div className="w-8 h-8 bg-[#051A6E] border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
            <Link
              href="/"
              className="flex-1 text-center text-xs py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider border border-white/10 transition-colors"
            >
              ← Storefront
            </Link>
            <Link
              href="/orders"
              className="flex-1 text-center text-xs py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider border border-white/10 transition-colors"
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
