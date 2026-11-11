"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartProvider, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import {
  LogOut,
  PackageOpen,
  Heart,
  Clock,
  Search,
  Bell,
  Trash2,
  Award,
  RotateCcw,
  HelpCircle,
  Sliders,
  Copy,
  Check,
  Gift,
} from "lucide-react";
import { formatInr } from "@/lib/currency";

interface AccountUser {
  id: string;
  email: string;
  fullName: string;
}

interface LoyaltyAccount {
  id: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: string;
  referralCode: string;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  reason: string;
  createdAt: string;
}

interface ReturnRecord {
  id: string;
  orderId: string;
  type: string;
  reason: string;
  status: string;
  refundAmountInr: number;
  createdAt: string;
}

interface SupportTicketRecord {
  id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }>;
}

function AccountContent({ user }: { user: AccountUser }) {
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast, wishlist } = useCart();

  const [activeTab, setActiveTab] = useState<
    "overview" | "loyalty" | "returns" | "support" | "preferences"
  >("overview");

  // Profile preferences
  const [preferredSize, setPreferredSize] = useState("Men: Size M (40in) | Boys: Age 8 YRS");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // History & Subscriptions
  const [views, setViews] = useState<
    Array<{
      id: string;
      viewedAt: string;
      product: { id: string; title: string; price: number; image: string; category: string };
    }>
  >([]);
  const [searches, setSearches] = useState<Array<{ id: string; searchQuery: string; createdAt: string }>>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; productTitle: string; size: string; color: string; createdAt: string }>
  >([]);

  // Phase 8 Business Operations State
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [loyaltyTxns, setLoyaltyTxns] = useState<LoyaltyTransaction[]>([]);
  const [copiedReferral, setCopiedReferral] = useState(false);

  const [returnsList, setReturnsList] = useState<ReturnRecord[]>([]);
  const [ticketsList, setTicketsList] = useState<SupportTicketRecord[]>([]);

  const [prefs, setPrefs] = useState({
    emailOrderUpdates: true,
    emailPromotions: true,
    smsOrderUpdates: true,
    whatsappUpdates: false,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // New Ticket State
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("GENERAL");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function loadAccountData() {
      try {
        const [vRes, sRes, nRes, lRes, rRes, tRes, pRes] = await Promise.allSettled([
          fetch("/api/history/views?limit=4"),
          fetch("/api/history/searches?limit=4"),
          fetch("/api/restock-notifications"),
          fetch("/api/loyalty"),
          fetch("/api/returns"),
          fetch("/api/support"),
          fetch("/api/notifications"),
        ]);

        if (!isSubscribed) return;

        if (vRes.status === "fulfilled" && vRes.value.ok) {
          const vData = await vRes.value.json();
          setViews(vData.history || []);
        }
        if (sRes.status === "fulfilled" && sRes.value.ok) {
          const sData = await sRes.value.json();
          setSearches(sData.searches || []);
        }
        if (nRes.status === "fulfilled" && nRes.value.ok) {
          const nData = await nRes.value.json();
          setNotifications(nData.notifications || []);
        }
        if (lRes.status === "fulfilled" && lRes.value.ok) {
          const lData = await lRes.value.json();
          if (lData.account) setLoyaltyAccount(lData.account);
          if (lData.transactions) setLoyaltyTxns(lData.transactions);
        }
        if (rRes.status === "fulfilled" && rRes.value.ok) {
          const rData = await rRes.value.json();
          if (rData.returns) setReturnsList(rData.returns);
        }
        if (tRes.status === "fulfilled" && tRes.value.ok) {
          const tData = await tRes.value.json();
          if (tData.tickets) setTicketsList(tData.tickets);
        }
        if (pRes.status === "fulfilled" && pRes.value.ok) {
          const pData = await pRes.value.json();
          if (pData.preferences) setPrefs(pData.preferences);
        }
      } catch {
        // Fallback for background initializations
      }
    }

    loadAccountData();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleClearViews = async () => {
    try {
      await fetch("/api/history/views", { method: "DELETE" });
      setViews([]);
      showToast("Browsing history cleared", "check_circle");
    } catch {
      showToast("Failed to clear browsing history", "error");
    }
  };

  const handleClearSearches = async () => {
    try {
      await fetch("/api/history/searches", { method: "DELETE" });
      setSearches([]);
      showToast("Search history cleared", "check_circle");
    } catch {
      showToast("Failed to clear search history", "error");
    }
  };

  const handleCancelNotification = async (notificationId: string) => {
    try {
      const res = await fetch("/api/restock-notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        showToast("Restock alert cancelled", "check_circle");
      }
    } catch {
      showToast("Failed to cancel alert", "error");
    }
  };

  const handleCopyReferral = () => {
    if (loyaltyAccount?.referralCode) {
      navigator.clipboard.writeText(loyaltyAccount.referralCode);
      setCopiedReferral(true);
      showToast("Referral code copied to clipboard", "check_circle");
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (res.ok) {
        showToast("Notification preferences updated", "check_circle");
      } else {
        throw new Error();
      }
    } catch {
      showToast("Failed to update preferences", "error");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;
    setIsSubmittingTicket(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newTicketCategory,
          subject: newTicketSubject.trim(),
          message: newTicketMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit ticket");

      setTicketsList([data.ticket, ...ticketsList]);
      setNewTicketSubject("");
      setNewTicketMessage("");
      setShowNewTicketForm(false);
      showToast("Concierge inquiry lodged successfully", "check_circle");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Inquiry submission failed";
      showToast(msg, "error");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const initials =
    user.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("") || "LM";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    showToast("Tailoring preferences saved", "check_circle");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <main className="w-full pt-36 pb-space-3xl">
      <div className="max-w-[1440px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-label-caps text-[10px] uppercase text-[#474741] mb-space-md">
          <Link href="/" className="hover:text-[#264653] transition-colors">
            Atelier
          </Link>
          <span>/</span>
          <span className="text-[#264653] font-bold">Customer Concierge</span>
        </div>

        {/* Member Header */}
        <div className="border-b border-stitch pb-space-lg mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-label-caps text-xs text-[#2A9D8F] uppercase tracking-widest font-bold">
              Member Archive
            </span>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-serif text-[#264653] mt-1">
              ATELIER CONCIERGE &bull; {user.fullName}
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-[#474741] mt-1">
              Bespoke sizing, order dispatches, returns, and atelier loyalty privileges.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 border border-stitch rounded-2xs text-xs font-semibold uppercase tracking-wider text-[#474741] hover:text-[#E76F51] hover:border-[#E76F51] transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? "Ending Session..." : "Sign Out"}</span>
          </button>
        </div>

        {/* Atelier Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stitch mb-8 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xs whitespace-nowrap transition-all ${
              activeTab === "overview"
                ? "bg-[#264653] text-white shadow-xs"
                : "text-[#474741] hover:text-[#264653] hover:bg-surface-container"
            }`}
          >
            Overview &amp; Sizing
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("loyalty")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xs whitespace-nowrap transition-all ${
              activeTab === "loyalty"
                ? "bg-[#264653] text-white shadow-xs"
                : "text-[#474741] hover:text-[#264653] hover:bg-surface-container"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#2A9D8F]" />
            <span>Atelier Privileges</span>
            {loyaltyAccount && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#2A9D8F]/20 text-[#2A9D8F] text-[10px] rounded-full">
                {loyaltyAccount.pointsBalance} pts
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("returns")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xs whitespace-nowrap transition-all ${
              activeTab === "returns"
                ? "bg-[#264653] text-white shadow-xs"
                : "text-[#474741] hover:text-[#264653] hover:bg-surface-container"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns &amp; Exchanges</span>
            {returnsList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full">
                {returnsList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xs whitespace-nowrap transition-all ${
              activeTab === "support"
                ? "bg-[#264653] text-white shadow-xs"
                : "text-[#474741] hover:text-[#264653] hover:bg-surface-container"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Concierge Support</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xs whitespace-nowrap transition-all ${
              activeTab === "preferences"
                ? "bg-[#264653] text-white shadow-xs"
                : "text-[#474741] hover:text-[#264653] hover:bg-surface-container"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Alert Preferences</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & SIZING */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop">
            {/* Column 1: Member Card & Details */}
            <div className="lg:col-span-5 flex flex-col gap-space-lg bg-surface-container-low p-space-xl border border-stitch rounded-xs">
              <div className="flex items-center gap-space-md">
                <div className="w-16 h-16 rounded-full bg-[#2A9D8F] flex items-center justify-center font-title-editorial text-2xl text-white font-bold border border-white/40 shadow-xs">
                  {initials}
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-[#264653]">
                    {user.fullName}
                  </h3>
                  <p className="font-label-caps text-[10px] uppercase text-[#2A9D8F] font-bold">
                    Patron of Loomera &bull; Verified Member
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-space-md mt-4">
                <div>
                  <label className="font-label-caps text-[10px] uppercase text-[#474741] block mb-1 font-semibold">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    readOnly
                    className="w-full bg-surface p-space-sm font-body-md text-[#264653] border border-stitch opacity-85 focus-luxury rounded-2xs"
                  />
                </div>

                <div>
                  <label className="font-label-caps text-[10px] uppercase text-[#474741] block mb-1 font-semibold">
                    Preferred Tailoring Size
                  </label>
                  <input
                    type="text"
                    value={preferredSize}
                    disabled={!isEditing}
                    onChange={(e) => setPreferredSize(e.target.value)}
                    className="w-full bg-surface p-space-sm font-body-md text-[#264653] border border-stitch disabled:opacity-75 focus-luxury rounded-2xs"
                  />
                </div>

                <div className="pt-space-sm">
                  {isEditing ? (
                    <button
                      type="submit"
                      className="w-full bg-[#E76F51] text-white font-label-interactive text-label-interactive uppercase py-3 hover:bg-[#d45d3f] transition-colors shadow-xs font-semibold rounded-2xs cursor-pointer focus-luxury"
                    >
                      Save Preferences
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-[#264653] text-white border border-[#264653] font-label-interactive text-label-interactive uppercase py-3 hover:bg-[#2A9D8F] transition-colors shadow-xs font-semibold rounded-2xs cursor-pointer focus-luxury"
                    >
                      Edit Details
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Column 2: Wishlist & Recent Orders */}
            <div className="lg:col-span-7 flex flex-col gap-space-xl">
              {/* Wishlist summary */}
              <div className="bg-surface p-space-xl border border-stitch shadow-xs rounded-xs" id="wishlist">
                <div className="flex items-center justify-between mb-space-md border-b border-stitch pb-space-sm">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#2A9D8F]" />
                    <h3 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                      Saved Wishlist ({wishlist.length})
                    </h3>
                  </div>
                  <span className="font-label-caps text-[10px] text-[#2A9D8F] uppercase font-bold">
                    Curated Archive
                  </span>
                </div>

                {wishlist.length === 0 ? (
                  <p className="font-body-sm text-[#474741] italic py-6 text-center">
                    Your wishlist is empty. Tap the heart icon on any silhouette to save items.
                  </p>
                ) : (
                  <div className="flex flex-col gap-space-sm">
                    {wishlist.map((itemTitle) => (
                      <div
                        key={itemTitle}
                        className="flex items-center justify-between p-space-sm bg-surface-container-low border border-stitch rounded-2xs"
                      >
                        <span className="font-title-editorial text-[#264653] font-bold">
                          {itemTitle}
                        </span>
                        <Link
                          href="/collections/men"
                          className="font-label-caps text-[11px] text-[#2A9D8F] uppercase hover:text-[#264653] transition-colors underline font-semibold"
                        >
                          Inspect
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-surface p-space-xl border border-stitch shadow-xs rounded-xs">
                <div className="flex items-center justify-between mb-space-md border-b border-stitch pb-space-sm">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="w-4 h-4 text-[#2A9D8F]" />
                    <h3 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                      Recent Dispatches
                    </h3>
                  </div>
                  <Link
                    href="/orders"
                    className="font-label-caps text-[10px] text-[#2A9D8F] uppercase hover:text-[#264653] underline font-bold"
                  >
                    View All Orders &rarr;
                  </Link>
                </div>

                <div className="p-space-lg bg-surface-container-low border border-stitch rounded-2xs text-center py-8">
                  <p className="font-body-md text-[#474741] text-sm">
                    Track dispatches, live checkpoints, and lodge return manifests.
                  </p>
                  <Link
                    href="/orders"
                    className="inline-block mt-3 text-xs font-semibold uppercase tracking-wider text-[#2A9D8F] hover:text-[#264653] underline transition-colors"
                  >
                    Open Orders &amp; Logistics Manifest &rarr;
                  </Link>
                </div>
              </div>

              {/* Recently Examined Silhouettes */}
              <div className="bg-surface p-space-xl border border-stitch shadow-xs rounded-xs">
                <div className="flex items-center justify-between mb-space-md border-b border-stitch pb-space-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2A9D8F]" />
                    <h3 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                      Recently Examined ({views.length})
                    </h3>
                  </div>
                  {views.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearViews}
                      className="font-label-caps text-[10px] text-[#E76F51] hover:underline uppercase font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear History</span>
                    </button>
                  )}
                </div>

                {views.length === 0 ? (
                  <p className="font-body-sm text-[#474741] italic py-4 text-center text-xs">
                    No recently viewed silhouettes recorded. Garments you inspect will appear here.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {views.map((v) => (
                      <Link
                        key={v.id}
                        href={`/products/${v.product.id}`}
                        className="flex items-center gap-3 p-2.5 bg-surface-container-low border border-stitch rounded-2xs hover:border-[#2A9D8F] transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded border border-stone-200 overflow-hidden relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={v.product.image}
                            alt={v.product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-title-editorial text-xs font-bold text-[#264653] truncate">
                            {v.product.title}
                          </h4>
                          <div className="text-[11px] font-sans font-semibold text-[#264653]">
                            {formatInr(v.product.price)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Searches */}
              <div className="bg-surface p-space-xl border border-stitch shadow-xs rounded-xs">
                <div className="flex items-center justify-between mb-space-md border-b border-stitch pb-space-sm">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#2A9D8F]" />
                    <h3 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                      Recent Inquiries ({searches.length})
                    </h3>
                  </div>
                  {searches.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSearches}
                      className="font-label-caps text-[10px] text-[#E76F51] hover:underline uppercase font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Searches</span>
                    </button>
                  )}
                </div>

                {searches.length === 0 ? (
                  <p className="font-body-sm text-[#474741] italic py-4 text-center text-xs">
                    No previous searches saved. Inquiries through the search bar or AI assistant will be saved here.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {searches.map((s) => (
                      <span
                        key={s.id}
                        className="text-xs px-3 py-1.5 rounded-full bg-surface-container-low border border-stitch text-[#264653] font-sans font-medium flex items-center gap-1.5"
                      >
                        <span>&ldquo;{s.searchQuery}&rdquo;</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Restock Notification Subscriptions */}
              <div className="bg-surface p-space-xl border border-stitch shadow-xs rounded-xs">
                <div className="flex items-center justify-between mb-space-md border-b border-stitch pb-space-sm">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#2A9D8F]" />
                    <h3 className="font-title-editorial text-title-editorial text-[#264653] font-bold">
                      Active Restock Subscriptions ({notifications.length})
                    </h3>
                  </div>
                  <span className="font-label-caps text-[10px] text-[#2A9D8F] uppercase font-bold">
                    Atelier Logistics
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <p className="font-body-sm text-[#474741] italic py-4 text-center text-xs">
                    No active restock alerts. When an out-of-stock piece is requested, alerts will appear here.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between p-space-sm bg-surface-container-low border border-stitch rounded-2xs"
                      >
                        <div>
                          <div className="font-title-editorial text-xs font-bold text-[#264653]">
                            {n.productTitle}
                          </div>
                          <div className="text-[11px] font-sans text-stone-500">
                            Size {n.size} &bull; {n.color}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelNotification(n.id)}
                          className="text-[11px] text-[#E76F51] hover:underline font-medium cursor-pointer"
                        >
                          Cancel Alert
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATELIER PRIVILEGES & LOYALTY */}
        {activeTab === "loyalty" && (
          <div className="space-y-8">
            {/* Top Tier & Points Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#264653] text-white p-6 rounded-xs shadow-md border border-[#264653] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label-caps text-[10px] uppercase tracking-widest text-[#2A9D8F] font-bold">
                      Membership Tier
                    </span>
                    <Award className="w-5 h-5 text-[#2A9D8F]" />
                  </div>
                  <h3 className="font-headline-lg text-2xl font-serif">
                    {loyaltyAccount ? loyaltyAccount.tier.replace(/_/g, " ") : "SILVER PATRON"}
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Earn 1 reward point per ₹10 spent on tailored garments.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6">
                  <span className="text-[11px] text-white/60 uppercase">Tier Privilege Level</span>
                  <p className="text-sm font-semibold text-[#2A9D8F]">Complimentary Alteration Coverage</p>
                </div>
              </div>

              <div className="bg-surface-container-low border border-stitch p-6 rounded-xs shadow-xs flex flex-col justify-between">
                <div>
                  <span className="font-label-caps text-[10px] uppercase tracking-widest text-[#2A9D8F] font-bold">
                    Available Balance
                  </span>
                  <div className="font-headline-lg text-3xl font-serif text-[#264653] mt-2">
                    {loyaltyAccount?.pointsBalance || 0}{" "}
                    <span className="text-sm font-sans font-normal text-[#8a8a82]">PTS</span>
                  </div>
                  <p className="text-xs text-[#474741] mt-1">
                    Redeemable during checkout for instant voucher credits.
                  </p>
                </div>
                <div className="pt-4 border-t border-stitch mt-4 text-xs text-[#8a8a82]">
                  Lifetime Earned:{" "}
                  <strong className="text-[#264653]">{loyaltyAccount?.lifetimePoints || 0} pts</strong>
                </div>
              </div>

              {/* Referral Bonus Card */}
              <div className="bg-surface-container-low border border-stitch p-6 rounded-xs shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#E76F51] mb-2 font-bold text-xs uppercase">
                    <Gift className="w-4 h-4" />
                    <span>Invite a Gentleman</span>
                  </div>
                  <h4 className="font-headline-sm text-sm font-serif text-[#264653]">
                    Earn 250 Privilege Points
                  </h4>
                  <p className="text-xs text-[#474741] mt-1">
                    Share your personal referral code. When a friend places their first commission, both receive
                    250 bonus points.
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-stitch">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface border border-stitch px-3 py-2 rounded-2xs text-xs font-mono font-bold text-[#264653] tracking-widest text-center">
                      {loyaltyAccount?.referralCode || "LOOMERA-MEMBER"}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="px-3 py-2 bg-[#264653] hover:bg-[#2A9D8F] text-white rounded-2xs text-xs font-semibold uppercase transition-colors flex items-center gap-1"
                    >
                      {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReferral ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Transactions Ledger */}
            <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
              <h3 className="font-headline-sm text-base font-serif text-[#264653] border-b border-stitch pb-3 mb-4">
                Privilege Points Ledger
              </h3>

              {loyaltyTxns.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#8a8a82]">
                  No points activity recorded yet. Orders placed will automatically accrue points.
                </div>
              ) : (
                <div className="divide-y divide-stitch/60 text-xs">
                  {loyaltyTxns.map((tx) => (
                    <div key={tx.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[#264653] uppercase">{tx.reason}</span>
                        <p className="text-[11px] text-[#8a8a82]">
                          {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={`font-bold font-mono text-sm ${
                          tx.points >= 0 ? "text-[#2A9D8F]" : "text-red-600"
                        }`}
                      >
                        {tx.points >= 0 ? `+${tx.points}` : tx.points} PTS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RETURNS & EXCHANGES */}
        {activeTab === "returns" && (
          <div className="space-y-6">
            <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stitch pb-4 mb-4">
                <div>
                  <h3 className="font-headline-sm text-base font-serif text-[#264653]">
                    15-Day Bespoke Guarantee Manifests
                  </h3>
                  <p className="text-xs text-[#474741] mt-0.5">
                    View active return and exchange requests. Pickups are scheduled directly to your door.
                  </p>
                </div>
                <Link
                  href="/orders"
                  className="px-4 py-2 bg-[#264653] hover:bg-[#2A9D8F] text-white text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors self-start"
                >
                  Initiate Return From Order &rarr;
                </Link>
              </div>

              {returnsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#8a8a82]">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 text-[#2A9D8F]/50" />
                  <p className="font-medium text-[#264653]">No Return or Exchange Requests Lodged</p>
                  <p className="mt-1">
                    Delivered orders within 15 days of dispatch are eligible for complimentary size exchanges or full
                    refunds.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {returnsList.map((ret) => (
                    <div
                      key={ret.id}
                      className="p-4 bg-surface border border-stitch rounded-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase text-[#264653]">{ret.type}</span>
                          <span className="text-xs text-[#8a8a82]">&bull; {ret.reason}</span>
                        </div>
                        <p className="text-[11px] text-[#8a8a82] mt-1">
                          Lodged on{" "}
                          {new Date(ret.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {ret.refundAmountInr > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-[#8a8a82] block uppercase">Refund Value</span>
                            <span className="text-xs font-bold text-[#264653]">
                              {formatInr(ret.refundAmountInr)}
                            </span>
                          </div>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            ret.status === "APPROVED" || ret.status === "REFUNDED"
                              ? "bg-[#2A9D8F]/15 text-[#2A9D8F]"
                              : ret.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ret.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONCIERGE SUPPORT */}
        {activeTab === "support" && (
          <div className="space-y-6">
            <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stitch pb-4 mb-4">
                <div>
                  <h3 className="font-headline-sm text-base font-serif text-[#264653]">
                    Concierge Support Inquiries
                  </h3>
                  <p className="text-xs text-[#474741] mt-0.5">
                    Direct communication with the Loomera atelier team for sizing, shipping, and order assistance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(!showNewTicketForm)}
                  className="px-4 py-2 bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors self-start"
                >
                  {showNewTicketForm ? "Cancel Inquiry" : "+ Lodge New Inquiry"}
                </button>
              </div>

              {/* New Ticket Form */}
              {showNewTicketForm && (
                <form
                  onSubmit={handleCreateTicket}
                  className="mb-6 p-4 bg-surface border border-stitch rounded-2xs space-y-3"
                >
                  <h4 className="font-label-caps text-xs uppercase font-bold text-[#264653]">
                    Lodge Atelier Inquiry
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-[#474741] mb-1">
                        Category
                      </label>
                      <select
                        value={newTicketCategory}
                        onChange={(e) => setNewTicketCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653]"
                      >
                        <option value="GENERAL">General Concierge</option>
                        <option value="ORDER_STATUS">Order Status &amp; Tracking</option>
                        <option value="DELIVERY_ISSUE">Courier &amp; Transit</option>
                        <option value="RETURN_REQUEST">Return / Exchange Assistance</option>
                        <option value="PRODUCT_QUESTION">Product Care &amp; Alteration</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-[#474741] mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={newTicketSubject}
                        onChange={(e) => setNewTicketSubject(e.target.value)}
                        placeholder="e.g. Sizing inquiry for Nehru Jacket"
                        className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#474741] mb-1">
                      Message
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newTicketMessage}
                      onChange={(e) => setNewTicketMessage(e.target.value)}
                      placeholder="Describe your inquiry..."
                      className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="px-5 py-2 bg-[#264653] hover:bg-[#1f3742] text-white text-xs font-semibold uppercase tracking-wider rounded-2xs disabled:opacity-50"
                    >
                      {isSubmittingTicket ? "Submitting..." : "Dispatch Inquiry"}
                    </button>
                  </div>
                </form>
              )}

              {ticketsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#8a8a82]">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[#2A9D8F]/50" />
                  <p className="font-medium text-[#264653]">No Active Support Tickets</p>
                  <p className="mt-1">Need assistance? Lodge an inquiry above or chat with our AI Stylist.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketsList.map((ticket) => (
                    <div key={ticket.id} className="p-4 bg-surface border border-stitch rounded-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stitch pb-2 mb-2">
                        <div>
                          <span className="font-label-caps text-[10px] uppercase text-[#2A9D8F] font-bold">
                            {ticket.category.replace(/_/g, " ")}
                          </span>
                          <h4 className="font-title-editorial text-sm font-bold text-[#264653]">
                            {ticket.subject}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                                ? "bg-[#2A9D8F]/15 text-[#2A9D8F]"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ticket.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {ticket.messages && ticket.messages.length > 0 && (
                        <div className="space-y-2 mt-2 pt-1">
                          {ticket.messages.slice(-2).map((m) => (
                            <div
                              key={m.id}
                              className={`p-2 rounded-2xs text-xs ${
                                m.senderRole === "ADMIN" || m.senderRole === "SUPPORT"
                                  ? "bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 text-[#264653]"
                                  : "bg-surface-container-low border border-stitch text-[#474741]"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-[#8a8a82] mb-1">
                                <span className="font-bold uppercase">
                                  {m.senderRole === "CUSTOMER" ? "You" : "Atelier Concierge"}
                                </span>
                                <span>
                                  {new Date(m.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="leading-relaxed">{m.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ALERT PREFERENCES */}
        {activeTab === "preferences" && (
          <div className="max-w-2xl">
            <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
              <h3 className="font-headline-sm text-base font-serif text-[#264653] border-b border-stitch pb-3 mb-4">
                Communication &amp; Notification Controls
              </h3>
              <p className="text-xs text-[#474741] mb-6 leading-relaxed">
                Configure your transmission preferences for order manifests, tracking updates, and seasonal
                curations. You retain complete sovereignty over your contact channels.
              </p>

              <form onSubmit={handleSavePreferences} className="space-y-5">
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.emailOrderUpdates}
                      onChange={(e) => setPrefs({ ...prefs, emailOrderUpdates: e.target.checked })}
                      className="mt-0.5 accent-[#264653] rounded"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#264653] block">
                        Email Order Manifests &amp; Dispatch Updates
                      </span>
                      <span className="text-[11px] text-[#8a8a82]">
                        Receive digital receipts, tracking links, and delivery confirmations (Recommended).
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.smsOrderUpdates}
                      onChange={(e) => setPrefs({ ...prefs, smsOrderUpdates: e.target.checked })}
                      className="mt-0.5 accent-[#264653] rounded"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#264653] block">
                        SMS Express Delivery Checkpoints
                      </span>
                      <span className="text-[11px] text-[#8a8a82]">
                        Receive instant SMS alerts when your bespoke parcel is out for doorstep delivery.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.whatsappUpdates}
                      onChange={(e) => setPrefs({ ...prefs, whatsappUpdates: e.target.checked })}
                      className="mt-0.5 accent-[#264653] rounded"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#264653] block">
                        WhatsApp Concierge Messaging
                      </span>
                      <span className="text-[11px] text-[#8a8a82]">
                        Real-time courier tracking and interactive alterations assistance via WhatsApp.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.emailPromotions}
                      onChange={(e) => setPrefs({ ...prefs, emailPromotions: e.target.checked })}
                      className="mt-0.5 accent-[#264653] rounded"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#264653] block">
                        Seasonal Lookbooks &amp; Atelier Privilege Drops
                      </span>
                      <span className="text-[11px] text-[#8a8a82]">
                        Curated editorial invitations and exclusive early access to handloom collections.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-stitch flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPrefs}
                    className="px-6 py-2.5 bg-[#264653] hover:bg-[#2A9D8F] text-white text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors disabled:opacity-50"
                  >
                    {isSavingPrefs ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AccountClient({ user }: { user: AccountUser }) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <AccountContent user={user} />
        <Footer />
        <CartDrawer />
        <SearchModal />
        <SizeGuideModal />
        <ToastNotification />
        <AiAssistantWidget />
      </div>
    </CartProvider>
  );
}
