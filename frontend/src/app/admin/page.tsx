import React from "react";
import {
  getBusinessSummaryMetrics,
  getSalesTimeline,
  getTopSellingProducts,
  getCategoryPerformance,
} from "@/lib/admin/analytics-service";
import AdminOverviewClient from "@/components/admin/AdminOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [summary, timeline, topProducts, categories] = await Promise.all([
    getBusinessSummaryMetrics(),
    getSalesTimeline(14),
    getTopSellingProducts(5),
    getCategoryPerformance(),
  ]);

  return (
    <AdminOverviewClient
      summary={summary}
      timeline={timeline}
      topProducts={topProducts}
      categories={categories}
    />
  );
}
