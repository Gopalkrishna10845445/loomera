"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import ToastNotification from "@/components/ToastNotification";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { PackageOpen, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-[#027A48] border border-green-200 text-xs font-bold uppercase rounded-none tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
    case "DELIVERED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#051A6E] border border-blue-200 text-xs font-bold uppercase rounded-none tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
    case "CANCELLED":
    case "RETURNED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-[#D92D20] border border-red-200 text-xs font-bold uppercase rounded-none tracking-wider">
          <XCircle className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
    case "PENDING_PAYMENT":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase rounded-none tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>{status.replace(/_/g, " ")}</span>
        </span>
      );
  }
}

function OrdersContent({ user, orders }: { user: OrdersUser; orders: OrderWithDetails[] }) {
  return (
    <main className="w-full py-8 sm:py-12 bg-white">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-6 font-futura"
        >
          <Link href="/" className="hover:text-black transition-colors">
            HOME
          </Link>
          <span>/</span>
          <Link href="/account" className="hover:text-black transition-colors">
            ACCOUNT
          </Link>
          <span>/</span>
          <span className="text-black font-bold">MY ORDERS</span>
        </nav>

        <div className="border-b border-[#E5E7EB] pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
              PARCEL TRACKING &amp; DISPATCHES
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mt-1">
              ORDER HISTORY
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Order archive and shipment status for {user.fullName || user.email}.
            </p>
          </div>
          <span className="text-xs font-bold uppercase text-gray-500">
            {orders.length} {orders.length === 1 ? "ORDER" : "ORDERS"}
          </span>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="bg-white p-12 sm:p-16 border border-[#E5E7EB] text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center text-gray-400 mb-6">
              <PackageOpen className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-black">
              NO ORDERS PLACED YET
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
              When you complete an order, airway tracking bills, courier milestones, and delivery checkpoints will be updated here in real time.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/collections/men"
                className="btn-primary w-full sm:w-auto px-6 h-11 inline-flex items-center justify-center gap-2"
              >
                <span>SHOP MEN&apos;S COLLECTION</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections/boys"
                className="btn-secondary w-full sm:w-auto px-6 h-11 inline-flex items-center justify-center gap-2"
              >
                <span>SHOP BOYS&apos; COLLECTION</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Real Customer Orders List */
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-[#E5E7EB] hover:border-black transition-colors rounded-none overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 bg-gray-50 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4 text-xs font-futura">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold">
                        ORDER NUMBER
                      </span>
                      <span className="font-mono font-bold text-black text-sm">
                        {order.orderNumber}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold">
                        DATE PLACED
                      </span>
                      <span className="font-bold text-black">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold">
                        TOTAL AMOUNT
                      </span>
                      <span className="font-bold text-black">
                        {formatInr(order.totalInr)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <Link
                      href={`/orders/${order.id}`}
                      className="btn-primary h-9 px-4 text-xs uppercase font-bold tracking-wider inline-flex items-center gap-1.5"
                    >
                      <span>VIEW DETAILS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="p-5 divide-y divide-[#E5E7EB]">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="relative w-14 h-18 bg-gray-100 overflow-hidden shrink-0 border border-[#E5E7EB]">
                        <Image
                          src={item.imageUrl || "/assets/reference/prod_linen_shirt.jpg"}
                          alt={item.productTitle}
                          fill
                          className="object-cover object-top"
                          sizes="56px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold uppercase text-black truncate">
                          {item.productTitle}
                        </h4>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">
                          Size: {item.size} &bull; Colour: {item.color} &bull; Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-black">
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
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <OrdersContent user={user} orders={orders} />
      <Footer />
      <CartDrawer />
      <SearchModal />
      <SizeGuideModal />
      <ToastNotification />
      <AiAssistantWidget />
    </div>
  );
}
