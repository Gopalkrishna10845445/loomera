"use client";

import React, { useState } from "react";
import { formatInr } from "@/lib/currency";

interface CouponRow {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderValueInr: number;
  maxDiscountInr: number | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  firstOrderOnly: boolean;
  isActive: boolean;
  startsAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
}

interface AdminPromotionsClientProps {
  initialCoupons: CouponRow[];
}

export default function AdminPromotionsClient({ initialCoupons }: AdminPromotionsClientProps) {
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Coupon Form State
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [newValue, setNewValue] = useState(15);
  const [newMinOrder, setNewMinOrder] = useState(2999);
  const [newMaxDiscount, setNewMaxDiscount] = useState(1000);
  const [newUsageLimit, setNewUsageLimit] = useState<number | "">("");
  const [newFirstOrderOnly, setNewFirstOrderOnly] = useState(false);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update voucher");

      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c))
      );
      setStatusMessage({ type: "success", text: `Voucher status updated` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle status";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          description: newDesc,
          discountType: newType,
          discountValue: Number(newValue),
          minOrderValueInr: Number(newMinOrder),
          maxDiscountInr: newType === "PERCENTAGE" && newMaxDiscount ? Number(newMaxDiscount) : null,
          usageLimit: newUsageLimit ? Number(newUsageLimit) : null,
          firstOrderOnly: newFirstOrderOnly,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create voucher");

      setCoupons((prev) => [data.coupon, ...prev]);
      setStatusMessage({ type: "success", text: `Promotion voucher ${data.coupon.code} activated` });
      setIsModalOpen(false);
      setNewCode("");
      setNewDesc("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#2A9D8F] font-semibold">
            Marketing &amp; Promotions Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Promotional Vouchers &amp; Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Configure server-authoritative discount rules, minimum spend thresholds, and campaign limits.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-[#264653] hover:bg-[#1E353F] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
        >
          + Create New Voucher
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-stone-400 hover:text-stone-700">
            ✕
          </button>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Min. Spend</th>
                <th className="py-3.5 px-4">Redemptions</th>
                <th className="py-3.5 px-4">Eligibility</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No promotional vouchers created yet.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900 text-sm">{c.code}</td>
                    <td className="py-3.5 px-4 text-stone-600">{c.description}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#2A9D8F]">
                      {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : formatInr(c.discountValue)}
                      {c.maxDiscountInr ? ` (Cap: ${formatInr(c.maxDiscountInr)})` : ""}
                    </td>
                    <td className="py-3.5 px-4">{formatInr(c.minOrderValueInr)}</td>
                    <td className="py-3.5 px-4 font-mono">
                      {c.usageCount} / {c.usageLimit || "∞"}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-stone-500">
                      {c.firstOrderOnly ? "First-time patrons only" : "All eligible patrons"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          c.isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {c.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(c.id, c.isActive)}
                        disabled={isLoading}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                          c.isActive
                            ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {c.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-lg font-serif font-bold text-stone-900">Create Promotional Voucher</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-900 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ATELIER15, WELCOME500"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-[#264653]"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-900 block mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exclusive 15% privilege discount on handloom garments"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#264653]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-900 block mb-1">Discount Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-900 block mb-1">
                    Value {newType === "PERCENTAGE" ? "(%)" : "(₹)"}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newValue}
                    onChange={(e) => setNewValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-900 block mb-1">Min. Order Value (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newMinOrder}
                    onChange={(e) => setNewMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
                {newType === "PERCENTAGE" && (
                  <div>
                    <label className="font-semibold text-stone-900 block mb-1">Max Cap Discount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={newMaxDiscount}
                      onChange={(e) => setNewMaxDiscount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-stone-900 block mb-1">Global Usage Limit (Optional)</label>
                <input
                  type="number"
                  placeholder="Leave empty for unlimited redemptions"
                  value={newUsageLimit}
                  onChange={(e) => setNewUsageLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="firstOrderCheck"
                  checked={newFirstOrderOnly}
                  onChange={(e) => setNewFirstOrderOnly(e.target.checked)}
                  className="rounded text-[#264653] focus:ring-[#264653]"
                />
                <label htmlFor="firstOrderCheck" className="text-stone-700">
                  Restrict strictly to first-time customer orders
                </label>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-lg bg-[#264653] text-white font-semibold hover:bg-[#1E353F]"
                >
                  Publish Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
