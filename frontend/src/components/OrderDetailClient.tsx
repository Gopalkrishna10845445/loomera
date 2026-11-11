"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CreditCard,
  AlertTriangle,
  Truck,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  X,
} from "lucide-react";
import { formatInr } from "@/lib/currency";
import { OrderWithDetails } from "@/lib/orders/order-service";

interface CustomerUser {
  id: string;
  email: string;
  fullName: string;
}

export default function OrderDetailClient({
  user,
  order: initialOrder,
}: {
  user: CustomerUser;
  order: OrderWithDetails;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails>(initialOrder);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Order placed by mistake");
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Return & Exchange State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnType, setReturnType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [returnReason, setReturnReason] = useState("Size / Fit Issue");
  const [returnNotes, setReturnNotes] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Support State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportCategory, setSupportCategory] = useState("ORDER_STATUS");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const cancellable = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status);
  const returnable = order.status === "DELIVERED";

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReturn(true);
    setReturnError(null);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          type: returnType,
          reason: returnReason,
          notes: returnNotes,
          items: order.items.map((i) => ({
            orderItemId: i.id,
            quantity: i.quantity,
            condition: "TAGS_ATTACHED",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit return request");

      setReturnSuccess(true);
      setOrder({ ...order, status: "RETURN_REQUESTED" });
      setTimeout(() => setShowReturnModal(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Return request failed";
      setReturnError(msg);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSupport(true);
    setSupportError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          category: supportCategory,
          subject: supportSubject || `Inquiry for order ${order.orderNumber}`,
          message: supportMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit support inquiry");

      setSupportSuccess(true);
      setTimeout(() => setShowSupportModal(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Support inquiry failed";
      setSupportError(msg);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order");
      }

      setOrder({
        ...order,
        status: "CANCELLED",
        statusHistory: [
          {
            id: `temp-${Date.now()}`,
            previousStatus: order.status,
            newStatus: "CANCELLED",
            reason: cancelReason,
            createdAt: new Date(),
          },
          ...order.statusHistory,
        ],
      });

      setShowCancelModal(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />

        <main className="w-full pt-36 pb-space-3xl">
          <div className="max-w-[1240px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-label-caps text-[10px] uppercase text-[#474741] mb-6">
              <Link href="/" className="hover:text-[#264653] transition-colors">
                Atelier
              </Link>
              <span>/</span>
              <Link href="/orders" className="hover:text-[#264653] transition-colors">
                Order Tracking
              </Link>
              <span>/</span>
              <span className="text-[#264653] font-bold">{order.orderNumber}</span>
            </div>

            {/* Header Box */}
            <div className="bg-surface-container-low border border-stitch rounded-xs p-6 sm:p-8 mb-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="font-label-caps text-xs uppercase text-[#2A9D8F] tracking-widest font-bold">
                  Dispatch Manifest
                </span>
                <h1 className="font-headline-lg text-2xl sm:text-3xl font-serif text-[#264653] mt-1">
                  Order {order.orderNumber}
                </h1>
                <p className="font-body-md text-xs sm:text-sm text-[#474741] mt-1">
                  Placed by {user.fullName} on{" "}
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  &bull; Insured Delivery
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    order.status === "CONFIRMED" || order.status === "PROCESSING"
                      ? "bg-[#2A9D8F]/15 text-[#2A9D8F]"
                      : order.status === "SHIPPED" || order.status === "DELIVERED"
                      ? "bg-[#264653]/15 text-[#264653]"
                      : order.status === "CANCELLED"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {order.status.replace(/_/g, " ")}
                </span>

                {cancellable && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors"
                  >
                    Cancel Order
                  </button>
                )}

                {returnable && (
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(true)}
                    className="px-4 py-2 border border-[#2A9D8F] bg-[#2A9D8F]/10 hover:bg-[#2A9D8F]/20 text-[#2A9D8F] text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return / Exchange</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="px-4 py-2 border border-stitch hover:bg-surface-container text-[#264653] text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Concierge Support</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT COLUMN: SHIPMENT TRACKING, ITEMS & STATUS TIMELINE (8 COLS) */}
              <div className="lg:col-span-8 space-y-8">
                {/* Live Logistics Card (If shipment created) */}
                {order.shipment && (
                  <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stitch pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#264653]/10 flex items-center justify-center text-[#264653]">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] uppercase text-[#2A9D8F] font-bold tracking-widest">
                            Verified Carrier Dispatch
                          </span>
                          <h2 className="font-headline-sm text-base font-serif text-[#264653]">
                            {order.shipment.carrier} &bull; {order.shipment.trackingNumber}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-[#2A9D8F]/15 text-[#2A9D8F] text-[11px] font-bold uppercase rounded-full">
                          {order.shipment.status.replace(/_/g, " ")}
                        </span>
                        {order.shipment.labelUrl && (
                          <a
                            href={order.shipment.labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#264653] hover:text-[#2A9D8F] flex items-center gap-1 font-semibold"
                          >
                            <span>Dispatch Label</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {order.shipment.estimatedDeliveryAt && (
                      <p className="text-xs text-[#474741] mb-4 bg-sand/30 p-2.5 rounded-2xs border border-stitch/60">
                        Estimated Atelier Arrival:{" "}
                        <strong className="text-[#264653]">
                          {new Date(order.shipment.estimatedDeliveryAt).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </strong>
                      </p>
                    )}

                    {/* Checkpoints */}
                    {order.shipment.events && order.shipment.events.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="font-label-caps text-[10px] uppercase tracking-wider text-[#8a8a82]">
                          Live Transit Checkpoints
                        </p>
                        <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-[#2A9D8F]/30">
                          {order.shipment.events.map((evt, idx) => (
                            <div key={evt.id || idx} className="relative text-xs">
                              <div className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-[#2A9D8F]" />
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="font-bold text-[#264653] uppercase">{evt.statusCode}</span>
                                {evt.location && <span className="text-[#8a8a82]">({evt.location})</span>}
                                <span className="text-[11px] text-[#8a8a82]">
                                  {new Date(evt.carrierEventTimestamp).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-[#474741] mt-0.5">{evt.statusDescription}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Garments Card */}
                <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
                  <h2 className="font-headline-sm text-base font-serif text-[#264653] border-b border-stitch pb-3 mb-4">
                    Tailored Garments ({order.items.length})
                  </h2>

                  <div className="divide-y divide-stitch/60">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                        <div className="relative w-16 h-20 bg-surface rounded-2xs overflow-hidden shrink-0 border border-stitch">
                          <Image
                            src={item.imageUrl || "/assets/reference/prod_linen_shirt.jpg"}
                            alt={item.productTitle}
                            fill
                            className="object-cover object-top"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-headline-sm text-sm font-serif text-[#264653] truncate">
                            {item.productTitle}
                          </h3>
                          <p className="font-label-caps text-xs text-[#474741] uppercase tracking-wider mt-0.5">
                            Size: {item.size} &bull; Shade: {item.color}
                          </p>
                          <p className="text-xs text-[#8a8a82] mt-0.5">
                            {item.quantity} &times; {formatInr(item.unitPriceInr)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-[#264653]">
                            {formatInr(item.lineTotalInr)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Timeline History */}
                <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs">
                  <h2 className="font-headline-sm text-base font-serif text-[#264653] border-b border-stitch pb-3 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2A9D8F]" />
                    <span>Order Lifecycle Timeline</span>
                  </h2>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stitch">
                    {order.statusHistory.map((hist, idx) => (
                      <div key={hist.id || idx} className="relative">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#2A9D8F] border-2 border-white ring-2 ring-[#2A9D8F]/20" />
                        <div className="text-xs">
                          <span className="font-bold uppercase tracking-wider text-[#264653]">
                            {hist.newStatus.replace(/_/g, " ")}
                          </span>
                          <span className="text-[#8a8a82] ml-2">
                            {new Date(hist.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {hist.reason && (
                            <p className="text-[#474741] mt-0.5">{hist.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DELIVERY & FINANCIAL BREAKDOWN (4 COLS) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Destination Card */}
                <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs text-xs text-[#474741]">
                  <h3 className="font-label-caps uppercase text-xs text-[#264653] font-bold border-b border-stitch pb-3 mb-3 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#2A9D8F]" />
                    <span>Delivery Destination</span>
                  </h3>
                  <p className="font-bold text-[#264653] text-sm mb-1">{order.shippingAddress.fullName}</p>
                  <p className="text-[#8a8a82] mb-2">{order.shippingAddress.phone}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-[#8a8a82] mt-1">{order.shippingAddress.country}</p>
                </div>

                {/* Financial Summary */}
                <div className="bg-surface-container-low border border-stitch rounded-xs p-6 shadow-xs text-xs text-[#474741]">
                  <h3 className="font-label-caps uppercase text-xs text-[#264653] font-bold border-b border-stitch pb-3 mb-3">
                    Invoice Breakdown
                  </h3>

                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[#264653]">{formatInr(order.subtotalInr)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Shipping ({order.shippingMethod.toUpperCase()})</span>
                      <span className="font-semibold text-[#264653]">
                        {order.shippingFeeInr === 0 ? "FREE" : formatInr(order.shippingFeeInr)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (Included)</span>
                      <span className="text-[#8a8a82]">₹0 (Inclusive)</span>
                    </div>
                    <div className="border-t border-stitch pt-3 flex justify-between items-center text-sm">
                      <span className="font-bold text-[#264653]">Total Paid</span>
                      <span className="font-bold text-[#264653] text-base">{formatInr(order.totalInr)}</span>
                    </div>
                  </div>

                  {order.payment && (
                    <div className="mt-4 pt-4 border-t border-stitch/60 text-[11px] text-[#8a8a82] space-y-1">
                      <div className="flex items-center gap-1.5 text-[#2A9D8F] font-semibold">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Payment Gateway: {order.payment.gateway}</span>
                      </div>
                      <p>Payment Status: {order.payment.status}</p>
                      {order.payment.gatewayPaymentId && (
                        <p className="font-mono text-[10px] truncate">Ref: {order.payment.gatewayPaymentId}</p>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#474741] hover:text-[#264653] uppercase tracking-wider"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Orders List</span>
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-surface max-w-md w-full p-6 rounded-xs border border-stitch shadow-xl">
              <div className="flex items-center gap-3 text-amber-600 mb-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-headline-sm text-lg font-serif text-[#264653]">Confirm Cancellation</h3>
              </div>

              <p className="text-xs text-[#474741] leading-relaxed mb-4">
                Are you sure you wish to cancel order <strong>{order.orderNumber}</strong>? Reserved or committed
                inventory will be restored to the atelier catalog, and a full refund will be processed to your
                original payment method.
              </p>

              {cancelError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xs mb-4">
                  {cancelError}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#264653] mb-1.5">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] focus-luxury"
                >
                  <option value="Order placed by mistake">Order placed by mistake</option>
                  <option value="Need to change sizing or shade">Need to change sizing or shade</option>
                  <option value="Changed delivery destination">Changed delivery destination</option>
                  <option value="Other bespoke request">Other bespoke request</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 border border-stitch text-xs uppercase font-semibold text-[#474741] rounded-2xs hover:bg-surface-container transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs uppercase font-semibold rounded-2xs transition-colors disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return / Exchange Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-surface max-w-lg w-full p-6 sm:p-8 rounded-xs border border-stitch shadow-xl">
              <div className="flex items-center justify-between border-b border-stitch pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-[#2A9D8F]" />
                  <h3 className="font-headline-sm text-lg font-serif text-[#264653]">
                    Bespoke Return &amp; Exchange
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="p-1 hover:bg-surface-container rounded-full text-[#8a8a82]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {returnSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-[#2A9D8F] mx-auto mb-3" />
                  <h4 className="font-headline-sm text-base text-[#264653] mb-1 font-serif">
                    Request Lodged Successfully
                  </h4>
                  <p className="text-xs text-[#474741]">
                    Our concierge team has received your {returnType.toLowerCase()} request. A courier pickup will be
                    scheduled upon inspection authorization.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateReturn} className="space-y-4">
                  <p className="text-xs text-[#474741] leading-relaxed">
                    Under the <strong>15-Day Atelier Guarantee</strong>, garments in unworn condition with original
                    tags may be returned for a full refund or exchanged for alternate tailoring sizes.
                  </p>

                  {returnError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xs">
                      {returnError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReturnType("RETURN")}
                      className={`p-3 text-center border rounded-2xs text-xs font-semibold uppercase tracking-wider transition-all ${
                        returnType === "RETURN"
                          ? "border-[#264653] bg-[#264653] text-white shadow-xs"
                          : "border-stitch bg-surface-container text-[#474741] hover:border-[#264653]"
                      }`}
                    >
                      Return For Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnType("EXCHANGE")}
                      className={`p-3 text-center border rounded-2xs text-xs font-semibold uppercase tracking-wider transition-all ${
                        returnType === "EXCHANGE"
                          ? "border-[#264653] bg-[#264653] text-white shadow-xs"
                          : "border-stitch bg-surface-container text-[#474741] hover:border-[#264653]"
                      }`}
                    >
                      Size Exchange
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#264653] mb-1.5">
                      Primary Reason
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] focus-luxury"
                    >
                      <option value="Size / Fit Issue">Size / Fit Issue</option>
                      <option value="Fabric / Texture Preference">Fabric / Texture Preference</option>
                      <option value="Color Shade Variation">Color Shade Variation</option>
                      <option value="Damaged in Transit">Damaged in Transit</option>
                      <option value="Quality Concern">Quality Concern</option>
                      <option value="Found Alternative">Found Alternative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#264653] mb-1.5">
                      Garment Notes &amp; Fit Feedback (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Please note whether tags remain attached, or describe the requested exchange size..."
                      className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] focus-luxury resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReturnModal(false)}
                      className="px-4 py-2 border border-stitch text-xs uppercase font-semibold text-[#474741] rounded-2xs hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReturn}
                      className="px-5 py-2 bg-[#264653] hover:bg-[#1f3742] text-white text-xs uppercase font-semibold tracking-wider rounded-2xs transition-colors disabled:opacity-50"
                    >
                      {isSubmittingReturn ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Concierge Support Modal */}
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-surface max-w-lg w-full p-6 sm:p-8 rounded-xs border border-stitch shadow-xl">
              <div className="flex items-center justify-between border-b border-stitch pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#2A9D8F]" />
                  <h3 className="font-headline-sm text-lg font-serif text-[#264653]">
                    Concierge Support Inquiry
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="p-1 hover:bg-surface-container rounded-full text-[#8a8a82]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {supportSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-[#2A9D8F] mx-auto mb-3" />
                  <h4 className="font-headline-sm text-base text-[#264653] mb-1 font-serif">
                    Inquiry Dispatched
                  </h4>
                  <p className="text-xs text-[#474741]">
                    Your inquiry has been submitted to the atelier support desk. You can track replies in your
                    account dashboard.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateSupportTicket} className="space-y-4">
                  <p className="text-xs text-[#474741] leading-relaxed">
                    Direct assistance regarding order <strong>{order.orderNumber}</strong>. Our styling and fulfilment
                    concierges respond within 4 business hours.
                  </p>

                  {supportError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xs">
                      {supportError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#264653] mb-1.5">
                      Category
                    </label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] focus-luxury"
                    >
                      <option value="ORDER_STATUS">Order Status &amp; Tracking</option>
                      <option value="DELIVERY_ISSUE">Delivery or Courier Delay</option>
                      <option value="RETURN_REQUEST">Return / Exchange Question</option>
                      <option value="REFUND_INQUIRY">Refund Processing</option>
                      <option value="PRODUCT_QUESTION">Product Care &amp; Alterations</option>
                      <option value="GENERAL">General Concierge Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#264653] mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder={`Inquiry regarding order ${order.orderNumber}`}
                      className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] focus-luxury"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#264653] mb-1.5">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe your question or concern in detail..."
                      className="w-full px-3 py-2 bg-surface-container border border-stitch rounded-2xs text-xs text-[#264653] focus-luxury resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSupportModal(false)}
                      className="px-4 py-2 border border-stitch text-xs uppercase font-semibold text-[#474741] rounded-2xs hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSupport}
                      className="px-5 py-2 bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs uppercase font-semibold tracking-wider rounded-2xs transition-colors disabled:opacity-50"
                    >
                      {isSubmittingSupport ? "Sending..." : "Submit Inquiry"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

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
