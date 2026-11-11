import React from "react";
import { getAdminAuditLogs } from "@/lib/admin/audit";
import AdminAuditLogsClient from "@/components/admin/AdminAuditLogsClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const result = await getAdminAuditLogs({ limit: 100 });

  return (
    <AdminAuditLogsClient
      initialLogs={result.logs}
      totalLogs={result.total}
    />
  );
}
