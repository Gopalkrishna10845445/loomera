"use client";

import React, { useState } from "react";
import { formatInr } from "@/lib/currency";
import { OrderStatus, VALID_ORDER_STATUSES } from "@/lib/admin/types";

interface AdminOrderRow {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientState: string;
  status: string;
  totalInr: number;
  subtotalInr: number;
  shippingFeeInr: number;
  shippingMethod: string;
  currency: string;
  itemCount: number;
  paymentStatus: string | null;
  paymentGateway: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
  createdAt: Date;
}

interface AdminOrdersClientProps {
  initialOrders: AdminOrderRow[];
}

export default function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const [orders, setOrders] = useState<AdminOrderRow[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspector State
  const [inspectingOrder, setInspectingOrder] = useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState<OrderStatus>("PROCESSING");
  const [transitionReason, setTransitionReason] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState<"DELHIVERY" | "SHIPROCKET" | "BLUEDART">("DELHIVERY");
  const [referenceTime] = useState(() => Date.now());

  // Refund State
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [restoreStockOnRefund, setRestoreStockOnRefund] = useState(true);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      search === "" ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      o.recipientPhone.includes(search);
    const matchesStatus =
      selectedStatus === "ALL"
        ? true
        : selectedStatus === "AWAITING_FULFILMENT"
        ? ["CONFIRMED", "PROCESSING", "PACKED"].includes(o.status)
        : selectedStatus === "DELAYED"
        ? ["CONFIRMED", "PROCESSING", "PACKED"].includes(o.status) &&
          referenceTime - new Date(o.createdAt).getTime() > 48 * 3600 * 1000
        : o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${inspectingOrder.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier: selectedCarrier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create shipment");

      setStatusMessage({
        type: "success",
        text: `Shipment booked with ${selectedCarrier} (Tracking: ${data.trackingNumber})`,
      });

      setInspectingOrder((prev: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        ...prev,
        status: "SHIPPED",
        shipment: data.shipment,
      }));

      setOrders((prev) =>
        prev.map((o) =>
          o.id === inspectingOrder.id
            ? { ...o, status: "SHIPPED", carrier: selectedCarrier, trackingNumber: data.trackingNumber }
            : o
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Shipment dispatch failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspect = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load order details");

      setInspectingOrder(data.order);
      setTransitionStatus(data.order.status as OrderStatus);
      setTransitionReason("");
      setIsInspectorOpen(true);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${inspectingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: transitionStatus,
          reason: transitionReason || `Transitioned to ${transitionStatus} by administrator`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setStatusMessage({ type: "success", text: data.message });
      setInspectingOrder((prev: any) => ({ ...prev, status: transitionStatus })); // eslint-disable-line @typescript-eslint/no-explicit-any

      // Update list state
      setOrders((prev) =>
        prev.map((o) => (o.id === inspectingOrder.id ? { ...o, status: transitionStatus } : o))
      );
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${inspectingOrder.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: refundReason,
          restoreStock: restoreStockOnRefund,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process refund");

      setStatusMessage({ type: "success", text: data.message });
      setIsRefundOpen(false);
      setRefundReason("");

      // Refresh inspected order
      handleInspect(inspectingOrder.id);

      // Update list state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === inspectingOrder.id
            ? { ...o, status: "RETURNED", paymentStatus: "REFUNDED" }
            : o
        )
      );
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PROCESSING":
      case "PACKED":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "DELIVERED":
        return "bg-teal-50 text-teal-800 border-teal-200 font-bold";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "RETURNED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Atelier Fulfillment
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Order Administration
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Fulfill client orders, track delivery milestones, review payment gateways, and issue refunds.
          </p>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search by order #, patron, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F] bg-stone-50/50"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            "ALL",
            "AWAITING_FULFILMENT",
            "DELAYED",
            "CONFIRMED",
            "PROCESSING",
            "PACKED",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "RETURNED",
          ].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-colors border ${
                selectedStatus === st
                  ? "bg-[#264653] text-white border-[#264653]"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Order Number</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Client / Destination</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total (INR)</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Carrier / Tracking</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-stone-400">
                    No orders match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-stone-900">{o.recipientName}</span>
                        <p className="text-[10px] text-stone-400">{o.recipientCity}, {o.recipientState}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 font-medium">
                      {o.itemCount} pcs
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {formatInr(o.totalInr)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${
                          o.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : o.paymentStatus === "REFUNDED"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {o.paymentStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {o.trackingNumber ? (
                        <div>
                          <span className="font-bold text-stone-800">{o.carrier}</span>
                          <p className="text-stone-500 text-[10px]">{o.trackingNumber}</p>
                        </div>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold border ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleInspect(o.id)}
                        className="px-3 py-1.5 rounded-md bg-[#264653] text-white text-[11px] font-semibold hover:bg-[#1E353F] transition-colors"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Inspector Modal */}
      {isInspectorOpen && inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">Order Dossier</span>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {inspectingOrder.orderNumber}
                </h2>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 pt-4 text-xs">
              {/* Order Status & Actions */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">Current Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                      inspectingOrder.status
                    )}`}
                  >
                    {inspectingOrder.status.replace(/_/g, " ")}
                  </span>
                </div>

                <form onSubmit={handleUpdateStatus} className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row gap-2">
                  <select
                    value={transitionStatus}
                    onChange={(e) => setTransitionStatus(e.target.value as OrderStatus)}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white font-medium"
                  >
                    {VALID_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Status transition reason..."
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-[#264653] text-white font-semibold hover:bg-[#1E353F]"
                  >
                    Update
                  </button>
                </form>

                {inspectingOrder.payment?.status === "PAID" && (
                  <div className="pt-2 border-t border-stone-200 flex justify-end">
                    <button
                      onClick={() => setIsRefundOpen(true)}
                      className="text-rose-600 hover:text-rose-800 font-medium"
                    >
                      Process Refund / Return Restock →
                    </button>
                  </div>
                )}
              </div>

              {/* Items Snapshot */}
              <div>
                <h3 className="font-serif font-bold text-stone-900 mb-2">Garments Snapshot</h3>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                  {inspectingOrder.items.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-stone-900">{item.productTitle}</p>
                        <p className="text-[10px] text-stone-400">
                          {item.color} • Size {item.size} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-stone-900">{formatInr(item.lineTotalInr)}</p>
                        <p className="text-[10px] text-stone-400">@{formatInr(item.unitPriceInr)}/pc</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-stone-50 flex items-center justify-between font-bold text-stone-900">
                    <span>Grand Total:</span>
                    <span>{formatInr(inspectingOrder.totalInr)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping & Payment Grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h4 className="font-semibold text-stone-900 mb-2">Delivery Destination</h4>
                  <p className="font-medium text-stone-800">{inspectingOrder.shippingAddress.fullName}</p>
                  <p className="text-stone-600">{inspectingOrder.shippingAddress.addressLine1}</p>
                  {inspectingOrder.shippingAddress.addressLine2 && (
                    <p className="text-stone-600">{inspectingOrder.shippingAddress.addressLine2}</p>
                  )}
                  <p className="text-stone-600">
                    {inspectingOrder.shippingAddress.city}, {inspectingOrder.shippingAddress.state} - {inspectingOrder.shippingAddress.postalCode}
                  </p>
                  <p className="text-stone-500 font-mono text-[11px] mt-1">
                    📞 {inspectingOrder.shippingAddress.phone}
                  </p>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h4 className="font-semibold text-stone-900 mb-2">Payment Verification</h4>
                  <p className="text-stone-600">
                    Gateway: <span className="font-bold text-stone-900">{inspectingOrder.payment?.gateway || "RAZORPAY"}</span>
                  </p>
                  <p className="text-stone-600 font-mono text-[11px] mt-1">
                    Order ID: {inspectingOrder.payment?.gatewayOrderId || "N/A"}
                  </p>
                  <p className="text-stone-600 font-mono text-[11px]">
                    Payment ID: {inspectingOrder.payment?.gatewayPaymentId || "N/A"}
                  </p>
                  <p className="mt-1">
                    Status:{" "}
                    <span className="font-bold text-emerald-700 font-mono">
                      {inspectingOrder.payment?.status || "PENDING"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Carrier Shipment Section */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="font-semibold text-stone-900 mb-2">Carrier Dispatch &amp; Tracking</h4>
                {inspectingOrder.shipment ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-700">Carrier: {inspectingOrder.shipment.carrier}</span>
                      <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        {inspectingOrder.shipment.status}
                      </span>
                    </div>
                    <p className="font-mono text-stone-600">AWB / Tracking #: {inspectingOrder.shipment.trackingNumber}</p>
                    {inspectingOrder.shipment.labelUrl && (
                      <a
                        href={inspectingOrder.shipment.labelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-[#2A9D8F] hover:underline font-semibold text-[11px]"
                      >
                        📄 Print Shipping Label (PDF) →
                      </a>
                    )}
                    {inspectingOrder.shipment.events && inspectingOrder.shipment.events.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-stone-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400">Transit Checkpoints</span>
                        {inspectingOrder.shipment.events.slice(0, 3).map((ev: { id: string; statusDescription: string; carrierEventTimestamp: Date }) => (
                          <div key={ev.id} className="text-[11px] text-stone-600 flex justify-between">
                            <span>{ev.statusDescription}</span>
                            <span className="text-stone-400 font-mono">
                              {new Date(ev.carrierEventTimestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : ["CONFIRMED", "PROCESSING", "PACKED"].includes(inspectingOrder.status) ? (
                  <form onSubmit={handleCreateShipment} className="space-y-2.5">
                    <p className="text-stone-600 text-xs">
                      Order is ready for carrier dispatch. Select your logistics partner:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedCarrier}
                        onChange={(e) => setSelectedCarrier(e.target.value as "DELHIVERY" | "SHIPROCKET" | "BLUEDART")}
                        className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white font-medium text-xs"
                      >
                        <option value="DELHIVERY">Delhivery Surface / Air Express</option>
                        <option value="SHIPROCKET">Shiprocket Multi-Carrier</option>
                        <option value="BLUEDART">Blue Dart Domestic Priority</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-[#2A9D8F] text-white text-xs font-bold hover:bg-[#238276] shadow-xs"
                      >
                        Dispatch Shipment
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-stone-400 text-xs">No shipment active for this order.</p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-serif font-bold text-stone-900 mb-2">Milestone Timeline</h3>
                <div className="border border-stone-200 rounded-xl p-3 bg-white space-y-2 max-h-36 overflow-y-auto">
                  {inspectingOrder.statusHistory.map((h: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <div key={h.id} className="text-[11px] flex items-center justify-between border-b border-stone-100 pb-1.5 last:border-none">
                      <div>
                        <span className="font-bold text-stone-900">{h.newStatus}</span>
                        {h.reason && <span className="text-stone-500 ml-2">— {h.reason}</span>}
                      </div>
                      <span className="font-mono text-stone-400 text-[10px]">
                        {new Date(h.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundOpen && inspectingOrder && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-serif font-bold text-stone-900 mb-1">
              Process Order Refund
            </h3>
            <p className="text-xs text-stone-500 mb-4 font-mono">
              Order {inspectingOrder.orderNumber} • Amount: {formatInr(inspectingOrder.totalInr)}
            </p>

            <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Justification Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Garment returned by patron in original condition..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={restoreStockOnRefund}
                  onChange={(e) => setRestoreStockOnRefund(e.target.checked)}
                  className="rounded text-[#264653]"
                />
                <span className="font-medium text-stone-800">
                  Restore physical stock into warehouse inventory
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRefundOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
                >
                  {isLoading ? "Processing..." : "Confirm Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
