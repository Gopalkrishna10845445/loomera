"use client";

import React, { useState, useEffect } from "react";
import { formatInr } from "@/lib/currency";
import type { BusinessOverviewData } from "@/lib/intelligence/financial-metrics";
import type { DemandForecastResult } from "@/lib/intelligence/demand-forecasting";
import type {
  InventoryIntelligenceSummary,
  VariantStockIntelligence,
} from "@/lib/intelligence/inventory-intelligence";
import type {
  ChurnRadarSummary,
  CustomerChurnRiskProfile,
} from "@/lib/intelligence/churn-intelligence";
import type {
  StoreProfitabilitySummary,
  ProductProfitabilityRecord,
} from "@/lib/intelligence/profitability-intelligence";
import type { BusinessAnomalyAlert } from "@/lib/intelligence/anomaly-detection";
import type {
  MarketingIntelligenceReport,
  ChannelPerformanceMetric,
} from "@/lib/intelligence/marketing-intelligence";
import type { GeneratedReport } from "@/lib/intelligence/automated-reporting";
import type { UnifiedRecommendation } from "@/lib/intelligence/business-recommendations";

interface HistoricalReportItem {
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  summary: Record<string, unknown>;
  createdAt: string;
}

interface OverviewApiResponse {
  success: boolean;
  businessOverview: BusinessOverviewData;
  predictiveOverview: {
    forecastSummary: {
      storewide30dUnits: number;
      storewide30dRevenueInr: number;
      confidenceLevel: string;
    };
    inventoryRisks: {
      criticalStockouts: number;
      reorderSoonCount: number;
      slowMovingCount: number;
    };
    churnRisks: {
      imminentChurnCount: number;
      highRiskCount: number;
      atRiskRevenueExposureInr: number;
    };
    anomaliesSummary: {
      detectedCount: number;
      criticalCount: number;
    };
  };
  actionRecommendations: UnifiedRecommendation[];
  timestamp: string;
}

interface ForecastOverviewResponse {
  storewide: DemandForecastResult;
  topProducts: DemandForecastResult[];
  categoryForecasts: DemandForecastResult[];
}

interface ReportsApiResponse {
  success: boolean;
  latestReport: GeneratedReport;
  history: HistoricalReportItem[];
}

interface AnomaliesApiResponse {
  success: boolean;
  anomalies: BusinessAnomalyAlert[];
}

interface ChartDataPayload {
  type: "bar" | "line" | "pie";
  labels: string[];
  values: number[];
}

interface AnalystHistoryItem {
  query: string;
  answer: string;
  toolUsed: string;
  chartData?: ChartDataPayload;
  timestamp: string;
}

type CommandCenterTab =
  | "overview"
  | "analyst"
  | "forecast"
  | "inventory"
  | "churn"
  | "profitability"
  | "anomalies"
  | "marketing"
  | "reports"
  | "recommendations";

export default function AdminIntelligenceCommandCenter() {
  const [activeTab, setActiveTab] = useState<CommandCenterTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subsystem Data States
  const [overviewData, setOverviewData] = useState<OverviewApiResponse | null>(null);
  const [forecastOverview, setForecastOverview] = useState<ForecastOverviewResponse | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryIntelligenceSummary | null>(null);
  const [churnData, setChurnData] = useState<ChurnRadarSummary | null>(null);
  const [profitabilityData, setProfitabilityData] = useState<StoreProfitabilitySummary | null>(null);
  const [anomalyData, setAnomalyData] = useState<AnomaliesApiResponse | null>(null);
  const [marketingData, setMarketingData] = useState<MarketingIntelligenceReport | null>(null);
  const [reportsData, setReportsData] = useState<ReportsApiResponse | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<UnifiedRecommendation[]>([]);

  // AI Analyst State
  const [analystQuery, setAnalystQuery] = useState("");
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystHistory, setAnalystHistory] = useState<AnalystHistoryItem[]>([
    {
      query: "How is LOOMERA performing this month?",
      answer:
        "LOOMERA generated healthy gross merchandise value with strong average order values across premium menswear and boys' tailoring. Net revenue remains well protected after returns and refunds.",
      toolUsed: "get_revenue_summary",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Forecast Horizon Toggle
  const [forecastHorizon, setForecastHorizon] = useState<7 | 14 | 30 | 90>(30);

  // Load all initial BI datasets
  useEffect(() => {
    async function loadAllIntelligence() {
      try {
        setLoading(true);
        setError(null);

        const [ovRes, fcRes, invRes, chRes, prRes, anRes, mkRes, rpRes, rcRes] =
          await Promise.all([
            fetch("/api/admin/intelligence/overview"),
            fetch("/api/admin/intelligence/forecasts?overview=true"),
            fetch("/api/admin/intelligence/inventory"),
            fetch("/api/admin/intelligence/churn"),
            fetch("/api/admin/intelligence/profitability"),
            fetch("/api/admin/intelligence/anomalies"),
            fetch("/api/admin/intelligence/marketing"),
            fetch("/api/admin/intelligence/reports"),
            fetch("/api/admin/intelligence/recommendations"),
          ]);

        if (!ovRes.ok) throw new Error("Failed to load command center overview.");

        const ovJson: OverviewApiResponse = await ovRes.json();
        const fcJson: { success: boolean; overview: ForecastOverviewResponse } = await fcRes.json();
        const invJson: { success: boolean; data: InventoryIntelligenceSummary } = await invRes.json();
        const chJson: { success: boolean; data: ChurnRadarSummary } = await chRes.json();
        const prJson: { success: boolean; data: StoreProfitabilitySummary } = await prRes.json();
        const anJson: AnomaliesApiResponse = await anRes.json();
        const mkJson: { success: boolean; data: MarketingIntelligenceReport } = await mkRes.json();
        const rpJson: ReportsApiResponse = await rpRes.json();
        const rcJson = await rcRes.json();

        setOverviewData(ovJson);
        setForecastOverview(fcJson.overview);
        setInventoryData(invJson.data);
        setChurnData(chJson.data);
        setProfitabilityData(prJson.data);
        setAnomalyData(anJson);
        setMarketingData(mkJson.data);
        setReportsData(rpJson);
        setRecommendationsData(rcJson.recommendations || rcJson.summary?.recommendations || []);
      } catch (err: unknown) {
        console.error("Failed to load intelligence dashboard:", err);
        setError(err instanceof Error ? err.message : "An error occurred while loading business intelligence.");
      } finally {
        setLoading(false);
      }
    }

    loadAllIntelligence();
  }, []);

  // Handle AI Analyst query submission
  const handleAnalystSubmit = async (queryText?: string) => {
    const q = (queryText || analystQuery).trim();
    if (!q || analystLoading) return;

    try {
      setAnalystLoading(true);
      setAnalystQuery("");

      const res = await fetch("/api/admin/intelligence/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) throw new Error("Query processing failed.");
      const data = await res.json();

      setAnalystHistory((prev) => [
        ...prev,
        {
          query: q,
          answer: data.response.answer,
          toolUsed: data.response.toolUsed,
          chartData: data.response.chartData,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Query execution failed.";
      alert("Failed to query AI Analyst: " + msg);
    } finally {
      setAnalystLoading(false);
    }
  };

  // Recommendation status update (Approve/Dismiss)
  const handleRecommendationAction = async (id: string, newStatus: "APPROVED" | "DISMISSED") => {
    try {
      const res = await fetch("/api/admin/intelligence/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error("Action failed.");

      setRecommendationsData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Status update failed.";
      alert("Error updating recommendation: " + msg);
    }
  };

  // Trigger Report Generation
  const handleGenerateReport = async (type: "DAILY" | "WEEKLY" | "MONTHLY") => {
    try {
      const res = await fetch("/api/admin/intelligence/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: type }),
      });

      if (!res.ok) throw new Error("Report generation failed.");
      const data = await res.json();
      alert(`Report generated successfully! ID: ${data.report.id}`);

      // Refresh reports tab
      const rpRes = await fetch("/api/admin/intelligence/reports");
      const rpJson: ReportsApiResponse = await rpRes.json();
      setReportsData(rpJson);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Report compilation failed.";
      alert("Failed to generate report: " + msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-stone-600">
        <div className="w-12 h-12 border-4 border-[#2A9D8F]/30 border-t-[#2A9D8F] rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-serif text-[#264653] font-semibold">
          Synthesizing Atelier Intelligence...
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Aggregating time-series demand models, effective inventory locks & RFM churn radar.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center max-w-xl mx-auto my-12">
        <span className="text-3xl block mb-2">⚠️</span>
        <h3 className="font-serif font-bold text-lg mb-1">Intelligence Pipeline Error</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const bo = overviewData?.businessOverview;
  const po = overviewData?.predictiveOverview;

  return (
    <div className="space-y-6">
      {/* Atelier Luxury Header */}
      <div className="bg-[#1A333B] text-[#FAF8F5] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#2A9D8F]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-widest px-2.5 py-0.5 rounded font-mono font-bold bg-[#E76F51]/20 text-[#E76F51] border border-[#E76F51]/30">
                Phase 10 Autonomous BI
              </span>
              <span className="text-xs text-stone-300 font-sans">
                Predictive Operations & Decision Support
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white mt-1">
              AI Business Command Center
            </h1>
            <p className="text-xs sm:text-sm text-[#FAF8F5]/70 max-w-2xl mt-1">
              Real-time operational monitoring, grounded demand forecasting, effective inventory runout
              projections, and approval-governed business recommendations.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleGenerateReport("DAILY")}
              className="px-3.5 py-2 rounded-lg bg-[#2A9D8F] text-white text-xs font-semibold hover:bg-[#238276] transition-colors shadow-sm"
            >
              ⚡ Run Daily Audit
            </button>
            <a
              href="/api/admin/intelligence/reports?format=csv&type=DAILY"
              download
              className="px-3.5 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors border border-white/10"
            >
              📥 Export CSV
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-6 mt-6 border-t border-white/10 no-scrollbar text-xs font-medium">
          {[
            { id: "overview" as const, label: "Executive Overview", icon: "📊" },
            { id: "analyst" as const, label: "AI Business Analyst", icon: "💬" },
            { id: "forecast" as const, label: "Demand Forecast", icon: "📈" },
            { id: "inventory" as const, label: "Inventory Intelligence", icon: "📦" },
            { id: "churn" as const, label: "Customer Churn Radar", icon: "👥" },
            { id: "profitability" as const, label: "Unit Economics & Margins", icon: "💰" },
            { id: "anomalies" as const, label: "Operational Anomalies", icon: "🚨" },
            { id: "marketing" as const, label: "Marketing Attribution", icon: "🏷️" },
            { id: "reports" as const, label: "Scheduled Reports", icon: "📄" },
            { id: "recommendations" as const, label: "Action Recommendations", icon: "✨" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? "bg-[#264653] text-white border border-[#2A9D8F]/50 shadow-sm"
                  : "text-stone-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                                  */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                Gross Merchandise Value
              </span>
              <div className="text-2xl font-serif font-bold text-[#264653] mt-1">
                {formatInr(bo?.grossMerchandiseValueInr || 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                <span>{bo?.totalOrders || 0} Total Orders</span>
                <span className="text-emerald-700 font-semibold">{bo?.paidOrders || 0} Paid</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                Net Settled Revenue
              </span>
              <div className="text-2xl font-serif font-bold text-[#2A9D8F] mt-1">
                {formatInr(bo?.netRevenueInr || 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                <span>Refunded: {formatInr(bo?.refundedAmountInr || 0)}</span>
                <span className="text-stone-600">{bo?.refundRatePercent}% Rate</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                Average Order Value (AOV)
              </span>
              <div className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {formatInr(bo?.averageOrderValueInr || 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                <span>Repeat Rate: {bo?.repeatPurchaseRatePercent}%</span>
                <span className="text-stone-600">{bo?.returningCustomers} Patrons</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                Catalog Inventory Valuation
              </span>
              <div className="text-2xl font-serif font-bold text-[#E76F51] mt-1">
                {formatInr(bo?.totalInventoryValuationInr || 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                <span>{bo?.totalInventoryUnits} Units On-Hand</span>
                <span className="text-rose-600 font-semibold">{bo?.lowStockVariantCount} Low Stock</span>
              </div>
            </div>
          </div>

          {/* Predictive Overview Banner */}
          <div className="bg-gradient-to-r from-[#264653] to-[#1E353F] text-white p-6 rounded-2xl shadow-md border border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Anticipatory Intelligence Pulse
                </span>
                <h3 className="text-lg font-serif font-bold mt-1.5">
                  30-Day Demand Projection: {po?.forecastSummary?.storewide30dUnits} Garments (Est.{" "}
                  {formatInr(po?.forecastSummary?.storewide30dRevenueInr || 0)})
                </h3>
                <p className="text-xs text-stone-300 mt-1">
                  Confidence level: {po?.forecastSummary?.confidenceLevel} based on recent velocity.
                  Identified {po?.inventoryRisks?.criticalStockouts} stockouts and {po?.churnRisks?.imminentChurnCount} high-risk patron dormancy signals.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("forecast")}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-xs font-semibold transition-colors"
                >
                  View Forecast Charts →
                </button>
              </div>
            </div>
          </div>

          {/* Action Recommendations Preview */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#264653]">
                  Immediate Decision Support Cues
                </h2>
                <p className="text-xs text-stone-500">
                  Approval-governed operational actions synthesized from inventory, churn, and return signals.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("recommendations")}
                className="text-xs text-[#2A9D8F] font-semibold hover:underline"
              >
                View All Recommendations ({recommendationsData.length}) →
              </button>
            </div>

            <div className="space-y-3">
              {recommendationsData.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-stone-100 bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                          rec.priority === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : rec.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs font-semibold text-stone-900">{rec.title}</span>
                    </div>
                    <p className="text-xs text-stone-600">{rec.recommendation}</p>
                    <p className="text-[11px] text-stone-400 italic">{rec.supportingEvidence}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {rec.status === "PENDING_APPROVAL" ? (
                      <>
                        <button
                          onClick={() => handleRecommendationAction(rec.id, "APPROVED")}
                          className="px-3 py-1.5 rounded-lg bg-[#264653] text-white text-xs font-semibold hover:bg-[#1E353F]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRecommendationAction(rec.id, "DISMISSED")}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-white"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        ✓ {rec.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI BUSINESS ANALYST                                                 */}
      {/* ========================================================================= */}
      {activeTab === "analyst" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base">🧠</span>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  AI Executive Business Analyst
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Grounded conversational copilot querying authoritative PostgreSQL analytics in real-time.
              </p>
            </div>
            <span className="text-[11px] uppercase tracking-wider font-mono font-bold px-2.5 py-1 rounded bg-[#2A9D8F]/10 text-[#2A9D8F] border border-[#2A9D8F]/20">
              Read-Only Verified Mode
            </span>
          </div>

          {/* Quick Preset Inquiry Chips */}
          <div>
            <span className="text-xs font-semibold text-stone-500 block mb-2">
              Suggested Business Queries:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                "How much revenue did LOOMERA generate this month?",
                "Which five products sold the most?",
                "Which category has the highest return rate?",
                "Which products should I restock?",
                "How many customers purchased more than once?",
                "Explain our 30-day demand forecast.",
                "Are there any business anomalies detected?",
                "How is our marketing channel attribution performing?",
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnalystSubmit(preset)}
                  className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-[#264653] hover:text-white transition-all text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-4 max-h-[480px] overflow-y-auto p-4 rounded-xl bg-[#FAF8F5] border border-stone-200">
            {analystHistory.map((item, idx) => (
              <div key={idx} className="space-y-2">
                {/* User Prompt */}
                <div className="flex justify-end">
                  <div className="bg-[#264653] text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-xs max-w-lg shadow-sm">
                    {item.query}
                  </div>
                </div>

                {/* Assistant Grounded Answer */}
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 text-stone-800 p-4 rounded-2xl rounded-tl-none text-xs max-w-2xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pb-1 border-b border-stone-100">
                      <span>Tool Executed: {item.toolUsed}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <p className="leading-relaxed text-stone-800">{item.answer}</p>

                    {/* Chart Visualization if present */}
                    {item.chartData && (
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-mono font-bold text-stone-400 block mb-1">
                          Structured Metric Breakdown ({item.chartData.type}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.chartData.labels.map((lbl: string, lIdx: number) => (
                            <div
                              key={lIdx}
                              className="px-2.5 py-1 rounded bg-stone-50 border border-stone-200 text-[11px] font-mono"
                            >
                              <span className="text-stone-500">{lbl}: </span>
                              <span className="font-bold text-[#264653]">
                                {typeof item.chartData?.values[lIdx] === "number" && (item.chartData.values[lIdx] ?? 0) > 100
                                  ? formatInr(item.chartData.values[lIdx] ?? 0)
                                  : item.chartData?.values[lIdx]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {analystLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 text-stone-500 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                  <span>Querying PostgreSQL and synthesizing verified financial reasoning...</span>
                </div>
              </div>
            )}
          </div>

          {/* User Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalystSubmit();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={analystQuery}
              onChange={(e) => setAnalystQuery(e.target.value)}
              placeholder="Ask a natural-language business question (e.g. 'Compare this month with last month', 'Which products have declining demand?')..."
              className="flex-1 px-4 py-3 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#264653] bg-white text-stone-900"
            />
            <button
              type="submit"
              disabled={analystLoading || !analystQuery.trim()}
              className="px-5 py-3 rounded-xl bg-[#264653] text-white text-xs font-semibold hover:bg-[#1E353F] transition-colors disabled:opacity-50"
            >
              Ask Analyst
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEMAND FORECASTING                                                  */}
      {/* ========================================================================= */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Storewide & Product Demand Forecasting
                </h2>
                <p className="text-xs text-stone-500">
                  Explainable statistical time-series projections with empirical confidence intervals.
                </p>
              </div>

              {/* Horizon Selectors */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-stone-500 font-semibold">Horizon:</span>
                {([7, 14, 30, 90] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setForecastHorizon(h)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-semibold ${
                      forecastHorizon === h
                        ? "bg-[#264653] text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {h}d
                  </button>
                ))}
              </div>
            </div>

            {/* Storewide Highlight */}
            {forecastOverview?.storewide && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-stone-200">
                <div>
                  <span className="text-[11px] font-mono text-stone-500 uppercase">
                    30-Day Predicted Demand
                  </span>
                  <div className="text-2xl font-serif font-bold text-[#264653]">
                    {forecastOverview.storewide.predictedUnits} Units
                  </div>
                  <span className="text-xs text-stone-500">
                    Est. {formatInr(forecastOverview.storewide.predictedRevenueInr)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-stone-500 uppercase">
                    Confidence Interval (85%)
                  </span>
                  <div className="text-xl font-serif font-bold text-[#2A9D8F]">
                    [{forecastOverview.storewide.confidenceLower} — {forecastOverview.storewide.confidenceUpper}] Units
                  </div>
                  <span className="text-xs text-stone-500">
                    Model: {forecastOverview.storewide.modelUsed}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-stone-500 uppercase">
                    Model Transparency & Limitations
                  </span>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    {forecastOverview.storewide.limitations}
                  </p>
                </div>
              </div>
            )}

            {/* Product Level Projections Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5">Garment Title</th>
                    <th className="py-2.5">Historical Daily Avg</th>
                    <th className="py-2.5">30d Forecast Units</th>
                    <th className="py-2.5">Projected Revenue</th>
                    <th className="py-2.5">Confidence Bounds</th>
                    <th className="py-2.5">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {forecastOverview?.topProducts?.map((fp, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 font-semibold text-stone-900">{fp.targetName}</td>
                      <td className="py-3 text-stone-600 font-mono">{fp.historicalDailyAverage} / day</td>
                      <td className="py-3 font-bold text-[#264653] font-mono">{fp.predictedUnits} units</td>
                      <td className="py-3 text-[#2A9D8F] font-semibold">{formatInr(fp.predictedRevenueInr)}</td>
                      <td className="py-3 text-stone-500 font-mono">[{fp.confidenceLower} – {fp.confidenceUpper}]</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-700">
                          {fp.modelUsed}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INVENTORY INTELLIGENCE                                              */}
      {/* ========================================================================= */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Effective Inventory & Stockout Runout Radar
                </h2>
                <p className="text-xs text-stone-500">
                  Evaluates physical stock minus active reservation locks to forecast runout dates and restock cues.
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="text-rose-600 font-semibold">
                  {inventoryData?.criticalStockoutCount} Stockouts
                </span>
                <span className="text-amber-600 font-semibold">
                  {inventoryData?.reorderSoonCount} Approaching Low
                </span>
                <span className="text-emerald-700 font-semibold">
                  {inventoryData?.healthyCount} Healthy
                </span>
              </div>
            </div>

            {/* Inventory Detail Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5">Garment & SKU</th>
                    <th className="py-2.5">Size/Color</th>
                    <th className="py-2.5">Physical / Reserved</th>
                    <th className="py-2.5">Effective Stock</th>
                    <th className="py-2.5">Sales Velocity</th>
                    <th className="py-2.5">Coverage Days</th>
                    <th className="py-2.5">Est. Stockout</th>
                    <th className="py-2.5">Suggested Reorder</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {inventoryData?.itemsApproachingStockout?.map((item: VariantStockIntelligence, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3">
                        <div className="font-semibold text-stone-900">{item.productTitle}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-3 text-stone-600 font-mono">{item.size} / {item.colorName}</td>
                      <td className="py-3 text-stone-500 font-mono">
                        {item.physicalStock} / <span className="text-amber-600">-{item.activeReservedStock}</span>
                      </td>
                      <td className="py-3 font-bold text-stone-900 font-mono">{item.effectiveAvailableStock}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.salesVelocityTrend === "SURGING"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {item.salesVelocityTrend} ({item.averageDailySales}/d)
                        </span>
                      </td>
                      <td className="py-3 font-mono font-semibold">
                        {item.stockCoverageDays !== null ? `${item.stockCoverageDays} days` : "N/A"}
                      </td>
                      <td className="py-3 text-stone-500 font-mono">{item.estimatedStockoutDate || "—"}</td>
                      <td className="py-3 font-bold text-[#2A9D8F] font-mono">
                        {item.suggestedReorderQuantity > 0 ? `+${item.suggestedReorderQuantity} units` : "0"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.urgency === "CRITICAL_STOCKOUT"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CUSTOMER CHURN RADAR                                                */}
      {/* ========================================================================= */}
      {activeTab === "churn" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Patron Retention & Churn Risk Radar
                </h2>
                <p className="text-xs text-stone-500">
                  Behavioral dormancy tracking, purchase cadence disruption, and approval-gated retention outreach.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-stone-500 block">At-Risk Lifetime Spend Exposure:</span>
                <span className="text-lg font-serif font-bold text-rose-700">
                  {formatInr(churnData?.atRiskRevenueExposureInr || 0)}
                </span>
              </div>
            </div>

            {/* Churn Cohort Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">Low Risk</span>
                <div className="text-xl font-serif font-bold text-emerald-900 mt-1">
                  {churnData?.lowRiskCount || 0} Patrons
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-800">Moderate Risk</span>
                <div className="text-xl font-serif font-bold text-blue-900 mt-1">
                  {churnData?.moderateRiskCount || 0} Patrons
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-800">High Risk</span>
                <div className="text-xl font-serif font-bold text-amber-900 mt-1">
                  {churnData?.highRiskCount || 0} Patrons
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-[10px] font-mono uppercase font-bold text-rose-800">Imminent Churn</span>
                <div className="text-xl font-serif font-bold text-rose-900 mt-1">
                  {churnData?.imminentChurnCount || 0} Patrons
                </div>
              </div>
            </div>

            {/* High Risk Patrons Table */}
            <div className="overflow-x-auto pt-4">
              <h3 className="text-sm font-serif font-bold text-[#264653] mb-2">
                High-Risk Inactivity Radar
              </h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5">Patron</th>
                    <th className="py-2.5">RFM Segment</th>
                    <th className="py-2.5">Recency</th>
                    <th className="py-2.5">Spend</th>
                    <th className="py-2.5">Risk Score</th>
                    <th className="py-2.5">Behavioral Signals</th>
                    <th className="py-2.5">Recommended Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {churnData?.highRiskPatrons?.map((p: CustomerChurnRiskProfile, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 font-semibold text-stone-900">{p.fullName}</td>
                      <td className="py-3 font-mono text-stone-600">{p.rfmSegment}</td>
                      <td className="py-3 font-mono text-stone-500">{p.recencyDays}d ago</td>
                      <td className="py-3 font-bold text-[#264653] font-mono">{formatInr(p.lifetimeSpendInr)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                          {p.churnRiskScore}/100
                        </span>
                      </td>
                      <td className="py-3 text-stone-600 max-w-xs">{p.behavioralSignals.join("; ")}</td>
                      <td className="py-3 text-stone-500 text-[11px] italic max-w-xs">
                        {p.recommendedRetentionStrategy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PRODUCT PROFITABILITY & UNIT ECONOMICS                             */}
      {/* ========================================================================= */}
      {activeTab === "profitability" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Product Profitability & Unit Economics
                </h2>
                <p className="text-xs text-stone-500">
                  Verified financial margins separating gross sales, discounts, refunds, payment processing, and COGS.
                </p>
              </div>

              <div className="text-xs font-mono text-stone-600">
                <span>Net Sales: </span>
                <span className="font-bold text-[#2A9D8F]">{formatInr(profitabilityData?.netSalesInr || 0)}</span>
              </div>
            </div>

            {/* Cost Configuration Status Notice */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <span className="font-bold">Operational Constraint Transparency: </span>
              {profitabilityData?.costDataStatusNotice}
            </div>

            {/* Profitability Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5">Product Title</th>
                    <th className="py-2.5">Units Sold</th>
                    <th className="py-2.5">Gross Sales</th>
                    <th className="py-2.5">Discounts</th>
                    <th className="py-2.5">Refunds</th>
                    <th className="py-2.5">Net Sales</th>
                    <th className="py-2.5">Unit COGS</th>
                    <th className="py-2.5">Gross Margin</th>
                    <th className="py-2.5">Gateway Fee (2%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {profitabilityData?.allProductProfitability?.map((p: ProductProfitabilityRecord, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 font-semibold text-stone-900">{p.productTitle}</td>
                      <td className="py-3 font-mono text-stone-600">{p.unitsSold}</td>
                      <td className="py-3 font-mono text-stone-900">{formatInr(p.grossSalesInr)}</td>
                      <td className="py-3 font-mono text-stone-500">-{formatInr(p.discountsAllocatedInr)}</td>
                      <td className="py-3 font-mono text-rose-600">-{formatInr(p.refundsInr)}</td>
                      <td className="py-3 font-bold text-[#2A9D8F] font-mono">{formatInr(p.netSalesInr)}</td>
                      <td className="py-3 font-mono text-stone-500">
                        {p.unitCostInr ? formatInr(p.unitCostInr) : <span className="text-stone-400 italic">Unset</span>}
                      </td>
                      <td className="py-3 font-mono font-semibold">
                        {p.grossMarginPercent !== null ? `${p.grossMarginPercent}%` : "—"}
                      </td>
                      <td className="py-3 font-mono text-stone-400">-{formatInr(p.estimatedPaymentGatewayFeeInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: OPERATIONAL ANOMALIES                                               */}
      {/* ========================================================================= */}
      {activeTab === "anomalies" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Business Anomaly Detection Monitor
                </h2>
                <p className="text-xs text-stone-500">
                  Proactive statistical deviation alerts (revenue drops, payment failure spikes, refund surges).
                </p>
              </div>

              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/intelligence/anomalies?scan=true");
                  const json = await res.json();
                  alert(`Scan complete. Detected ${json.scanResult.anomaliesDetectedCount} anomalies.`);
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#264653] text-white text-xs font-semibold hover:bg-[#1E353F]"
              >
                🔄 Run Live Scan
              </button>
            </div>

            <div className="space-y-3">
              {anomalyData?.anomalies?.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs bg-stone-50 rounded-xl">
                  ✓ All operational systems normal. No statistical revenue or inventory anomalies detected.
                </div>
              ) : (
                anomalyData?.anomalies?.map((a: BusinessAnomalyAlert, idx: number) => (
                  <div
                    key={a.id || idx}
                    className="p-4 rounded-xl border border-stone-200 bg-[#FAF8F5] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            a.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : a.severity === "HIGH"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {a.severity}
                        </span>
                        <span className="text-xs font-semibold text-stone-900">{a.anomalyType}</span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          Deviation: {a.deviationPercent}%
                        </span>
                      </div>
                      <p className="text-xs text-stone-700">{a.summary}</p>
                      <p className="text-[11px] text-stone-500 italic">
                        Suggested Action: {a.suggestedInvestigation}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-stone-200 text-stone-700">
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: MARKETING ATTRIBUTION                                               */}
      {/* ========================================================================= */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Marketing Channel & Attribution Intelligence
                </h2>
                <p className="text-xs text-stone-500">
                  Full-funnel first-party UTM tracking connecting campaign clicks to verified settled orders.
                </p>
              </div>

              <div className="text-xs font-mono text-stone-600">
                <span>Top Channel: </span>
                <span className="font-bold text-[#2A9D8F]">{marketingData?.topPerformingChannel}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5">Acquisition Channel</th>
                    <th className="py-2.5">Sessions</th>
                    <th className="py-2.5">Orders</th>
                    <th className="py-2.5">Attributed Revenue</th>
                    <th className="py-2.5">AOV</th>
                    <th className="py-2.5">Conversion Rate</th>
                    <th className="py-2.5">Repeat Buyer Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {marketingData?.channelBreakdown?.map((c: ChannelPerformanceMetric, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 font-semibold text-stone-900">{c.channel}</td>
                      <td className="py-3 font-mono text-stone-600">{c.totalSessions}</td>
                      <td className="py-3 font-mono text-stone-900 font-bold">{c.ordersCount}</td>
                      <td className="py-3 font-mono text-[#2A9D8F] font-semibold">{formatInr(c.grossRevenueInr)}</td>
                      <td className="py-3 font-mono text-stone-600">{formatInr(c.averageOrderValueInr)}</td>
                      <td className="py-3 font-mono font-bold text-[#264653]">{c.conversionRatePercent}%</td>
                      <td className="py-3 font-mono text-stone-500">{c.repeatPurchaseRatePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: SCHEDULED REPORTS                                                   */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Scheduled Business Reports & Exports
                </h2>
                <p className="text-xs text-stone-500">
                  Idempotent daily, weekly, and monthly commercial audits with downloadable CSV records.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateReport("DAILY")}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200"
                >
                  Generate Daily
                </button>
                <button
                  onClick={() => handleGenerateReport("WEEKLY")}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200"
                >
                  Generate Weekly
                </button>
                <button
                  onClick={() => handleGenerateReport("MONTHLY")}
                  className="px-3 py-1.5 rounded-lg bg-[#264653] text-white text-xs font-semibold hover:bg-[#1E353F]"
                >
                  Generate Monthly
                </button>
              </div>
            </div>

            {/* Historical Reports Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5">Report Type</th>
                    <th className="py-2.5">Period Window</th>
                    <th className="py-2.5">GMV (INR)</th>
                    <th className="py-2.5">Orders</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Generated At</th>
                    <th className="py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reportsData?.history?.map((h: HistoricalReportItem, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 font-semibold text-stone-900">{h.reportType}</td>
                      <td className="py-3 text-stone-500 font-mono text-[11px]">
                        {h.periodStart.slice(0, 10)} to {h.periodEnd.slice(0, 10)}
                      </td>
                      <td className="py-3 font-bold text-[#264653] font-mono">
                        {typeof h.summary?.grossRevenueInr === "number"
                          ? formatInr(h.summary.grossRevenueInr)
                          : "₹0"}
                      </td>
                      <td className="py-3 font-mono text-stone-600">
                        {typeof h.summary?.totalOrders === "number" ? h.summary.totalOrders : 0}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 text-stone-400 font-mono text-[11px]">{h.createdAt.slice(0, 16)}</td>
                      <td className="py-3">
                        <a
                          href={`/api/admin/intelligence/reports?format=csv&type=${h.reportType}`}
                          className="text-[#2A9D8F] font-semibold hover:underline"
                        >
                          Download CSV
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: ACTION RECOMMENDATIONS                                             */}
      {/* ========================================================================= */}
      {activeTab === "recommendations" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#264653]">
                  Unified Business Action Recommendations
                </h2>
                <p className="text-xs text-stone-500">
                  Cross-functional recommendations requiring human authorization before any operational or financial action.
                </p>
              </div>

              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/intelligence/recommendations?refresh=true");
                  const json = await res.json();
                  setRecommendationsData(json.summary.recommendations);
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200"
              >
                🔄 Refresh Signals
              </button>
            </div>

            <div className="space-y-3">
              {recommendationsData.map((rec: UnifiedRecommendation) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl border border-stone-200 bg-[#FAF8F5] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded ${
                          rec.priority === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : rec.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                        {rec.category}
                      </span>
                      <span className="text-sm font-semibold text-stone-900">{rec.title}</span>
                    </div>

                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {rec.recommendation}
                    </p>
                    <p className="text-xs text-stone-600">
                      <span className="font-semibold text-stone-700">Evidence: </span>
                      {rec.supportingEvidence}
                    </p>
                    <p className="text-xs text-emerald-800">
                      <span className="font-semibold">Expected Impact: </span>
                      {rec.expectedImpact}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {rec.status === "PENDING_APPROVAL" ? (
                      <>
                        <button
                          onClick={() => handleRecommendationAction(rec.id, "APPROVED")}
                          className="px-4 py-2 rounded-xl bg-[#264653] text-white text-xs font-semibold hover:bg-[#1E353F] transition-colors shadow-sm"
                        >
                          Approve Action
                        </button>
                        <button
                          onClick={() => handleRecommendationAction(rec.id, "DISMISSED")}
                          className="px-3 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-white transition-colors"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                        ✓ {rec.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
