import React from "react";
import {
  getBusinessSummaryMetrics,
  getSalesTimeline,
  getTopSellingProducts,
  getCategoryPerformance,
} from "@/lib/admin/analytics-service";
import AdminAnalyticsClient from "@/components/admin/AdminAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const [summary, timeline, topProducts, categories] = await Promise.all([
    getBusinessSummaryMetrics(),
    getSalesTimeline(30),
    getTopSellingProducts(10),
    getCategoryPerformance(),
  ]);

  return (
    <AdminAnalyticsClient
      initialSummary={summary}
      initialTimeline={timeline}
      initialTopProducts={topProducts}
      initialCategories={categories}
    />
  );
}
