import React from "react";
import { getAdminCoupons } from "@/lib/promotions/coupon-service";
import AdminPromotionsClient from "@/components/admin/AdminPromotionsClient";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const coupons = await getAdminCoupons();

  return <AdminPromotionsClient initialCoupons={coupons} />;
}
