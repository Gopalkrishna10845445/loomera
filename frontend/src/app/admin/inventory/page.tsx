import React from "react";
import { getInventoryOverview, getInventoryMovements } from "@/lib/admin/inventory-service";
import AdminInventoryClient from "@/components/admin/AdminInventoryClient";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const [overview, movementsResult] = await Promise.all([
    getInventoryOverview({ limit: 100 }),
    getInventoryMovements({ limit: 50 }),
  ]);

  return (
    <AdminInventoryClient
      initialItems={overview.items}
      initialThreshold={overview.threshold}
      initialMovements={movementsResult.movements}
    />
  );
}
