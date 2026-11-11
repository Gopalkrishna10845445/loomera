"use client";

import React, { useState } from "react";
import { formatInr } from "@/lib/currency";

interface AdminReturnRow {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  type: string;
  status: string;
  reason: string;
  notes: string | null;
  inspectionNotes: string | null;
  refundAmountInr: number;
  refundStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminReturnsClientProps {
  initialReturns: AdminReturnRow[];
}

export default function AdminReturnsClient({ initialReturns }: AdminReturnsClientProps) {
  const [returns, setReturns] = useState<AdminReturnRow[]>(initialReturns);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspection Drawer
  const [activeReturn, setActiveReturn] = useState<AdminReturnRow | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      search === "" ||
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || r.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    if (!activeReturn) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/returns/${activeReturn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: reviewNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setStatusMessage({
        type: "success",
        text: `Return request ${activeReturn.returnNumber} ${action === "APPROVE" ? "approved" : "rejected"}`,
      });
      const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
      setReturns((prev) =>
        prev.map((r) => (r.id === activeReturn.id ? { ...r, status: nextStatus, inspectionNotes: reviewNotes } : r))
      );
      setActiveReturn((prev) => (prev ? { ...prev, status: nextStatus } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to review return";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!activeReturn) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/returns/${activeReturn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROCESS_REFUND",
          inspectionNotes: reviewNotes || "Garment tags verified intact. Restocked to inventory.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process refund");

      setStatusMessage({
        type: "success",
        text: `Refund of ${formatInr(activeReturn.refundAmountInr)} processed & stock restored to inventory`,
      });
      setReturns((prev) =>
        prev.map((r) =>
          r.id === activeReturn.id ? { ...r, status: "COMPLETED", refundStatus: "PROCESSED" } : r
        )
      );
      setActiveReturn((prev) => (prev ? { ...prev, status: "COMPLETED", refundStatus: "PROCESSED" } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refund processing failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "APPROVED":
        return "bg-sky-50 text-sky-800 border-sky-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#2A9D8F] font-semibold">
            Post-Purchase Services
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Returns, Exchanges &amp; Refunds
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Review patron return requests, schedule courier reverse pickups, and execute secure inventory-restoring refunds.
          </p>
        </div>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search by return #, order #, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-stone-300 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#264653]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {["ALL", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-colors border ${
                selectedStatus === st
                  ? "bg-[#264653] text-white border-[#264653]"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Return Number</th>
                <th className="py-3.5 px-4">Order Number</th>
                <th className="py-3.5 px-4">Patron</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Refund Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No return requests matching your selection.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{ret.returnNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-[#264653]">{ret.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-900">{ret.customerName}</div>
                      <div className="text-[11px] text-stone-400">{ret.customerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold uppercase text-stone-700">{ret.type}</td>
                    <td className="py-3.5 px-4 text-stone-600 max-w-[200px] truncate">{ret.reason}</td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">{formatInr(ret.refundAmountInr)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(ret.status)}`}>
                        {ret.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveReturn(ret);
                          setReviewNotes(ret.inspectionNotes || "");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium transition-colors"
                      >
                        Inspect &amp; Triage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {activeReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">Return Dossier</span>
                <h2 className="text-xl font-serif font-bold text-stone-900">{activeReturn.returnNumber}</h2>
              </div>
              <button onClick={() => setActiveReturn(null)} className="text-stone-400 hover:text-stone-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500 block">Associated Order:</span>
                  <span className="font-mono font-bold text-stone-900">{activeReturn.orderNumber}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Patron:</span>
                  <span className="font-medium text-stone-900">{activeReturn.customerName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Category / Type:</span>
                  <span className="font-semibold uppercase text-stone-900">{activeReturn.type}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Refund Amount:</span>
                  <span className="font-bold text-[#2A9D8F]">{formatInr(activeReturn.refundAmountInr)}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-stone-900 block mb-1">Patron&apos;s Stated Reason:</span>
                <p className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-stone-700">
                  {activeReturn.reason} {activeReturn.notes ? `— "${activeReturn.notes}"` : ""}
                </p>
              </div>

              <div>
                <label className="font-semibold text-stone-900 block mb-1">
                  Atelier Warehouse Inspection Notes:
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record condition of tags, fabric inspection, or justification..."
                  className="w-full p-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#264653]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-200 flex flex-wrap gap-2 justify-end">
                {activeReturn.status === "REQUESTED" && (
                  <>
                    <button
                      onClick={() => handleReviewAction("REJECT")}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 border border-rose-200"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleReviewAction("APPROVE")}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
                    >
                      Approve &amp; Schedule Pickup
                    </button>
                  </>
                )}

                {activeReturn.status === "APPROVED" && activeReturn.refundStatus !== "PROCESSED" && (
                  <button
                    onClick={handleProcessRefund}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-lg bg-[#2A9D8F] text-white font-bold hover:bg-[#238276] shadow-xs"
                  >
                    Pass Inspection &amp; Execute Refund ({formatInr(activeReturn.refundAmountInr)})
                  </button>
                )}

                {activeReturn.refundStatus === "PROCESSED" && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    ✓ Refund Settled &amp; Inventory Restored
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
