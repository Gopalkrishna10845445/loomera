import React from "react";
import { getAdminSupportQueue } from "@/lib/support/support-service";
import AdminSupportClient from "@/components/admin/AdminSupportClient";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const queue = await getAdminSupportQueue({ limit: 100 });

  return <AdminSupportClient initialTickets={queue} />;
}
