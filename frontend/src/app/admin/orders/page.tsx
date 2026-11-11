import React from "react";
import { getAdminOrders } from "@/lib/admin/order-admin-service";
import AdminOrdersClient from "@/components/admin/AdminOrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const result = await getAdminOrders({ limit: 100 });

  return <AdminOrdersClient initialOrders={result.orders} />;
}
