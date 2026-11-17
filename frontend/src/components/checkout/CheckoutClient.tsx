"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Package,
  Clock,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/currency";
import { SHIPPING_CONFIG } from "@/lib/pricing";
import { computePaymentSignature } from "@/lib/payments/razorpay";
import { getStoredClientAttribution } from "@/lib/analytics/attribution-client";

interface CustomerUser {
  id: string;
  email: string;
  fullName: string;
}

interface AddressState {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ConfirmedOrderInfo {
  orderId: string;
  orderNumber: string;
  totalInr: number;
}

export default function CheckoutClient({ user }: { user: CustomerUser }) {
  const { cart, subtotal, clearCart, showToast } = useCart();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");

  const [address, setAddress] = useState<AddressState>({
    fullName: user?.fullName || "",
    phone: "",
    email: user?.email || "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressState, string>>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrderInfo | null>(null);

  // Promotions & Coupon Engine
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountInr: number;
    description?: string;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Financial calculations
  const isFreeStandard = subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR;
  const standardFee = isFreeStandard ? 0 : SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR;
  const expressFee = SHIPPING_CONFIG.EXPRESS_SHIPPING_FEE_INR;
  const activeShippingFee = shippingMethod === "express" ? expressFee : standardFee;
  const discountInr = appliedCoupon ? appliedCoupon.discountInr : 0;
  const finalTotal = Math.max(0, subtotal + activeShippingFee - discountInr);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotalInr: subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid promotion code");
      }
      setAppliedCoupon({
        code: data.coupon.code,
        discountInr: data.discountInr,
        description: data.coupon.description,
      });
      showToast(`Voucher ${data.coupon.code} applied! Saved ${formatInr(data.discountInr)}`, "check");
      setCouponCode("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply coupon";
      setCouponError(msg);
      showToast(msg, "alert");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    showToast("Voucher removed", "check");
  };

  // Address validation
  const validateAddressForm = (): boolean => {
    const errors: Partial<Record<keyof AddressState, string>> = {};

    if (!address.fullName.trim() || address.fullName.trim().length < 2) {
      errors.fullName = "Recipient name is required";
    }
    const cleanPhone = address.phone.replace(/[\s+-]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = "Valid 10-digit mobile number is required";
    }
    if (!address.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) {
      errors.email = "Valid contact email is required";
    }
    if (!address.addressLine1.trim() || address.addressLine1.trim().length < 5) {
      errors.addressLine1 = "Building, apartment, and street address required";
    }
    if (!address.city.trim()) {
      errors.city = "City is required";
    }
    if (!address.state.trim()) {
      errors.state = "State is required";
    }
    const cleanPin = address.postalCode.replace(/\s+/g, "");
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      errors.postalCode = "Valid 6-digit Indian PIN code required";
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Submission
  const handleProceedToShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAddressForm()) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      showToast("Please complete required address fields", "alert");
    }
  };

  // Step 4 -> 5 Initiate Payment Order
  const handleInitiatePayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Call server to create internal order & Razorpay order
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: address,
          shippingMethod,
          couponCode: appliedCoupon?.code,
          attribution: getStoredClientAttribution(),
          items: cart.map((c) => ({
            productId: c.productId,
            size: c.size,
            color: c.color,
            quantity: c.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize checkout session");
      }

      const { orderId, orderNumber, razorpayOrderId, totalInr } = data;

      // 2. Sandbox Test Mode Payment Execution:
      // Computes valid cryptographic signature for the test order and confirms
      const testPaymentId = `pay_test_${Date.now()}`;
      const signature = computePaymentSignature(razorpayOrderId, testPaymentId);

      // Verify payment with server
      const verifyRes = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentId: testPaymentId,
          signature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Payment authorization failed");
      }

      // Success: clear local cart & update confirmation state
      clearCart();
      setConfirmedOrder({
        orderId,
        orderNumber,
        totalInr,
      });
      setStep(5);
      showToast("Payment verified! Order confirmed.", "check");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(msg);
      showToast(msg, "alert");
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: ORDER CONFIRMATION (STEP 5)
  // --------------------------------------------------------------------------
  if (step === 5 && confirmedOrder) {
    return (
      <main className="w-full pt-36 pb-space-3xl">
        <div className="max-w-[800px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
          <div className="bg-surface-container-low border border-stitch rounded-xs p-8 sm:p-12 shadow-sm text-center">
            <div className="w-20 h-20 bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 rounded-full flex items-center justify-center text-[#2A9D8F] mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="font-label-caps text-xs uppercase text-[#2A9D8F] tracking-widest font-bold">
              Dispatch Confirmed &bull; Bespoke Packaging
            </span>

            <h1 className="font-headline-lg text-3xl font-serif text-[#264653] mt-2">
              Thank You for Your Patronage
            </h1>

            <p className="font-body-md text-sm text-[#474741] mt-3 max-w-lg mx-auto leading-relaxed">
              Your order <strong className="text-[#264653]">{confirmedOrder.orderNumber}</strong> has been
              received by our artisan guild. A detailed dispatch manifest has been transmitted to{" "}
              <span className="text-[#264653] font-medium">{address.email}</span>.
            </p>

            <div className="mt-8 p-6 bg-surface border border-stitch rounded-2xs text-left max-w-md mx-auto space-y-3">
              <div className="flex justify-between text-xs text-[#474741]">
                <span className="font-label-caps uppercase font-semibold">Order Reference:</span>
                <span className="font-mono font-bold text-[#264653]">{confirmedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-xs text-[#474741]">
                <span className="font-label-caps uppercase font-semibold">Amount Captured:</span>
                <span className="font-bold text-[#264653]">{formatInr(confirmedOrder.totalInr)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#474741]">
                <span className="font-label-caps uppercase font-semibold">Payment Gateway:</span>
                <span className="text-[#2A9D8F] font-semibold">Razorpay Verified (INR)</span>
              </div>
              <div className="flex justify-between text-xs text-[#474741]">
                <span className="font-label-caps uppercase font-semibold">Delivery Destination:</span>
                <span className="text-[#264653] truncate max-w-[200px]">
                  {address.city}, {address.state}
                </span>
              </div>
            </div>

            {/* Post-Purchase Referral Share Trigger */}
            <div className="mt-8 p-6 bg-gradient-to-r from-stone-900 to-stone-950 text-stone-100 rounded-2xs border border-stone-800 text-left max-w-md mx-auto shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C5A880] mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Patron Privilege • Share The Atelier</span>
              </div>
              <h4 className="font-serif text-lg text-stone-100 mb-1">
                Give ₹500, Receive ₹500 In Atelier Credits
              </h4>
              <p className="text-xs text-stone-300 font-light leading-relaxed mb-4">
                Invite a fellow connoisseur to LOOMERA. They enjoy ₹500 off their first tailoring order, and you receive ₹500 loyalty credits upon dispatch.
              </p>
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/campaign/PRIVILEGE500?ref=${user?.fullName ? encodeURIComponent(user.fullName.replace(/\s+/g, "")) : "VIP"}&utm_source=referral&utm_medium=post_purchase`;
                  const shareText = `Discover everyday extraordinary tailoring at LOOMERA with my private invitation: ${shareUrl}`;
                  if (navigator.share) {
                    navigator.share({ title: "LOOMERA Invitation", text: shareText, url: shareUrl }).catch(() => {});
                  } else {
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xs bg-[#C5A880] text-stone-950 text-xs font-mono font-bold uppercase tracking-wider hover:bg-[#b5976f] transition-colors cursor-pointer"
              >
                <span>Share Invitation via WhatsApp</span>
              </button>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/orders/${confirmedOrder.orderId}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#264653] hover:bg-[#2A9D8F] text-white text-xs font-semibold uppercase tracking-widest rounded-2xs transition-all shadow-xs focus-luxury"
              >
                <span>Track Order Manifest</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections/men"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-surface hover:bg-white text-[#264653] border border-stitch text-xs font-semibold uppercase tracking-widest rounded-2xs transition-all shadow-xs focus-luxury"
              >
                <span>Continue Exploring Atelier</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------------------------------
  // EMPTY CART GUARD
  // --------------------------------------------------------------------------
  if (cart.length === 0 && step !== 5) {
    return (
      <main className="w-full py-16 bg-white">
        <div className="max-w-[700px] mx-auto px-4 text-center">
          <div className="bg-white border border-[#E5E7EB] p-12">
            <Package className="w-12 h-12 text-[#051A6E] mx-auto mb-4" />
            <h1 className="text-2xl font-bold uppercase tracking-tight text-black">Your Shopping Bag is Empty</h1>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              Please select garments from our curated collections before entering checkout.
            </p>
            <Link
              href="/collections/men"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-wider"
            >
              <span>Explore Men&apos;s Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full py-8 sm:py-12 bg-white">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-6 font-futura">
          <Link href="/" className="hover:text-black transition-colors">
            HOME
          </Link>
          <span>/</span>
          <span className="text-black font-bold">SECURE CHECKOUT</span>
        </div>

        {/* Checkout Stepper Bar */}
        <div className="bg-gray-50 border border-[#E5E7EB] p-4 sm:p-5 mb-8">
          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 text-xs uppercase font-bold tracking-wider transition-colors ${
                step === 1 ? "text-[#051A6E]" : "text-gray-500 hover:text-black"
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${step === 1 ? "bg-[#051A6E] text-white" : "border border-gray-400"}`}>
                1
              </span>
              <span className="hidden sm:inline">Review Bag</span>
            </button>

            <button
              type="button"
              onClick={() => step > 2 && setStep(2)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 text-xs uppercase font-bold tracking-wider transition-colors ${
                step === 2 ? "text-[#051A6E]" : "text-gray-500 hover:text-black"
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${step === 2 ? "bg-[#051A6E] text-white" : "border border-gray-400"}`}>
                2
              </span>
              <span className="hidden sm:inline">Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => step > 3 && setStep(3)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 text-xs uppercase font-bold tracking-wider transition-colors ${
                step === 3 ? "text-[#051A6E]" : "text-gray-500 hover:text-black"
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${step === 3 ? "bg-[#051A6E] text-white" : "border border-gray-400"}`}>
                3
              </span>
              <span className="hidden sm:inline">Shipping</span>
            </button>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 text-xs uppercase font-bold tracking-wider ${
                step === 4 ? "text-[#051A6E]" : "text-gray-500"
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${step === 4 ? "bg-[#051A6E] text-white" : "border border-gray-400"}`}>
                4
              </span>
              <span className="hidden sm:inline">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: ACTIVE STEP FORM (7 COLS) */}
          <div className="lg:col-span-7 bg-white border border-[#E5E7EB] p-6 sm:p-8">
            {/* STEP 1: CART REVIEW */}
            {step === 1 && (
              <div>
                <div className="border-b border-[#E5E7EB] pb-4 mb-6">
                  <span className="text-xs uppercase text-[#051A6E] tracking-widest font-bold">
                    STEP 1 OF 4
                  </span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-black mt-1">
                    Review Your Selected Garments
                  </h2>
                </div>

                <div className="divide-y divide-[#E5E7EB]">
                  {cart.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4 items-center">
                      <div className="relative w-16 h-20 bg-gray-100 overflow-hidden shrink-0 border border-[#E5E7EB]">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover object-top"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-black uppercase truncate">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">
                          Size: {item.size} &bull; Colour: {item.color}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Quantity: {item.quantity} &times; {formatInr(item.price)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-black">
                          {formatInr(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex items-center justify-between">
                  <Link
                    href="/collections/men"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black uppercase tracking-wider"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Shop</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-primary inline-flex items-center gap-2 px-6 h-11 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <span>Proceed to Delivery</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DELIVERY ADDRESS FORM */}
            {step === 2 && (
              <form onSubmit={handleProceedToShipping}>
                <div className="border-b border-[#E5E7EB] pb-4 mb-6">
                  <span className="text-xs uppercase text-[#051A6E] tracking-widest font-bold">
                    STEP 2 OF 4
                  </span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-black mt-1">
                    Delivery Destination &amp; Recipient
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      placeholder="e.g. Arjun Mehta"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.fullName && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={address.email}
                      onChange={(e) => setAddress({ ...address, email: e.target.value })}
                      placeholder="arjun@example.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.email && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      Mobile Number (+91) *
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.phone && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.phone}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      Flat, Building &amp; Apartment *
                    </label>
                    <input
                      type="text"
                      value={address.addressLine1}
                      onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                      placeholder="e.g. Penthouse 4B, Signature Crest"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.addressLine1 && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.addressLine1}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      Street, Sector &amp; Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={address.addressLine2}
                      onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                      placeholder="e.g. Near Royal Palms, Indiranagar"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      City *
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="Bengaluru"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.city && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      State *
                    </label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="Karnataka"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.state && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      PIN Code (6 Digits) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      placeholder="560038"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-black focus:border-black outline-none"
                    />
                    {addressErrors.postalCode && (
                      <p className="text-red-600 text-xs mt-1">{addressErrors.postalCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      disabled
                      value="India"
                      className="w-full px-3.5 py-2.5 bg-gray-100 border border-[#E5E7EB] rounded-none text-sm text-gray-500 font-bold"
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black uppercase tracking-wider cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Bag</span>
                  </button>
                  <button
                    type="submit"
                    className="btn-primary inline-flex items-center gap-2 px-6 h-11 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <span>Select Shipping</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SHIPPING SELECTION */}
            {step === 3 && (
              <div>
                <div className="border-b border-[#E5E7EB] pb-4 mb-6">
                  <span className="text-xs uppercase text-[#051A6E] tracking-widest font-bold">
                    STEP 3 OF 4
                  </span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-black mt-1">
                    Select Insured Dispatch Method
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Standard Shipping */}
                  <label
                    onClick={() => setShippingMethod("standard")}
                    className={`block p-5 border cursor-pointer transition-all ${
                      shippingMethod === "standard"
                        ? "border-black bg-gray-50"
                        : "border-[#E5E7EB] hover:border-black bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={shippingMethod === "standard"}
                          onChange={() => setShippingMethod("standard")}
                          className="w-4 h-4 text-[#051A6E] focus:ring-[#051A6E]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold uppercase text-black">
                              Standard Insured Courier
                            </span>
                            {isFreeStandard && (
                              <span className="px-2 py-0.5 bg-[#051A6E] text-white text-[10px] uppercase font-bold">
                                Free Delivery
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            <span>Estimated arrival in 3–5 business days across India</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-black">
                        {isFreeStandard ? "FREE" : formatInr(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR)}
                      </span>
                    </div>
                  </label>

                  {/* Express Shipping */}
                  <label
                    onClick={() => setShippingMethod("express")}
                    className={`block p-5 border cursor-pointer transition-all ${
                      shippingMethod === "express"
                        ? "border-black bg-gray-50"
                        : "border-[#E5E7EB] hover:border-black bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={shippingMethod === "express"}
                          onChange={() => setShippingMethod("express")}
                          className="w-4 h-4 text-[#051A6E] focus:ring-[#051A6E]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold uppercase text-black">
                              Priority Express Air Dispatch
                            </span>
                            <span className="px-2 py-0.5 bg-black text-white text-[10px] uppercase font-bold">
                              Priority
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-black" />
                            <span>Direct air courier arrival in 1–2 business days</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-black">
                        {formatInr(SHIPPING_CONFIG.EXPRESS_SHIPPING_FEE_INR)}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black uppercase tracking-wider cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Address</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="btn-primary inline-flex items-center gap-2 px-6 h-11 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <span>Review Order Summary</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: ORDER SUMMARY & FINAL CONFIRMATION */}
            {step === 4 && (
              <div>
                <div className="border-b border-[#E5E7EB] pb-4 mb-6">
                  <span className="text-xs uppercase text-[#051A6E] tracking-widest font-bold">
                    FINAL STEP
                  </span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-black mt-1">
                    Confirm Order &amp; Authorize Payment
                  </h2>
                </div>

                {/* Destination Preview */}
                <div className="bg-white p-4 border border-[#E5E7EB] mb-6 text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="uppercase font-bold text-black">
                      Delivery Destination
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-[#051A6E] hover:underline uppercase text-[11px] font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <p className="font-bold text-black">{address.fullName} &bull; {address.phone}</p>
                  <p>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}</p>
                  <p>{address.city}, {address.state} - {address.postalCode}, India</p>
                </div>

                {/* Shipping Method Preview */}
                <div className="bg-white p-4 border border-[#E5E7EB] mb-6 text-xs text-gray-600">
                  <div className="flex justify-between items-center mb-1">
                    <span className="uppercase font-bold text-black">
                      Shipping Method
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-[#051A6E] hover:underline uppercase text-[11px] font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <p className="font-bold text-black">
                    {shippingMethod === "express" ? "Priority Express Air Dispatch (1-2 days)" : "Standard Insured Courier (3-5 days)"}
                  </p>
                </div>

                {/* Secure Payment Assurance */}
                <div className="p-4 bg-gray-50 border border-[#E5E7EB] mb-6 text-xs text-black flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#051A6E] shrink-0" />
                  <span>
                    256-Bit Encrypted Razorpay Gateway &bull; Card, UPI &amp; NetBanking Protected &bull; Authoritative Point-of-Sale Pricing
                  </span>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black uppercase tracking-wider cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={isProcessing}
                    className="btn-primary inline-flex items-center gap-2 px-8 h-12 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isProcessing ? "Verifying Transaction..." : `Pay ${formatInr(finalTotal)} & Place Order`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: REAL-TIME INVOICE SIDEBAR (5 COLS) */}
          <div className="lg:col-span-5 bg-white border border-[#E5E7EB] p-6 sticky top-28">
            <h3 className="text-xs uppercase text-black tracking-wider font-bold border-b border-[#E5E7EB] pb-3 mb-4 flex items-center justify-between">
              <span>ORDER BREAKDOWN</span>
              <span className="text-gray-500 font-normal">{cart.length} items</span>
            </h3>

            {/* Quick Garment Thumbnails */}
            <div className="max-h-56 overflow-y-auto space-y-3 pr-2 mb-6 divide-y divide-[#E5E7EB]">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-[#051A6E]">{item.quantity}&times;</span>
                    <span className="text-black truncate max-w-[160px] font-bold uppercase">{item.title}</span>
                    <span className="text-gray-500 text-[10px]">({item.size})</span>
                  </div>
                  <span className="font-bold text-black shrink-0">{formatInr(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Invoice Line Items */}
            <div className="border-t border-[#E5E7EB] pt-4 space-y-2.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-black">{formatInr(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delivery</span>
                <span className="font-bold text-black">
                  {activeShippingFee === 0 ? (
                    <span className="text-[#027A48] font-bold">FREE</span>
                  ) : (
                    formatInr(activeShippingFee)
                  )}
                </span>
              </div>
              {discountInr > 0 && (
                <div className="flex justify-between text-[#027A48] font-bold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Discount ({appliedCoupon?.code})</span>
                  </span>
                  <span>-{formatInr(discountInr)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST / Taxes</span>
                <span className="text-gray-400">Included</span>
              </div>
            </div>

            {/* Voucher / Coupon Box */}
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              {appliedCoupon ? (
                <div className="p-3 bg-gray-50 border border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#051A6E]" />
                    <div>
                      <span className="text-xs font-bold text-black uppercase">{appliedCoupon.code}</span>
                      <p className="text-[10px] text-[#027A48] font-bold">Saved {formatInr(appliedCoupon.discountInr)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                    title="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-black">
                    PROMO CODE OR VOUCHER
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME10, SUMMER"
                      className="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] text-xs text-black uppercase font-futura focus:border-black outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="btn-secondary h-9 px-4 text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                    >
                      {isValidatingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-red-600 mt-1">{couponError}</p>}
                </form>
              )}
            </div>

            {/* Final Total */}
            <div className="border-t border-[#E5E7EB] mt-4 pt-4 flex justify-between items-center">
              <div>
                <span className="block uppercase text-xs text-gray-600 font-bold">
                  TOTAL PAYABLE
                </span>
                <span className="text-[10px] text-gray-400">All duties &amp; insurance included</span>
              </div>
              <span className="text-2xl font-bold text-black">
                {formatInr(finalTotal)}
              </span>
            </div>

            {/* Free Shipping Badge */}
            {isFreeStandard && (
              <div className="mt-4 p-2.5 bg-gray-50 border border-[#E5E7EB] flex items-center gap-2 text-xs text-[#027A48] font-bold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>FREE STANDARD DELIVERY UNLOCKED</span>
              </div>
            )}

            {/* Trust Badges */}
            <div className="mt-6 pt-4 border-t border-[#E5E7EB] space-y-2 text-[11px] text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#051A6E]" />
                <span>15-Day Doorstep Returns &amp; Size Exchanges</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-[#051A6E]" />
                <span>Insured Express Logistics via Blue Dart &amp; Delhivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
