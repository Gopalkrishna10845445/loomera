"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { PackageOpen, ArrowRight, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatInr } from "@/lib/currency";
import { OrderWithDetails } from "@/lib/orders/order-service";

interface OrdersUser {
  id: string;
  email: string;
  fullName: string;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "CONFIRMED":
    case "PROCESSING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2A9D8F]/15 text-[#2A9D8F] text-[11px] font-bold uppercase rounded-full tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
    case "DELIVERED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#264653]/15 text-[#264653] text-[11px] font-bold uppercase rounded-full tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
    case "CANCELLED":
    case "RETURNED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-[11px] font-bold uppercase rounded-full tracking-wider">
          <XCircle className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
    case "PENDING_PAYMENT":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold uppercase rounded-full tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>{status.replace(/_/g, " ")}</span>
        </span>
      );
  }
}

function OrdersContent({ user, orders }: { user: OrdersUser; orders: OrderWithDetails[] }) {
  return (
    <main className="w-full pt-36 pb-space-3xl">
      <div className="max-w-[1240px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-label-caps text-[10px] uppercase text-[#474741] mb-space-md">
          <Link href="/" className="hover:text-[#264653] transition-colors">
            Atelier
          </Link>
          <span>/</span>
          <Link href="/account" className="hover:text-[#264653] transition-colors">
            Account
          </Link>
          <span>/</span>
          <span className="text-[#264653] font-bold">Order Tracking</span>
        </div>

        <div className="border-b border-stitch pb-space-lg mb-space-2xl flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-label-caps text-label-caps text-[#2A9D8F] uppercase tracking-widest font-bold">
              Atelier Logistics
            </span>
            <h1 className="font-headline-lg text-headline-lg text-[#264653] mt-1">
              ORDER HISTORY &amp; DISPATCHES
            </h1>
            <p className="font-body-md text-[#474741] mt-1">
              Insured parcel dispatches and tailored packaging history for {user.fullName}.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase text-[#474741]">
            {orders.length} {orders.length === 1 ? "Order Recorded" : "Orders Recorded"}
          </span>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="bg-surface-container-low p-space-2xl sm:p-16 border border-stitch rounded-xs text-center max-w-2xl mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 mx-auto flex items-center justify-center text-[#2A9D8F] mb-6">
              <PackageOpen className="w-8 h-8" />
            </div>

            <h2 className="font-headline-md text-2xl font-serif text-[#264653]">
              No Orders Placed Yet
            </h2>

            <p className="font-body-md text-sm text-[#474741] mt-3 max-w-md mx-auto leading-relaxed">
              Your archive currently holds no historical dispatches. When you complete an order, courier airway bills, tailored parcel checkpoints, and delivery status will appear here in real time.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/collections/men"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#264653] hover:bg-[#2A9D8F] text-white text-xs font-semibold uppercase tracking-widest rounded-2xs transition-all shadow-xs focus-luxury"
              >
                <span>Explore Men&apos;s Collection</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections/boys"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-surface hover:bg-white text-[#264653] border border-stitch text-xs font-semibold uppercase tracking-widest rounded-2xs transition-all shadow-xs focus-luxury"
              >
                <span>Explore Boys&apos; Collection</span>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-stitch/60 flex items-center justify-center gap-2 text-[11px] text-[#8a8a82]">
              <ShieldCheck className="w-4 h-4 text-[#2A9D8F]" />
              <span>Authenticated Patron Account &bull; All Transactions in INR (₹)</span>
            </div>
          </div>
        ) : (
          /* Real Customer Orders List */
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-surface-container-low border border-stitch rounded-xs overflow-hidden shadow-xs hover:border-[#264653]/40 transition-colors"
              >
                {/* Order Top Bar */}
                <div className="p-5 bg-surface border-b border-stitch flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div>
                      <span className="block text-[10px] font-label-caps uppercase text-[#8a8a82] font-semibold">
                        Order Number
                      </span>
                      <span className="font-mono font-bold text-[#264653] text-sm">
                        {order.orderNumber}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-label-caps uppercase text-[#8a8a82] font-semibold">
                        Date Placed
                      </span>
                      <span className="font-medium text-[#474741]">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-label-caps uppercase text-[#8a8a82] font-semibold">
                        Total Amount
                      </span>
                      <span className="font-bold text-[#264653]">
                        {formatInr(order.totalInr)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#264653] hover:bg-[#2A9D8F] text-white text-xs font-semibold uppercase tracking-wider rounded-2xs transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="p-5 divide-y divide-stitch/60">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="relative w-12 h-16 bg-surface rounded-2xs overflow-hidden shrink-0 border border-stitch">
                        <Image
                          src={item.imageUrl || "/assets/reference/prod_linen_shirt.jpg"}
                          alt={item.productTitle}
                          fill
                          className="object-cover object-top"
                          sizes="48px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-headline-sm text-sm font-serif text-[#264653] truncate">
                          {item.productTitle}
                        </h4>
                        <p className="font-label-caps text-[11px] text-[#474741] uppercase tracking-wider mt-0.5">
                          Size: {item.size} &bull; Shade: {item.color} &bull; Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#264653]">
                          {formatInr(item.lineTotalInr)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function OrdersClient({ user, orders = [] }: { user: OrdersUser; orders?: OrderWithDetails[] }) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <OrdersContent user={user} orders={orders} />
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
