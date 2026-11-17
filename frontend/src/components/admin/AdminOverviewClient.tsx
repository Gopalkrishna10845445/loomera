"use client";

import React from "react";
import Link from "next/link";
import { formatInr } from "@/lib/currency";
import {
  BusinessSummaryMetrics,
  SalesTimelinePoint,
  TopProductMetric,
  CategoryPerformanceMetric,
} from "@/lib/admin/types";

interface AdminOverviewClientProps {
  summary: BusinessSummaryMetrics;
  timeline: SalesTimelinePoint[];
  topProducts: TopProductMetric[];
  categories: CategoryPerformanceMetric[];
}

export default function AdminOverviewClient({
  summary,
  timeline,
  topProducts,
  categories,
}: AdminOverviewClientProps) {
  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#051A6E] font-bold">
            Command Center
          </span>
          <h1 className="text-3xl font-sans font-bold text-black tracking-tight uppercase">
            Atelier Overview
          </h1>
          <p className="text-sm text-[#2D2D2D] mt-1">
            Real-time business performance, order velocity, and inventory health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-4 py-2 bg-[#051A6E] text-white text-xs font-bold tracking-wider uppercase hover:bg-[#041456] transition-all flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Garment</span>
          </Link>
          <Link
            href="/admin/inventory"
            className="px-4 py-2 bg-white border border-[#E5E7EB] text-black text-xs font-bold tracking-wider uppercase hover:bg-neutral-50 transition-all"
          >
            Adjust Stock
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white rounded-lg p-5 border border-[#E5E7EB] relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#2D2D2D]">Gross Revenue</span>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-2xl font-sans font-bold text-black">
            {formatInr(summary.grossRevenueInr)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
            <span>Net: {formatInr(summary.netRevenueInr)}</span>
            <span>•</span>
            <span>{summary.paidOrders} paid orders</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-lg p-5 border border-[#E5E7EB] relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#2D2D2D]">Orders Lifetime</span>
            <span className="text-lg">🛍️</span>
          </div>
          <p className="text-2xl font-sans font-bold text-black">
            {summary.totalOrders}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
            <span>AOV: {formatInr(summary.averageOrderValueInr)}</span>
            <span>•</span>
            <span>{summary.cancelledOrders} cancelled</span>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white rounded-lg p-5 border border-[#E5E7EB] relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#2D2D2D]">Inventory Value</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-2xl font-sans font-bold text-black">
            {formatInr(summary.totalInventoryValuationInr)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
            <span>{summary.totalInventoryUnits} physical units</span>
            <span>•</span>
            <span>In warehouse</span>
          </div>
        </div>

        {/* Inventory Health Alert */}
        <div className="bg-white rounded-lg p-5 border border-[#E5E7EB] relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#2D2D2D]">Stock Alerts</span>
            <span className="text-lg">⚠️</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-sans font-bold text-amber-600">
              {summary.lowStockVariantCount}
            </span>
            <span className="text-xs text-neutral-500 font-medium">Low Stock SKUs</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="font-bold text-[#D92D20]">{summary.outOfStockVariantCount} Out of Stock</span>
            <span>•</span>
            <Link href="/admin/inventory" className="text-[#051A6E] hover:underline font-bold">
              Manage →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Columns: Sales Chart / Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Velocity Timeline */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-sans font-bold text-black uppercase tracking-tight">Sales Velocity</h2>
              <p className="text-xs text-neutral-500">Daily revenue trend over recent activity</p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs text-[#051A6E] hover:underline font-bold"
            >
              Full Analytics →
            </Link>
          </div>

          {timeline.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-400">
              No sales transactions recorded in current period.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {timeline.slice(-7).map((point) => (
                <div key={point.date} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-500 w-24">{point.date}</span>
                  <div className="flex-1 mx-4 bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#051A6E] h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(10, (point.grossRevenueInr / Math.max(...timeline.map((t) => t.grossRevenueInr), 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="font-bold text-black w-24 text-right">
                    {formatInr(point.grossRevenueInr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Garments */}
        <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-sans font-bold text-black uppercase tracking-tight">Bestsellers</h2>
              <p className="text-xs text-neutral-500">Top garments by units sold</p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs text-[#051A6E] hover:underline font-bold"
            >
              Catalog →
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-400">
              No customer garment sales recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="flex items-center justify-between text-xs border-b border-neutral-100 pb-3 last:border-none">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 text-neutral-400 font-mono font-bold">#{idx + 1}</span>
                    <div>
                      <p className="font-bold text-black truncate max-w-[140px]">{p.productTitle}</p>
                      <p className="text-[10px] uppercase text-neutral-400 font-semibold">{p.categorySlug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">{formatInr(p.grossRevenueInr)}</p>
                    <p className="text-[10px] text-neutral-500">{p.unitsSold} pcs sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Performance Matrix */}
      <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
        <h2 className="text-lg font-sans font-bold text-black uppercase tracking-tight mb-1">
          Category Distribution &amp; Revenue
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Breakdown of published garments, units sold, and aggregate gross revenue.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-neutral-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Active Garments</th>
                <th className="py-3 px-4">Units Dispatched</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {categories.map((cat) => (
                <tr key={cat.categorySlug} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-black">
                    {cat.categoryName} <span className="text-neutral-400 font-mono font-normal">({cat.categorySlug})</span>
                  </td>
                  <td className="py-3 px-4">{cat.activeProductCount} garments</td>
                  <td className="py-3 px-4">{cat.unitsSold} units</td>
                  <td className="py-3 px-4 text-right font-bold text-black">
                    {formatInr(cat.grossRevenueInr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
