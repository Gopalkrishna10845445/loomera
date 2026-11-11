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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Command Center
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Atelier Overview
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Real-time business performance, order velocity, and inventory health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-4 py-2 rounded-lg bg-[#264653] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#1E353F] transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Garment</span>
          </Link>
          <Link
            href="/admin/inventory"
            className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 text-xs font-semibold tracking-wider uppercase hover:bg-stone-50 transition-all shadow-sm"
          >
            Adjust Stock
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Gross Revenue</span>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900">
            {formatInr(summary.grossRevenueInr)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
            <span>Net: {formatInr(summary.netRevenueInr)}</span>
            <span>•</span>
            <span>{summary.paidOrders} paid orders</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#2A9D8F]/5 rounded-bl-full pointer-events-none" />
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Orders Lifetime</span>
            <span className="text-lg">🛍️</span>
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900">
            {summary.totalOrders}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
            <span>AOV: {formatInr(summary.averageOrderValueInr)}</span>
            <span>•</span>
            <span>{summary.cancelledOrders} cancelled</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E76F51]/5 rounded-bl-full pointer-events-none" />
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Inventory Value</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900">
            {formatInr(summary.totalInventoryValuationInr)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
            <span>{summary.totalInventoryUnits} physical units</span>
            <span>•</span>
            <span>In warehouse</span>
          </div>
        </div>

        {/* Inventory Health Alert */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Stock Alerts</span>
            <span className="text-lg">⚠️</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-serif font-bold text-amber-600">
              {summary.lowStockVariantCount}
            </span>
            <span className="text-xs text-stone-500">Low Stock SKUs</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="font-semibold text-rose-600">{summary.outOfStockVariantCount} Out of Stock</span>
            <span>•</span>
            <Link href="/admin/inventory" className="text-[#2A9D8F] hover:underline font-medium">
              Manage →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Columns: Sales Chart / Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Velocity Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">Sales Velocity</h2>
              <p className="text-xs text-stone-500">Daily revenue trend over recent activity</p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs text-[#2A9D8F] hover:underline font-medium"
            >
              Full Analytics →
            </Link>
          </div>

          {timeline.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-stone-400">
              No sales transactions recorded in current period.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {timeline.slice(-7).map((point) => (
                <div key={point.date} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-stone-500 w-24">{point.date}</span>
                  <div className="flex-1 mx-4 bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#2A9D8F] h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(10, (point.grossRevenueInr / Math.max(...timeline.map((t) => t.grossRevenueInr), 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold text-stone-900 w-24 text-right">
                    {formatInr(point.grossRevenueInr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Garments */}
        <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">Bestsellers</h2>
              <p className="text-xs text-stone-500">Top garments by units sold</p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs text-[#2A9D8F] hover:underline font-medium"
            >
              Catalog →
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-stone-400">
              No customer garment sales recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="flex items-center justify-between text-xs border-b border-stone-100 pb-3 last:border-none">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 text-stone-400 font-mono font-bold">#{idx + 1}</span>
                    <div>
                      <p className="font-medium text-stone-900 truncate max-w-[140px]">{p.productTitle}</p>
                      <p className="text-[10px] uppercase text-stone-400">{p.categorySlug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900">{formatInr(p.grossRevenueInr)}</p>
                    <p className="text-[10px] text-stone-500">{p.unitsSold} pcs sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Performance Matrix */}
      <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <h2 className="text-lg font-serif font-bold text-stone-900 mb-1">
          Category Distribution & Revenue
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          Breakdown of published garments, units sold, and aggregate gross revenue.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Active Garments</th>
                <th className="py-3 px-4">Units Dispatched</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {categories.map((cat) => (
                <tr key={cat.categorySlug} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 px-4 font-medium text-stone-900">
                    {cat.categoryName} <span className="text-stone-400 font-mono font-normal">({cat.categorySlug})</span>
                  </td>
                  <td className="py-3 px-4">{cat.activeProductCount} garments</td>
                  <td className="py-3 px-4">{cat.unitsSold} units</td>
                  <td className="py-3 px-4 text-right font-semibold text-stone-900">
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
