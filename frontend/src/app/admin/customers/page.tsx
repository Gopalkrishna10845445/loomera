import React from "react";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSession } from "@/lib/auth/session";
import { getAdminCustomers } from "@/lib/admin/customer-service";
import AdminCustomersClient from "@/components/admin/AdminCustomersClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const token = await getSessionTokenFromCookies();
  const sessionData = await validateSession(token);
  const result = await getAdminCustomers({ limit: 100 });

  return (
    <AdminCustomersClient
      initialCustomers={result.customers}
      currentUserRole={sessionData?.user.role || "ADMIN"}
    />
  );
}
