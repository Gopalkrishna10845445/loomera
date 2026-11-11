"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, User, ShoppingBag, Menu, X, ArrowRight, Heart, LogOut, PackageCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";

export function LoomeraEmblem({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="17" stroke="#2A9D8F" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
      <circle cx="18" cy="18" r="15.5" stroke="#264653" strokeWidth="0.85" />
      {/* Warp & Weft Loom Grid in Brand Teal */}
      <path d="M12 10V26M18 8V28M24 10V26" stroke="#2A9D8F" strokeWidth="0.75" strokeOpacity="0.45" />
      <path d="M9 14H27M9 22H27" stroke="#2A9D8F" strokeWidth="0.75" strokeOpacity="0.45" />
      {/* Monogram L in Brand Deep Blue-Green */}
      <path
        d="M15 12H17.5V23.5H22V25H14.5V23.5H15V12Z"
        fill="#264653"
      />
    </svg>
  );
}

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { openCart, openSearch, totalItems, wishlist } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Primary destinations matching existing routes
  const navLinks = [
    { label: "Men", href: "/collections/men" },
    { label: "Boys", href: "/collections/boys" },
    { label: "Handloom", href: "/collections/handloom" },
    { label: "New Arrivals", href: "/collections/new-arrivals" },
    { label: "Our Story", href: "/#fabric-story" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none transition-all duration-300">
      {/* Announcement banner: matches reference screenshot */}
      <div
        className={`w-full bg-[#1b323c] text-[#f5f3ee] pointer-events-auto transition-all duration-300 overflow-hidden ${
          isScrolled ? "h-0 opacity-0 py-0" : "h-7 sm:h-8 opacity-100 py-1 sm:py-1.5"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 flex items-center justify-between text-[10px] sm:text-[11px] font-sans">
          <div className="hidden md:block w-32"></div>
          
          <div className="flex-1 flex items-center justify-center gap-2 text-center">
            <svg className="w-3.5 h-3.5 text-[#f5f3ee]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 0 0-1.125-1.125H3.375A1.125 1.125 0 0 0 2.25 3.75v10.5c0 .621.504 1.125 1.125 1.125H5.25m9-7.5H2.25" />
            </svg>
            <span className="font-semibold tracking-wider uppercase">
              Free Shipping on Orders Above {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[#d1cbbf] text-[10.5px]">
            <Link href="/orders" className="hover:text-white transition-colors">Track Order</Link>
            <span>|</span>
            <Link href="/about" className="hover:text-white transition-colors">Help</Link>
            <span>|</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-white">
              <span>India (₹)</span>
              <span className="text-[9px]">▼</span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Rounded Liquid Glass Capsule */}
      <div
        className={`w-full max-w-[1400px] mx-auto px-3 sm:px-6 pointer-events-auto transition-all duration-300 ${
          isScrolled ? "pt-2" : "pt-2.5 sm:pt-3.5"
        }`}
      >
        <div
          className={`relative w-full rounded-full transition-all duration-300 px-4 sm:px-7 py-2 sm:py-2.5 flex items-center justify-between gap-3 sm:gap-6 ${
            isScrolled
              ? "liquid-glass-nav-scrolled shadow-[0_12px_36px_rgba(38,70,83,0.12)]"
              : "liquid-glass-nav shadow-[0_8px_32px_rgba(38,70,83,0.08)]"
          }`}
        >
          {/* Mobile Menu Button + Brand Logo matching reference */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-[#264653] hover:text-[#2A9D8F] p-1.5 -ml-1 rounded-full hover:bg-white/40 focus-luxury transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[1.75]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[1.75]" />
              )}
            </button>

            <Link
              href="/"
              className="flex flex-col group focus-luxury rounded-lg py-0.5"
              aria-label="LOOMERA Home"
            >
              <span className="font-serif tracking-[0.16em] text-[#264653] uppercase group-hover:text-[#2A9D8F] transition-colors text-base sm:text-xl font-bold leading-tight">
                LOOMERA
              </span>
              <span className="hidden sm:block font-sans text-[7.5px] sm:text-[8px] tracking-[0.24em] text-[#525547] uppercase font-semibold">
                THREADS FOR A BETTER TOMORROW
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Capsule Items */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-label="Primary Navigation">
            <Link
              href="/collections/men"
              className={`relative text-xs uppercase tracking-wider font-semibold transition-colors py-1 flex items-center gap-1 group ${
                pathname === "/collections/men" ? "text-[#264653]" : "text-[#474741] hover:text-[#264653]"
              }`}
            >
              <span>Men</span>
              <span className="text-[8px] transition-transform group-hover:translate-y-0.5">▼</span>
              {pathname === "/collections/men" && (
                <div className="absolute -bottom-1 left-0 right-2 h-[2px] bg-[#E76F51] rounded-full" />
              )}
            </Link>

            <Link
              href="/collections/boys"
              className={`relative text-xs uppercase tracking-wider font-semibold transition-colors py-1 flex items-center gap-1 group ${
                pathname === "/collections/boys" || pathname === "/collections/kids"
                  ? "text-[#264653]"
                  : "text-[#474741] hover:text-[#264653]"
              }`}
            >
              <span>Boys</span>
              <span className="text-[8px] transition-transform group-hover:translate-y-0.5">▼</span>
              {(pathname === "/collections/boys" || pathname === "/collections/kids") && (
                <div className="absolute -bottom-1 left-0 right-2 h-[2px] bg-[#E76F51] rounded-full" />
              )}
            </Link>

            <Link
              href="/collections/handloom"
              className={`relative text-xs uppercase tracking-wider font-semibold transition-colors py-1 ${
                pathname === "/collections/handloom"
                  ? "text-[#264653]"
                  : "text-[#474741] hover:text-[#264653]"
              }`}
            >
              <span>Handloom</span>
              {pathname === "/collections/handloom" && (
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#E76F51] rounded-full" />
              )}
            </Link>

            <Link
              href="/collections/new-arrivals"
              className={`relative text-xs uppercase tracking-wider font-semibold transition-colors py-1 ${
                pathname === "/collections/new-arrivals"
                  ? "text-[#264653]"
                  : "text-[#474741] hover:text-[#264653]"
              }`}
            >
              <span>New Arrivals</span>
              {pathname === "/collections/new-arrivals" && (
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#E76F51] rounded-full" />
              )}
            </Link>

            <Link
              href="/#fabric-story"
              className="text-xs uppercase tracking-wider font-semibold text-[#474741] hover:text-[#264653] transition-colors py-1"
            >
              Our Story
            </Link>
          </nav>

          {/* Right: Search Capsule + Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            {/* Embedded Search Capsule matching reference */}
            <div
              onClick={openSearch}
              className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white/90 border border-[#e2ded6] text-xs text-[#525547] cursor-pointer shadow-xs transition-all w-56 2xl:w-64"
            >
              <Search className="w-3.5 h-3.5 text-[#525547] flex-shrink-0" />
              <span className="text-[#6c7062] truncate text-[11.5px]">Search for shirts, kurtas, linen...</span>
            </div>

            {/* Mobile/Tablet Search Button */}
            <button
              type="button"
              onClick={openSearch}
              className="xl:hidden text-[#264653] hover:text-[#2A9D8F] hover:bg-white/50 transition-colors p-1.5 sm:p-2 rounded-full focus-luxury cursor-pointer"
              aria-label="Search Archive"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.75]" />
            </button>

            {/* Customer Account / Auth Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 text-[#264653] hover:text-[#2A9D8F] hover:bg-white/50 transition-colors p-1 sm:px-2.5 sm:py-1 rounded-full focus-luxury cursor-pointer"
                  aria-label="Patron Account Menu"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-5 h-5 rounded-full bg-[#2A9D8F] text-white flex items-center justify-center text-[10px] font-bold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline font-sans text-xs font-semibold max-w-[100px] truncate">
                    {user.fullName.split(" ")[0]}
                  </span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-[#264653] hover:text-[#2A9D8F] hover:bg-white/50 transition-colors p-1.5 sm:p-2 rounded-full focus-luxury inline-block"
                  aria-label="Sign In to Atelier"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.75]" />
                </Link>
              )}

              {/* Desktop User Dropdown Capsule */}
              <AnimatePresence>
                {userDropdownOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-surface p-3 rounded-xl border border-stitch shadow-lg flex flex-col gap-1.5 z-50 text-left font-sans"
                  >
                    <div className="px-2.5 py-1.5 border-b border-stitch">
                      <p className="text-[10px] uppercase font-bold text-[#2A9D8F] font-label-caps">
                        Verified Patron
                      </p>
                      <p className="text-xs font-bold text-[#264653] truncate">
                        {user.fullName}
                      </p>
                      <p className="text-[10px] text-[#474741] truncate">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      href="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="px-2.5 py-1.5 text-xs text-[#264653] hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                      <User className="w-3.5 h-3.5 text-[#2A9D8F]" />
                      <span>Atelier Account</span>
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="px-2.5 py-1.5 text-xs text-[#264653] hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                      <PackageCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
                      <span>Order Tracking</span>
                    </Link>

                    <Link
                      href="/account#wishlist"
                      onClick={() => setUserDropdownOpen(false)}
                      className="px-2.5 py-1.5 text-xs text-[#264653] hover:bg-surface-container-low rounded-lg transition-colors flex items-center justify-between font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-[#2A9D8F]" />
                        <span>Curated Wishlist</span>
                      </div>
                      {wishlist.length > 0 && (
                        <span className="text-[10px] bg-[#2A9D8F] text-white px-1.5 py-0.2 rounded-full font-bold">
                          {wishlist.length}
                        </span>
                      )}
                    </Link>

                    <div className="pt-1 border-t border-stitch">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserDropdownOpen(false);
                          await logout();
                          router.push("/login");
                          router.refresh();
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[#E76F51] hover:bg-[#E76F51]/10 rounded-lg transition-colors flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/account#wishlist"
              className="relative text-[#264653] hover:text-[#2A9D8F] hover:bg-white/50 transition-colors p-1.5 sm:p-2 rounded-full focus-luxury"
              aria-label={`Customer Wishlist with ${wishlist.length} saved items`}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.75]" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#2A9D8F] text-white font-label-caps text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="relative text-[#264653] hover:text-[#2A9D8F] hover:bg-white/50 transition-colors p-1.5 sm:p-2 rounded-full focus-luxury cursor-pointer"
              aria-label={`Shopping Cart with ${totalItems} items`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.75]" />
              {/* Badge with count */}
              {totalItems > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#E76F51] text-white font-sans text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Menu with Frosted Glass Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="w-full pointer-events-auto">
            {/* Backdrop Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-[#264653]/40 backdrop-blur-xs z-30"
              aria-hidden="true"
            />

            {/* Menu Floating Card */}
            <div className="lg:hidden fixed inset-x-4 top-24 z-40">
              <motion.div
                id="mobile-navigation"
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="liquid-glass-nav-scrolled rounded-2xl overflow-hidden p-5 flex flex-col gap-4 shadow-2xl border border-white/60"
              >
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, idx) => {
                    const isActive = pathname === link.href;
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`font-label-interactive text-label-interactive uppercase tracking-wider py-2.5 px-3 rounded-lg flex justify-between items-center transition-colors focus-luxury ${
                            isActive
                              ? "bg-[#2A9D8F]/15 text-[#264653] font-bold"
                              : "text-[#264653] hover:bg-white/40"
                          }`}
                        >
                          <span>{link.label}</span>
                          <ArrowRight className="w-4 h-4 text-[#2A9D8F] stroke-[1.75]" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile Patron Authentication Links */}
                <div className="pt-2 border-t border-[#264653]/15 flex flex-col gap-1">
                  {user ? (
                    <>
                      <div className="px-3 py-1 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#2A9D8F] text-white flex items-center justify-center text-[10px] font-bold">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-[#264653]">
                          {user.fullName}
                        </span>
                      </div>
                      <Link
                        href="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="font-label-interactive text-xs uppercase tracking-wider py-2 px-3 text-[#264653] hover:bg-white/40 rounded-lg flex items-center justify-between"
                      >
                        <span>Atelier Account</span>
                        <ArrowRight className="w-4 h-4 text-[#2A9D8F]" />
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className="font-label-interactive text-xs uppercase tracking-wider py-2 px-3 text-[#264653] hover:bg-white/40 rounded-lg flex items-center justify-between"
                      >
                        <span>Order Tracking</span>
                        <ArrowRight className="w-4 h-4 text-[#2A9D8F]" />
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          setMobileMenuOpen(false);
                          await logout();
                          router.push("/login");
                          router.refresh();
                        }}
                        className="font-label-interactive text-xs uppercase tracking-wider py-2 px-3 text-[#E76F51] hover:bg-[#E76F51]/10 rounded-lg flex items-center justify-between cursor-pointer text-left"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="font-label-interactive text-xs uppercase tracking-wider py-2 px-3 text-[#264653] hover:bg-white/40 rounded-lg flex items-center justify-between"
                      >
                        <span>Sign In to Atelier</span>
                        <ArrowRight className="w-4 h-4 text-[#2A9D8F]" />
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="font-label-interactive text-xs uppercase tracking-wider py-2 px-3 text-[#2A9D8F] font-bold hover:bg-white/40 rounded-lg flex items-center justify-between"
                      >
                        <span>Join the Atelier (Register)</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-[#264653]/15 flex flex-col gap-1 text-[#474741] font-body-sm">
                  <span className="font-label-caps text-[10px] uppercase text-[#2A9D8F] tracking-wider font-semibold">
                    Atelier Concierge
                  </span>
                  <p className="text-[12px]">Complimentary Delivery on orders over {formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)}</p>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
