"use client";

import React, { useState } from "react";
import { formatInr } from "@/lib/currency";
import { InventoryOverviewItem, MovementType } from "@/lib/admin/types";

interface MovementRecord {
  id: string;
  variantId: string;
  productId: string;
  adminEmail: string | null;
  adminName: string | null;
  movementType: string;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  createdAt: Date;
  productTitle: string;
  sku: string;
  size: string;
  colorName: string;
}

interface AdminInventoryClientProps {
  initialItems: InventoryOverviewItem[];
  initialThreshold: number;
  initialMovements: MovementRecord[];
}

export default function AdminInventoryClient({
  initialItems,
  initialThreshold,
  initialMovements,
}: AdminInventoryClientProps) {
  const [items, setItems] = useState<InventoryOverviewItem[]>(initialItems);
  const [movements, setMovements] = useState<MovementRecord[]>(initialMovements);
  const [threshold, setThreshold] = useState<number>(initialThreshold);
  const [activeTab, setActiveTab] = useState<"matrix" | "movements">("matrix");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Adjustment Modal
  const [selectedVariant, setSelectedVariant] = useState<InventoryOverviewItem | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<{
    movementType: MovementType;
    quantityDelta: number;
    reason: string;
  }>({
    movementType: "STOCK_ADDED",
    quantityDelta: 10,
    reason: "",
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.productTitle.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.colorName.toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = lowStockOnly ? item.isLowStock || item.isOutOfStock : true;
    return matchesSearch && matchesLowStock;
  });

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariant.variantId,
          movementType: adjustmentForm.movementType,
          quantityDelta: Number(adjustmentForm.quantityDelta),
          reason: adjustmentForm.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust stock");

      setStatusMessage({ type: "success", text: data.message });
      setSelectedVariant(null);
      setAdjustmentForm({ movementType: "STOCK_ADDED", quantityDelta: 10, reason: "" });

      // Refresh overview & movements
      const [refOverview, refMovements] = await Promise.all([
        fetch("/api/admin/inventory").then((r) => r.json()),
        fetch("/api/admin/inventory/movements").then((r) => r.json()),
      ]);

      if (refOverview.items) setItems(refOverview.items);
      if (refMovements.movements) setMovements(refMovements.movements);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateThreshold = async (newVal: number) => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/inventory/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockThreshold: newVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update threshold");

      setThreshold(newVal);
      setStatusMessage({ type: "success", text: `Low stock threshold updated to ${newVal} units.` });

      // Refresh items with new threshold
      const refOverview = await fetch("/api/admin/inventory").then((r) => r.json());
      if (refOverview.items) setItems(refOverview.items);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Warehouse & Supply
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Inventory Management
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Physical stock allocation, active reservation locks, and stock adjustment ledger.
          </p>
        </div>

        {/* Low Stock Threshold Widget */}
        <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm flex items-center gap-3">
          <span className="text-xs text-stone-600 font-medium">Low Stock Alert:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => handleUpdateThreshold(Number(e.target.value))}
            className="w-16 px-2 py-1 text-xs text-center font-bold text-stone-900 border border-stone-300 rounded focus:ring-1 focus:ring-[#2A9D8F]"
          />
          <span className="text-[10px] text-stone-400 uppercase font-mono">units</span>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === "matrix"
              ? "border-[#264653] text-[#264653]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          Live Inventory Matrix ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 px-4 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === "movements"
              ? "border-[#264653] text-[#264653]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          Movement Ledger ({movements.length})
        </button>
      </div>

      {activeTab === "matrix" ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="Search by garment, SKU, or color..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F] bg-stone-50/50"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded border-stone-300 text-[#264653] focus:ring-[#2A9D8F]"
              />
              <span className="font-medium text-amber-700">Filter Low & Out of Stock Only</span>
            </label>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                    <th className="py-3.5 px-4">Garment & SKU</th>
                    <th className="py-3.5 px-4">Size & Color</th>
                    <th className="py-3.5 px-4">Unit Price</th>
                    <th className="py-3.5 px-4">Physical Stock</th>
                    <th className="py-3.5 px-4">Active Reserved</th>
                    <th className="py-3.5 px-4">Effective Available</th>
                    <th className="py-3.5 px-4">Health</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-stone-400">
                        No inventory items matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.variantId} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-stone-900">
                          <div>
                            <span className="font-semibold text-stone-900">{item.productTitle}</span>
                            <p className="text-[10px] text-stone-400 font-mono">{item.sku}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block shadow-xs"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            <span>
                              {item.colorName} ({item.size})
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-900">
                          {formatInr(item.priceOverrideInr || item.basePriceInr)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-900">
                          {item.physicalStock} units
                        </td>
                        <td className="py-3.5 px-4 text-stone-500">
                          {item.reservedStock > 0 ? (
                            <span className="font-semibold text-amber-600">
                              {item.reservedStock} locked
                            </span>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              item.availableStock === 0
                                ? "text-rose-600"
                                : item.isLowStock
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {item.availableStock} available
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : item.isLowStock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Low Stock (≤ {threshold})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVariant(item);
                              setAdjustmentForm({
                                movementType: "STOCK_ADDED",
                                quantityDelta: 10,
                                reason: "",
                              });
                            }}
                            className="px-3 py-1.5 rounded-md bg-[#264653] text-white text-[11px] font-medium hover:bg-[#1E353F] transition-colors"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Historical Movements Tab */
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Garment / SKU</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Delta</th>
                  <th className="py-3.5 px-4">Quantity Path</th>
                  <th className="py-3.5 px-4">Authorized By</th>
                  <th className="py-3.5 px-4">Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-stone-400">
                      No stock adjustments recorded in ledger yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[10px] text-stone-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-900">
                        {m.productTitle} <span className="text-stone-400 font-mono text-[10px]">({m.sku})</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          {m.movementType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={m.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"}>
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-600">
                        {m.previousQuantity} → <span className="font-bold text-stone-900">{m.newQuantity}</span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {m.adminName || m.adminEmail || "System Automation"}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate" title={m.reason}>
                        {m.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-900">
                  Adjust Physical Stock
                </h2>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  {selectedVariant.productTitle} — {selectedVariant.sku}
                </p>
              </div>
              <button
                onClick={() => setSelectedVariant(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 pt-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-stone-500 block text-[10px] uppercase font-mono">Current Stock</span>
                  <span className="font-bold text-stone-900 text-sm">{selectedVariant.physicalStock} units</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px] uppercase font-mono">Active Reservations</span>
                  <span className="font-bold text-amber-600 text-sm">{selectedVariant.reservedStock} locked</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px] uppercase font-mono">Effective Available</span>
                  <span className="font-bold text-emerald-700 text-sm">{selectedVariant.availableStock} available</span>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Adjustment Type</label>
                <select
                  value={adjustmentForm.movementType}
                  onChange={(e) => {
                    const mt = e.target.value as MovementType;
                    const delta = mt === "STOCK_ADDED" || mt === "RETURN_RECEIVED" ? Math.abs(adjustmentForm.quantityDelta) : -Math.abs(adjustmentForm.quantityDelta);
                    setAdjustmentForm({ ...adjustmentForm, movementType: mt, quantityDelta: delta });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                >
                  <option value="STOCK_ADDED">Stock Added (Restock / Inbound Loom)</option>
                  <option value="STOCK_REMOVED">Stock Removed (Manual Deduction)</option>
                  <option value="STOCK_ADJUSTED">Stock Audit Reconciliation</option>
                  <option value="DAMAGED_STOCK">Damaged Stock Write-off</option>
                  <option value="RETURN_RECEIVED">Customer Return Restock</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Quantity Delta (Positive or Negative)
                </label>
                <input
                  type="number"
                  required
                  value={adjustmentForm.quantityDelta}
                  onChange={(e) =>
                    setAdjustmentForm({ ...adjustmentForm, quantityDelta: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Resulting physical stock will be:{" "}
                  <span className="font-bold text-stone-900">
                    {selectedVariant.physicalStock + Number(adjustmentForm.quantityDelta)} units
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Audit Justification Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Received shipment batch #JB-402 from Chanderi workshop..."
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || adjustmentForm.quantityDelta === 0}
                  className="px-5 py-2 rounded-lg bg-[#264653] text-white font-semibold hover:bg-[#1E353F]"
                >
                  {isLoading ? "Updating..." : "Commit Stock Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
