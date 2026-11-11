"use client";

import React, { useState } from "react";
import { formatInr } from "@/lib/currency";
import {
  BusinessSummaryMetrics,
  SalesTimelinePoint,
  TopProductMetric,
  CategoryPerformanceMetric,
} from "@/lib/admin/types";

interface AdminAnalyticsClientProps {
  initialSummary: BusinessSummaryMetrics;
  initialTimeline: SalesTimelinePoint[];
  initialTopProducts: TopProductMetric[];
  initialCategories: CategoryPerformanceMetric[];
}

export default function AdminAnalyticsClient({
  initialSummary,
  initialTimeline,
  initialTopProducts,
  initialCategories,
}: AdminAnalyticsClientProps) {
  const [summary] = useState<BusinessSummaryMetrics>(initialSummary);
  const [timeline, setTimeline] = useState<SalesTimelinePoint[]>(initialTimeline);
  const [topProducts] = useState<TopProductMetric[]>(initialTopProducts);
  const [categories] = useState<CategoryPerformanceMetric[]>(initialCategories);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  const maxRevenue = Math.max(...timeline.map((t) => t.grossRevenueInr), 1);

  const handlePeriodChange = async (d: number) => {
    try {
      setIsLoading(true);
      setDays(d);
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      const data = await res.json();
      if (res.ok && data.timeline) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error("Failed to reload timeline:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Intelligence Engine
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Business Intelligence & Analytics
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Authoritative sales reports, order velocity patterns, and category revenue yields.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => handlePeriodChange(d)}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all ${
                days === d
                  ? "bg-[#264653] text-white"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-stone-400">Gross Sales</span>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {formatInr(summary.grossRevenueInr)}
          </p>
          <p className="text-xs text-stone-500 mt-1">Excludes cancelled & pending checkout</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-stone-400">Net Sales</span>
          <p className="text-2xl font-serif font-bold text-emerald-700 mt-1">
            {formatInr(summary.netRevenueInr)}
          </p>
          <p className="text-xs text-stone-500 mt-1">Adjusted for returns and refunds</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-stone-400">Average Order Value (AOV)</span>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {formatInr(summary.averageOrderValueInr)}
          </p>
          <p className="text-xs text-stone-500 mt-1">Per fulfilled client order</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-stone-400">Active Patrons</span>
          <p className="text-2xl font-serif font-bold text-[#E76F51] mt-1">
            {summary.totalCustomers}
          </p>
          <p className="text-xs text-stone-500 mt-1">From {summary.registeredUsersCount} registered accounts</p>
        </div>
      </div>

      {/* Daily Revenue Bar Chart */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-900">
              Daily Revenue Trajectory ({days} Days)
            </h2>
            <p className="text-xs text-stone-500">Gross INR invoiced per active calendar date</p>
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-stone-400">
            No sales recorded during this lookback window.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="h-64 flex items-end gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
              {timeline.map((point) => {
                const heightPercent = Math.max(8, (point.grossRevenueInr / maxRevenue) * 100);
                return (
                  <div
                    key={point.date}
                    className="flex-1 min-w-[28px] flex flex-col items-center group relative cursor-pointer"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-12 bg-stone-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <p className="font-bold">{formatInr(point.grossRevenueInr)}</p>
                      <p className="text-stone-300">{point.orderCount} orders • {point.date}</p>
                    </div>

                    <div
                      className="w-full bg-[#2A9D8F] rounded-t group-hover:bg-[#264653] transition-colors"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[9px] font-mono text-stone-400 mt-2 truncate w-full text-center">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span>Start: {timeline[0]?.date}</span>
              <span>Peak: {formatInr(maxRevenue)}</span>
              <span>End: {timeline[timeline.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Bestsellers & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bestsellers Table */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h2 className="text-lg font-serif font-bold text-stone-900 mb-1">
            Highest Yielding Garments
          </h2>
          <p className="text-xs text-stone-500 mb-4">Ranked by aggregate gross revenue</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Garment</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Gross Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-stone-400">
                      No customer garment orders placed yet.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-semibold text-stone-900">{p.productTitle}</td>
                      <td className="py-2.5 px-3 uppercase text-[10px] text-stone-500 font-mono">
                        {p.categorySlug}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{p.unitsSold} units</td>
                      <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                        {formatInr(p.grossRevenueInr)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Share Table */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h2 className="text-lg font-serif font-bold text-stone-900 mb-1">
            Category Contribution
          </h2>
          <p className="text-xs text-stone-500 mb-4">Volume and gross sales by luxury classification</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Active SKUs</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {categories.map((c) => (
                  <tr key={c.categorySlug} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{c.categoryName}</td>
                    <td className="py-2.5 px-3">{c.activeProductCount} garments</td>
                    <td className="py-2.5 px-3 font-medium">{c.unitsSold} pcs</td>
                    <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                      {formatInr(c.grossRevenueInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
