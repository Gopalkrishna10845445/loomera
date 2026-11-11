import React from "react";
import { getAdminReturns } from "@/lib/returns/return-service";
import AdminReturnsClient from "@/components/admin/AdminReturnsClient";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const returns = await getAdminReturns({ limit: 100 });

  return <AdminReturnsClient initialReturns={returns} />;
}
