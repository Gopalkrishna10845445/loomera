/**
 * LOOMERA — AI Business Analyst & Executive Decision-Support Copilot
 * Provides natural-language business analysis grounded entirely in authentic PostgreSQL data.
 * Executes 12 read-only executive tools with explainable deterministic fallbacks.
 */

import { getAuthoritativeBusinessOverview } from "./financial-metrics";
import { generateDemandForecast } from "./demand-forecasting";
import { getInventoryIntelligence } from "./inventory-intelligence";
import { getCustomerChurnAnalysis } from "./churn-intelligence";
import { getProductProfitabilityAnalysis } from "./profitability-intelligence";
import { runBusinessAnomalyDetection } from "./anomaly-detection";
import { getMarketingIntelligenceReport } from "./marketing-intelligence";
import { getSalesTimeline, getTopSellingProducts, getCategoryPerformance } from "@/lib/admin/analytics-service";

export interface AnalystToolResult {
  toolName: string;
  data: unknown;
  explanation: string;
  chartData?: {
    type: "bar" | "line" | "pie";
    labels: string[];
    values: number[];
  };
}

export interface AnalystResponse {
  answer: string;
  toolUsed: string;
  toolResult: unknown;
  chartData?: {
    type: "bar" | "line" | "pie";
    labels: string[];
    values: number[];
  };
  providerMode: "curated_bi_nlu" | "llm_grounded";
  timestamp: string;
}

/**
 * 12 Authoritative, Strictly Read-Only Executive BI Tools
 */
export async function executeAnalystTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<AnalystToolResult> {
  switch (toolName) {
    case "get_revenue_summary": {
      const overview = await getAuthoritativeBusinessOverview();
      return {
        toolName,
        data: {
          gmvInr: overview.grossMerchandiseValueInr,
          netRevenueInr: overview.netRevenueInr,
          totalOrders: overview.totalOrders,
          aovInr: overview.averageOrderValueInr,
          refundRatePercent: overview.refundRatePercent,
        },
        explanation: `Gross merchandise value is ₹${overview.grossMerchandiseValueInr.toLocaleString()} across ${overview.totalOrders} total orders. Net revenue after refunds is ₹${overview.netRevenueInr.toLocaleString()} with an Average Order Value (AOV) of ₹${overview.averageOrderValueInr.toLocaleString()}.`,
        chartData: {
          type: "bar",
          labels: ["GMV", "Net Revenue", "Refunds"],
          values: [overview.grossMerchandiseValueInr, overview.netRevenueInr, overview.refundedAmountInr],
        },
      };
    }

    case "get_sales_trends": {
      const days = typeof args.days === "number" ? args.days : 30;
      const timeline = await getSalesTimeline(days);
      const totalPeriodRev = timeline.reduce((acc, t) => acc + t.grossRevenueInr, 0);
      return {
        toolName,
        data: timeline,
        explanation: `Sales trajectory over previous ${days} days aggregated ${timeline.length} daily observation points totaling ₹${totalPeriodRev.toLocaleString()}.`,
        chartData: {
          type: "line",
          labels: timeline.slice(-14).map((t) => t.date.slice(5)),
          values: timeline.slice(-14).map((t) => t.grossRevenueInr),
        },
      };
    }

    case "get_top_products": {
      const limit = typeof args.limit === "number" ? args.limit : 5;
      const top = await getTopSellingProducts(limit);
      return {
        toolName,
        data: top,
        explanation: `Top ${top.length} best-selling garments by sales volume: ${top.map((p) => `${p.productTitle} (${p.unitsSold} units, ₹${p.grossRevenueInr.toLocaleString()})`).join(", ")}.`,
        chartData: {
          type: "bar",
          labels: top.map((p) => p.productTitle.slice(0, 14)),
          values: top.map((p) => p.grossRevenueInr),
        },
      };
    }

    case "get_category_performance": {
      const cats = await getCategoryPerformance();
      return {
        toolName,
        data: cats,
        explanation: `Category performance across catalog: ${cats.map((c) => `${c.categoryName}: ${c.unitsSold} units sold, ₹${c.grossRevenueInr.toLocaleString()} gross revenue`).join("; ")}.`,
        chartData: {
          type: "pie",
          labels: cats.map((c) => c.categoryName),
          values: cats.map((c) => c.grossRevenueInr),
        },
      };
    }

    case "get_inventory_summary": {
      const inv = await getInventoryIntelligence();
      return {
        toolName,
        data: {
          totalAudited: inv.totalVariantsAudited,
          criticalStockouts: inv.criticalStockoutCount,
          reorderSoon: inv.reorderSoonCount,
          slowMoving: inv.slowMovingCount,
          healthy: inv.healthyCount,
        },
        explanation: `Audited ${inv.totalVariantsAudited} variant SKUs: ${inv.criticalStockoutCount} completely out of stock, ${inv.reorderSoonCount} approaching stockout threshold, and ${inv.slowMovingCount} slow-moving inventory.`,
        chartData: {
          type: "pie",
          labels: ["Healthy", "Reorder Soon", "Out of Stock", "Slow Moving"],
          values: [inv.healthyCount, inv.reorderSoonCount, inv.criticalStockoutCount, inv.slowMovingCount],
        },
      };
    }

    case "get_demand_forecast": {
      const horizonDays = typeof args.horizonDays === "number" ? args.horizonDays : 30;
      const forecast = await generateDemandForecast({
        targetType: "STORE",
        targetId: "STORE",
        horizonDays,
        preferredModel: "EWMA",
      });
      return {
        toolName,
        data: forecast,
        explanation: `30-day forecasted storewide demand is ${forecast.predictedUnits} units (estimated ₹${forecast.predictedRevenueInr.toLocaleString()}). Confidence interval: [${forecast.confidenceLower} — ${forecast.confidenceUpper} units] at ${forecast.confidenceLevel}. Model: ${forecast.modelUsed}.`,
        chartData: {
          type: "line",
          labels: forecast.dailyForecast.slice(0, 14).map((d) => d.date.slice(5)),
          values: forecast.dailyForecast.slice(0, 14).map((d) => d.units),
        },
      };
    }

    case "get_customer_retention_metrics": {
      const overview = await getAuthoritativeBusinessOverview();
      return {
        toolName,
        data: {
          totalCustomers: overview.totalCustomers,
          returningCustomers: overview.returningCustomers,
          repeatPurchaseRatePercent: overview.repeatPurchaseRatePercent,
        },
        explanation: `Out of ${overview.totalCustomers} total patrons with completed orders, ${overview.returningCustomers} are repeat buyers, establishing a repeat purchase rate of ${overview.repeatPurchaseRatePercent}%.`,
      };
    }

    case "get_churn_risk_summary": {
      const churn = await getCustomerChurnAnalysis();
      return {
        toolName,
        data: {
          totalAudited: churn.totalAuditedCustomers,
          imminentChurnCount: churn.imminentChurnCount,
          highRiskCount: churn.highRiskCount,
          atRiskRevenueExposureInr: churn.atRiskRevenueExposureInr,
        },
        explanation: `Customer churn analysis flagged ${churn.imminentChurnCount} patrons in imminent churn and ${churn.highRiskCount} in high risk, exposing ₹${churn.atRiskRevenueExposureInr.toLocaleString()} in historical lifetime spend to dormancy.`,
        chartData: {
          type: "bar",
          labels: ["Low Risk", "Moderate Risk", "High Risk", "Imminent Churn"],
          values: [churn.lowRiskCount, churn.moderateRiskCount, churn.highRiskCount, churn.imminentChurnCount],
        },
      };
    }

    case "get_campaign_performance": {
      const mkt = await getMarketingIntelligenceReport();
      return {
        toolName,
        data: mkt,
        explanation: `Top acquisition channel is "${mkt.topPerformingChannel}". Total attributed revenue: ₹${mkt.totalAttributedRevenueInr.toLocaleString()} across ${mkt.totalAttributedOrders} orders.`,
        chartData: {
          type: "bar",
          labels: mkt.channelBreakdown.map((c) => c.channel),
          values: mkt.channelBreakdown.map((c) => c.grossRevenueInr),
        },
      };
    }

    case "get_refund_analysis": {
      const prof = await getProductProfitabilityAnalysis();
      return {
        toolName,
        data: {
          storeRefundsInr: prof.refundsInr,
          highReturnProducts: prof.highReturnProducts,
        },
        explanation: `Total store refunds: ₹${prof.refundsInr.toLocaleString()}. Products with highest return rates: ${prof.highReturnProducts.map((p) => `${p.productTitle} (${p.returnRatePercent}% returns)`).join(", ")}.`,
      };
    }

    case "get_business_anomalies": {
      const anomalyScan = await runBusinessAnomalyDetection(false);
      return {
        toolName,
        data: anomalyScan,
        explanation:
          anomalyScan.anomaliesDetectedCount === 0
            ? "No critical business anomalies detected in current operational metrics. Revenue, payment gateway rates, and inventory flow are stable."
            : `Detected ${anomalyScan.anomaliesDetectedCount} operational anomalies (${anomalyScan.criticalCount} critical, ${anomalyScan.highCount} high). Primary flag: ${anomalyScan.alerts[0]?.summary || ""}`,
      };
    }

    case "get_restock_recommendations": {
      const inv = await getInventoryIntelligence();
      return {
        toolName,
        data: inv.restockRecommendations,
        explanation: `Generated ${inv.restockRecommendations.length} restock suggestions based on current stock velocity and coverage runout dates. Top recommendation: ${inv.restockRecommendations[0]?.reasoning || "All stock levels within safe buffer."}`,
      };
    }

    default:
      throw new Error(`Unauthorized or unknown BI tool: ${toolName}`);
  }
}

/**
 * Natural language intent classifier for business analyst inquiries.
 */
function classifyBusinessQuestion(query: string): { toolName: string; args: Record<string, unknown> } {
  const q = query.toLowerCase();

  if (q.includes("restock") || q.includes("reorder") || q.includes("stock shortage") || q.includes("run out")) {
    return { toolName: "get_restock_recommendations", args: {} };
  }
  if (q.includes("inventory") || q.includes("stock level") || q.includes("how much stock")) {
    return { toolName: "get_inventory_summary", args: {} };
  }
  if (q.includes("forecast") || q.includes("predict") || q.includes("demand") || q.includes("next month")) {
    return { toolName: "get_demand_forecast", args: { horizonDays: 30 } };
  }
  if (q.includes("churn") || q.includes("at-risk") || q.includes("dormant") || q.includes("inactive customer")) {
    return { toolName: "get_churn_risk_summary", args: {} };
  }
  if (q.includes("repeat") || q.includes("retention") || q.includes("returning customer") || q.includes("more than once")) {
    return { toolName: "get_customer_retention_metrics", args: {} };
  }
  if (q.includes("refund") || q.includes("return rate") || q.includes("highest return")) {
    return { toolName: "get_refund_analysis", args: {} };
  }
  if (q.includes("anomaly") || q.includes("unusual") || q.includes("alert") || q.includes("spike") || q.includes("drop")) {
    return { toolName: "get_business_anomalies", args: {} };
  }
  if (q.includes("campaign") || q.includes("channel") || q.includes("marketing") || q.includes("utm") || q.includes("source")) {
    return { toolName: "get_campaign_performance", args: {} };
  }
  if (q.includes("category") || q.includes("men") || q.includes("boys") || q.includes("handloom")) {
    return { toolName: "get_category_performance", args: {} };
  }
  if (q.includes("top") || q.includes("best") || q.includes("sold the most") || q.includes("popular garment")) {
    return { toolName: "get_top_products", args: { limit: 5 } };
  }
  if (q.includes("trend") || q.includes("last week") || q.includes("history") || q.includes("timeline")) {
    return { toolName: "get_sales_trends", args: { days: 30 } };
  }

  // Default: General revenue summary
  return { toolName: "get_revenue_summary", args: {} };
}

/**
 * Main AI Business Analyst conversational interface.
 * Strictly read-only, non-mutating query processor.
 */
export async function queryAiBusinessAnalyst(userQuery: string): Promise<AnalystResponse> {
  const { toolName, args } = classifyBusinessQuestion(userQuery);

  // Execute database query
  const toolResult = await executeAnalystTool(toolName, args);

  // Check if live LLM is configured (GEMINI_API_KEY)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const promptText = `
You are the LOOMERA Executive AI Business Analyst, advising the founder on e-commerce business intelligence.
User Question: "${userQuery}"
Authoritative Database Result from Tool (${toolName}):
${JSON.stringify(toolResult.data, null, 2)}

Provide a concise, sophisticated, executive response (2-4 sentences). 
Include verified INR numbers, state uncertainty if sample size is limited, and suggest an actionable next step.
Never fabricate data outside the provided JSON.
`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidate) {
          return {
            answer: candidate,
            toolUsed: toolName,
            toolResult: toolResult.data,
            chartData: toolResult.chartData,
            providerMode: "llm_grounded",
            timestamp: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn("LLM executive query failed, using deterministic explanation fallback:", err);
    }
  }

  // Deterministic Grounded NLU Fallback
  return {
    answer: toolResult.explanation,
    toolUsed: toolName,
    toolResult: toolResult.data,
    chartData: toolResult.chartData,
    providerMode: "curated_bi_nlu",
    timestamp: new Date().toISOString(),
  };
}
