"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  User,
  ShoppingBag,
  Menu,
  X,
  Heart,
  LogOut,
  Package,
  ShieldAlert,
  ChevronDown,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";

export function LoomeraWordmark({ className = "text-2xl sm:text-3xl" }: { className?: string }) {
  return (
    <span
      className={`font-futura font-bold tracking-[0.14em] text-black uppercase select-none transition-colors ${className}`}
    >
      LOOMERA
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { openCart, openSearch, totalItems, wishlist } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [collectionsDropdownOpen, setCollectionsDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const collectionsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (collectionsDropdownRef.current && !collectionsDropdownRef.current.contains(target)) {
        setCollectionsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
        setCollectionsDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
      setUserDropdownOpen(false);
      setCollectionsDropdownOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const navLinks = [
    { label: "MEN", href: "/collections/men" },
    { label: "BOYS", href: "/collections/boys" },
    { label: "NEW ARRIVALS", href: "/collections/new-arrivals" },
  ];

  const collectionItems = [
    { label: "All Men's Wear", href: "/collections/men", desc: "Pure linen shirts, trousers & tailoring" },
    { label: "Boys' Collection", href: "/collections/boys", desc: "Breathable natural fabrics for young gentlemen" },
    { label: "Handloom Essentials", href: "/collections/handloom", desc: "Artisanal kurtas & heritage loom textures" },
    { label: "New Season Arrivals", href: "/collections/new-arrivals", desc: "Latest tailoring silhouettes and cuts" },
  ];

  return (
    <header className="w-full bg-white sticky top-0 z-40 border-b border-[#E5E7EB] transition-colors">
      {/* Tier A: Utility Topbar (Charcoal #2D2D2D) */}
      <div className="w-full bg-[#2D2D2D] text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-9 flex items-center justify-between text-[11px] sm:text-xs font-futura tracking-wider">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase tracking-wider">
              FREE SHIPPING ON ORDERS OVER {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-5 text-gray-300">
            <Link
              href="/orders"
              className="hover:text-white transition-colors uppercase font-medium flex items-center gap-1"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </Link>
            <span className="text-gray-500">|</span>
            <Link
              href="/guides/linen-care"
              className="hover:text-white transition-colors uppercase font-medium flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Care Guide & Help</span>
            </Link>
            <span className="text-gray-500">|</span>
            <span className="flex items-center gap-1 text-gray-300 select-none">
              <span>INDIA (₹)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tier B: Main Commercial Navigation */}
      <div className="w-full bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between gap-4 lg:gap-8">
          {/* Left: Mobile Menu Trigger + Brand Wordmark */}
          <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-black hover:text-[#051A6E] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6 stroke-[2]" /> : <Menu className="w-6 h-6 stroke-[2]" />}
            </button>

            <Link
              href="/"
              className="flex items-center focus-luxury py-1"
              aria-label="LOOMERA Home"
            >
              <LoomeraWordmark />
            </Link>
          </div>

          {/* Desktop Category Navigation */}
          <nav
            className="hidden lg:flex items-center gap-6 xl:gap-8 flex-shrink-0"
            aria-label="Primary Navigation"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs xl:text-[13px] font-futura uppercase font-bold tracking-[1.2px] py-2 transition-colors relative ${
                    isActive ? "text-[#051A6E]" : "text-black hover:text-[#051A6E]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#051A6E]" />
                  )}
                </Link>
              );
            })}

            {/* COLLECTIONS Dropdown Menu */}
            <div className="relative" ref={collectionsDropdownRef}>
              <button
                type="button"
                onClick={() => setCollectionsDropdownOpen(!collectionsDropdownOpen)}
                className={`text-xs xl:text-[13px] font-futura uppercase font-bold tracking-[1.2px] py-2 transition-colors flex items-center gap-1 cursor-pointer ${
                  pathname.startsWith("/collections") ? "text-[#051A6E]" : "text-black hover:text-[#051A6E]"
                }`}
                aria-expanded={collectionsDropdownOpen}
              >
                <span>COLLECTIONS</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collectionsDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {collectionsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#E5E7EB] shadow-lg py-2 z-50">
                  {collectionItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setCollectionsDropdownOpen(false)}
                      className="block px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="block text-xs font-bold uppercase tracking-wider text-black">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-gray-500 mt-0.5">
                        {item.desc}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* GUIDES Link */}
            <Link
              href="/guides/linen-care"
              className={`text-xs xl:text-[13px] font-futura uppercase font-bold tracking-[1.2px] py-2 transition-colors relative ${
                pathname === "/guides/linen-care" ? "text-[#051A6E]" : "text-black hover:text-[#051A6E]"
              }`}
            >
              GUIDES
              {pathname === "/guides/linen-care" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#051A6E]" />
              )}
            </Link>
          </nav>

          {/* Center/Right: ASOS-style Pill Search Input */}
          <div className="flex-1 max-w-xl mx-2 hidden sm:block">
            <div
              onClick={openSearch}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  openSearch();
                }
              }}
              className="w-full h-11 px-4.5 rounded-full bg-white hover:bg-gray-50 border border-[#E5E7EB] hover:border-gray-400 flex items-center gap-3 cursor-pointer transition-colors"
              aria-label="Open search catalog"
            >
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate tracking-wide">
                Search for linen shirts, kurtas, boys wear...
              </span>
            </div>
          </div>

          {/* Right Action Icons: Search (mobile), Account, Wishlist, Bag */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={openSearch}
              className="sm:hidden p-2 text-black hover:text-[#051A6E] transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Wishlist Link */}
            <Link
              href="/account#wishlist"
              className="p-2 text-black hover:text-[#051A6E] transition-colors relative cursor-pointer"
              aria-label={`Wishlist (${wishlist.length} saved)`}
            >
              <Heart className="w-5 h-5 stroke-[1.8]" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#051A6E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Account Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="p-2 text-black hover:text-[#051A6E] transition-colors flex items-center gap-1 cursor-pointer"
                aria-label="Account menu"
                aria-expanded={userDropdownOpen}
              >
                <User className="w-5 h-5 stroke-[1.8]" />
                <ChevronDown className="hidden md:block w-3 h-3 text-gray-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#E5E7EB] shadow-xl py-2 z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-gray-50">
                        <p className="text-xs font-bold text-black uppercase tracking-wider truncate">
                          {user.fullName || "Patron"}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        href="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-black font-semibold hover:bg-gray-50 transition-colors uppercase tracking-wider"
                      >
                        <User className="w-4 h-4 text-gray-600" />
                        <span>My Account</span>
                      </Link>

                      <Link
                        href="/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-black font-semibold hover:bg-gray-50 transition-colors uppercase tracking-wider"
                      >
                        <Package className="w-4 h-4 text-gray-600" />
                        <span>My Orders</span>
                      </Link>

                      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#051A6E] font-bold hover:bg-blue-50 transition-colors uppercase tracking-wider border-t border-[#E5E7EB]"
                        >
                          <ShieldAlert className="w-4 h-4 text-[#051A6E]" />
                          <span>Admin Intelligence</span>
                        </Link>
                      )}

                      <div className="border-t border-[#E5E7EB] pt-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 font-semibold hover:bg-red-50 transition-colors uppercase tracking-wider cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 flex flex-col gap-3">
                      <div className="text-center pb-2 border-b border-[#E5E7EB]">
                        <p className="text-xs font-bold uppercase tracking-wider text-black">
                          Welcome to LOOMERA
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Sign in for order tracking &amp; saved wardrobes.
                        </p>
                      </div>
                      <Link
                        href="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="btn-primary w-full text-center"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setUserDropdownOpen(false)}
                        className="btn-secondary w-full text-center"
                      >
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Bag Button (with live badge) */}
            <button
              type="button"
              onClick={openCart}
              className="p-2 text-black hover:text-[#051A6E] transition-colors relative cursor-pointer"
              aria-label={`Shopping Bag with ${totalItems} items`}
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#051A6E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tier C: Full-Width Promotional Banner (#051A6E Navy) */}
      <div className="w-full bg-[#051A6E] text-white border-t border-blue-900/40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-xs sm:text-sm font-futura tracking-wider font-bold uppercase">
          <span>THE SUMMER EDIT: PURE LINEN ESSENTIALS FOR MEN &amp; BOYS</span>
          <div className="flex items-center gap-3">
            <Link
              href="/collections/men"
              className="underline underline-offset-4 hover:text-gray-200 transition-colors"
            >
              SHOP MEN
            </Link>
            <span>&bull;</span>
            <Link
              href="/collections/boys"
              className="underline underline-offset-4 hover:text-gray-200 transition-colors"
            >
              SHOP BOYS
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-sm bg-white h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
              <LoomeraWordmark className="text-xl" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 text-black hover:text-[#051A6E] cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="py-6 flex flex-col gap-4">
              <Link
                href="/collections/men"
                className="text-base font-futura font-bold uppercase tracking-wider text-black hover:text-[#051A6E] py-1 border-b border-gray-100 flex items-center justify-between"
              >
                <span>MEN</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/collections/boys"
                className="text-base font-futura font-bold uppercase tracking-wider text-black hover:text-[#051A6E] py-1 border-b border-gray-100 flex items-center justify-between"
              >
                <span>BOYS</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/collections/new-arrivals"
                className="text-base font-futura font-bold uppercase tracking-wider text-black hover:text-[#051A6E] py-1 border-b border-gray-100 flex items-center justify-between"
              >
                <span>NEW ARRIVALS</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/collections/handloom"
                className="text-base font-futura font-bold uppercase tracking-wider text-black hover:text-[#051A6E] py-1 border-b border-gray-100 flex items-center justify-between"
              >
                <span>HANDLOOM COLLECTION</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/guides/linen-care"
                className="text-base font-futura font-bold uppercase tracking-wider text-black hover:text-[#051A6E] py-1 border-b border-gray-100 flex items-center justify-between"
              >
                <span>LINEN CARE GUIDE</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>

            <div className="mt-auto pt-6 border-t border-[#E5E7EB] flex flex-col gap-3">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="btn-secondary w-full text-center"
                  >
                    My Account ({user.fullName || "Patron"})
                  </Link>
                  <Link
                    href="/orders"
                    className="btn-secondary w-full text-center"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-xs uppercase font-bold text-red-600 py-2 text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-primary w-full text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="btn-secondary w-full text-center"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
