import {
  AssistantProduct,
  AssistantFilters,
  AssistantResponse,
  ChatMessage,
  SearchProductsParams,
  AvailabilityMeta,
  RestockMeta,
} from "./types";
import {
  searchProducts,
  getProductDetails,
  getCollectionProducts,
  getSimilarProducts,
  getProductFilters,
  checkProductAvailabilityTool,
  getAvailableSizesTool,
  getAvailableColorsTool,
  getRecentlyViewedTool,
  getSearchHistoryTool,
  getRestockInformationTool,
  getPersonalizedRecommendationsTool,
  getComplementaryProductsTool,
  compareProductsTool,
  getCustomerPreferencesTool,
  semanticDiscoveryTool,
  getVerifiedOrderStatusTool,
} from "./tools";
import { parseCustomerQuery, buildConversationalResponse } from "./nlu";
import { subscribeRestockNotification } from "@/lib/inventory";
import { recordSearchQuery } from "@/lib/history";
import { compareGarments } from "./comparison-service";
import { getPersonalizedRecommendations } from "@/lib/recommendations/recommendation-service";
import { getComplementaryGarments } from "@/lib/recommendations/pairing-service";
import { executeSemanticDiscovery } from "./semantic-search";

const SYSTEM_PROMPT = `
You are the LOOMERA Atelier Fashion Consultant, an expert concierge assisting patrons with luxury menswear and boys' artisan clothing.
Guidelines:
- Maintain an elegant, warm, and sophisticated tone.
- Always recommend authentic garments fetched from the LOOMERA database tools.
- Never hallucinate products, prices, stock, or fabric compositions.
- Mention prices in Indian Rupees (₹) using standard Indian formatting.
- LOOMERA offers complimentary insured express shipping across India on all orders of ₹2,999 and above.
- Encourage patrons to inspect details, fabric care, and select their preferred size.
`;

/**
 * Executes a tool by name with validated parameters against PostgreSQL.
 */
export async function executeAssistantTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ products: AssistantProduct[]; meta?: unknown }> {
  switch (toolName) {
    case "search_products": {
      const prods = await searchProducts(args as SearchProductsParams);
      return { products: prods };
    }
    case "get_product_details": {
      const prod = await getProductDetails(String(args.identifier || args.id || args.slug || ""));
      return { products: prod ? [prod] : [] };
    }
    case "get_collection_products": {
      const prods = await getCollectionProducts(
        String(args.collection || "men"),
        typeof args.limit === "number" ? args.limit : 8
      );
      return { products: prods };
    }
    case "get_similar_products": {
      const prods = await getSimilarProducts(
        String(args.productId || args.id || ""),
        typeof args.limit === "number" ? args.limit : 4
      );
      return { products: prods };
    }
    case "get_product_filters": {
      const filters = await getProductFilters();
      return { products: [], meta: filters };
    }
    case "check_product_availability": {
      const avail = await checkProductAvailabilityTool({
        productId: String(args.productId || args.id || ""),
        size: typeof args.size === "string" ? args.size : undefined,
        color: typeof args.color === "string" ? args.color : undefined,
      });
      return { products: [], meta: avail };
    }
    case "get_available_sizes": {
      const sizes = await getAvailableSizesTool(String(args.productId || args.id || ""));
      return { products: [], meta: sizes };
    }
    case "get_available_colors": {
      const colors = await getAvailableColorsTool(String(args.productId || args.id || ""));
      return { products: [], meta: colors };
    }
    case "get_recently_viewed": {
      const views = await getRecentlyViewedTool({
        userId: typeof args.userId === "string" ? args.userId : null,
        sessionId: typeof args.sessionId === "string" ? args.sessionId : null,
        dateFilter: args.dateFilter as "today" | "yesterday" | "last_7_days" | "all" | undefined,
        limit: typeof args.limit === "number" ? args.limit : 5,
      });
      return { products: views.map((v) => v.product), meta: views };
    }
    case "get_search_history": {
      const searches = await getSearchHistoryTool({
        userId: typeof args.userId === "string" ? args.userId : null,
        sessionId: typeof args.sessionId === "string" ? args.sessionId : null,
        dateFilter: args.dateFilter as "today" | "yesterday" | "last_7_days" | "all" | undefined,
        queryFilter: typeof args.queryFilter === "string" ? args.queryFilter : undefined,
        limit: typeof args.limit === "number" ? args.limit : 5,
      });
      return { products: [], meta: searches };
    }
    case "get_restock_information": {
      const restock = await getRestockInformationTool({
        productId: String(args.productId || args.id || ""),
        size: typeof args.size === "string" ? args.size : undefined,
        color: typeof args.color === "string" ? args.color : undefined,
      });
      return { products: [], meta: restock };
    }
    case "get_personalized_recommendations": {
      const recs = await getPersonalizedRecommendationsTool(args);
      return { products: recs.map((r) => r.product), meta: recs };
    }
    case "get_complementary_products": {
      const comp = await getComplementaryProductsTool({
        productId: String(args.productId || args.id || ""),
        limit: typeof args.limit === "number" ? args.limit : 3,
      });
      return { products: comp.map((c) => c.product), meta: comp };
    }
    case "compare_products": {
      const compResult = await compareProductsTool({
        productIds: Array.isArray(args.productIds) ? (args.productIds as string[]) : [],
      });
      return { products: compResult ? compResult.products : [], meta: compResult };
    }
    case "get_customer_preferences": {
      const prefs = await getCustomerPreferencesTool({
        userId: typeof args.userId === "string" ? args.userId : null,
        sessionId: typeof args.sessionId === "string" ? args.sessionId : null,
      });
      return { products: [], meta: prefs };
    }
    case "semantic_discovery": {
      const disc = await semanticDiscoveryTool(args);
      return { products: disc.products, meta: disc };
    }
    case "get_order_status": {
      const orderInfo = await getVerifiedOrderStatusTool({
        userId: String(args.userId || ""),
        orderNumber: typeof args.orderNumber === "string" ? args.orderNumber : undefined,
        orderId: typeof args.orderId === "string" ? args.orderId : undefined,
      });
      return { products: [], meta: orderInfo };
    }
    default:
      console.warn(`Unknown tool requested: ${toolName}`);
      return { products: [] };
  }
}

/**
 * Attempts LLM invocation if an API key is available in the environment.
 */
async function tryLlmOrchestration(
  userQuery: string,
  history: ChatMessage[],
  activeFilters: AssistantFilters,
  patronName?: string,
  contextProductId?: string
): Promise<AssistantResponse | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return null; // Fall back to Curated NLU
  }

  try {
    if (geminiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const parsed = parseCustomerQuery(userQuery, activeFilters, contextProductId);
      let productsForContext: AssistantProduct[] = [];

      if (parsed.intent === "similar" && parsed.targetProductId) {
        productsForContext = await getSimilarProducts(parsed.targetProductId);
      } else {
        productsForContext = await searchProducts(parsed.searchParams);
      }

      const promptText = `
${SYSTEM_PROMPT}
Patron Name: ${patronName || "Guest"}
User Query: "${userQuery}"
Available matching garments from PostgreSQL database:
${JSON.stringify(
  productsForContext.map((p) => ({
    title: p.title,
    price: `₹${p.price}`,
    category: p.category,
    sizes: p.sizes,
    colors: p.colors,
    inStock: p.inStock,
    origin: p.origin,
  }))
)}

Respond with a concise, helpful, luxury concierge message (2-3 sentences). Do not mention that you received a JSON list.
`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        if (candidateText) {
          const suggestions = buildConversationalResponse(
            parsed,
            productsForContext.length,
            parsed.searchParams,
            patronName
          ).suggestions;

          return {
            message: candidateText,
            products: productsForContext,
            filters: parsed.searchParams,
            suggestions,
            providerMode: "llm",
          };
        }
      }
    }
  } catch (err) {
    console.warn("LLM invocation encountered error, falling back to curated NLU:", err);
  }

  return null;
}

/**
 * Resolves context product from chat history if not explicitly provided.
 */
function resolveContextProductFromHistory(history: ChatMessage[]): AssistantProduct | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.products && msg.products.length > 0) {
      return msg.products[0];
    }
  }
  return null;
}

/**
 * Main orchestrator: handles incoming chat queries, multi-turn state, and tool execution.
 */
export async function orchestrateAssistant(params: {
  query: string;
  history?: ChatMessage[];
  filters?: AssistantFilters;
  patronName?: string;
  userId?: string | null;
  sessionId?: string | null;
  contextProductId?: string;
}): Promise<AssistantResponse> {
  const {
    query,
    history = [],
    filters = {},
    patronName,
    userId,
    sessionId,
    contextProductId,
  } = params;

  // Resolve active product from history if not passed
  const historyProduct = resolveContextProductFromHistory(history);
  const activeProductId = contextProductId || historyProduct?.id;

  // 1. Try external LLM if configured
  const llmResult = await tryLlmOrchestration(
    query,
    history,
    filters,
    patronName,
    activeProductId
  );
  if (llmResult) {
    return llmResult;
  }

  // 2. High-precision Atelier Curated Fashion NLU Mode (100% deterministic, zero network dependency)
  const parsed = parseCustomerQuery(query, filters, activeProductId);

  // A. Product Comparison Intent
  if (parsed.intent === "compare") {
    const targetIds = parsed.compareProductIds || [activeProductId || "classic-linen-shirt", "textured-casual-shirt"];
    const compResult = await compareGarments(targetIds);

    if (compResult) {
      return {
        message: `${compResult.summary} ${compResult.differences[0] || ""} ${compResult.recommendationNote}`,
        products: compResult.products,
        filters,
        suggestions: [
          `Check sizes for ${compResult.products[0].title}`,
          `Check sizes for ${compResult.products[1].title}`,
          "Complete the look",
          "Clear filters",
        ],
        providerMode: "curated_nlu",
        comparison: compResult,
      };
    } else {
      const fallbackProds = await searchProducts({ limit: 2 });
      return {
        message: "Please specify at least two luxury garments from our catalog to compare.",
        products: fallbackProds,
        filters,
        suggestions: [
          "Compare Classic Linen Shirt and Textured Casual Shirt",
          "Compare Handloom Kurta and Classic Kurta",
          "Explore Linen Shirts",
        ],
        providerMode: "curated_nlu",
      };
    }
  }

  // B. Personalized Recommendations Intent
  if (parsed.intent === "recommend") {
    const recs = await getPersonalizedRecommendations({
      userId,
      sessionId: userId ? undefined : sessionId,
      limit: 4,
    });

    const prods = recs.map((r) => r.product);
    const primaryReason = recs.length > 0 ? recs[0].explanation : "Selected for your wardrobe";
    const msg = patronName
      ? `Based on your atelier taste, here are your personalized recommendations (${primaryReason}):`
      : `Here are our most celebrated artisan highlights recommended for your wardrobe (${primaryReason}):`;

    return {
      message: msg,
      products: prods,
      filters: {},
      suggestions: [
        "Under ₹2,000",
        "Pure Linen only",
        "Complete the look",
        "Show my recently viewed",
      ],
      providerMode: "curated_nlu",
      recommendations: recs.map((r) => ({
        product: r.product,
        score: r.score,
        explanation: r.explanation,
        reasons: r.reasons,
      })),
    };
  }

  // C. Complementary Products / "Complete the Look" Intent
  if (parsed.intent === "complementary") {
    const targetId = parsed.targetProductId || activeProductId || "classic-linen-shirt";
    const compList = await getComplementaryGarments(targetId, 3);
    const targetCard = await getProductDetails(targetId);

    const prods = compList.map((c) => c.product);
    const advice = compList.length > 0 ? compList[0].stylingAdvice : "Curated styling companions.";
    const title = targetCard ? targetCard.title : "this garment";

    return {
      message: `Styling recommendations to complete the look with the ${title}: ${advice}`,
      products: prods,
      filters,
      suggestions: [
        "Check available sizes",
        "Compare with other pieces",
        "View details",
        "Clear filters",
      ],
      providerMode: "curated_nlu",
      complementary: compList,
    };
  }

  // D. Availability Query
  if (parsed.intent === "availability") {
    const targetId = parsed.targetProductId || activeProductId || "classic-linen-shirt";
    const avail = await checkProductAvailabilityTool({
      productId: targetId,
      size: parsed.targetSize,
      color: parsed.targetColor,
    });

    const card = await getProductDetails(avail.productId);
    const productList = card ? [card] : [];

    let msg = "";
    const suggestions: string[] = [];

    if (!avail.isPublished || avail.status === "unavailable") {
      msg = avail.reason || `The requested garment is not available in our catalog.`;
      suggestions.push("Show Linen Shirts", "View Handloom Kurtas", "Clear filters");
    } else if (parsed.targetSize && parsed.targetColor) {
      if (avail.available) {
        msg = `Yes, the ${avail.title} is available in size ${parsed.targetSize} (${parsed.targetColor}). We have ${avail.matchingVariant?.stock} pieces handcrafted in stock.`;
        suggestions.push("Add to Bag", "View details", "Check other sizes");
      } else {
        msg = `The ${avail.title} in size ${parsed.targetSize} (${parsed.targetColor}) is currently out of stock. Would you like to be notified when it returns?`;
        suggestions.push(`Notify me when size ${parsed.targetSize} is available`, "View available sizes", "Explore similar shirts");
      }
    } else if (parsed.targetSize) {
      if (avail.available) {
        msg = `Yes, the ${avail.title} is available in size ${parsed.targetSize} in ${avail.availableColors.join(", ")}.`;
        suggestions.push(...avail.availableColors.map((c) => `${avail.title} in ${c}`), "View details");
      } else {
        msg = `Size ${parsed.targetSize} of the ${avail.title} is currently out of stock across all colors.`;
        suggestions.push(`Notify me when size ${parsed.targetSize} is available`, "View other sizes", "Show similar shirts");
      }
    } else if (parsed.targetColor) {
      if (avail.available) {
        msg = `The ${avail.title} in ${parsed.targetColor} is available in sizes ${avail.availableSizes.join(", ")}.`;
        suggestions.push(...avail.availableSizes.slice(0, 3).map((s) => `Size ${s}`), "View details");
      } else {
        msg = `The ${avail.title} in ${parsed.targetColor} is currently out of stock.`;
        suggestions.push("View other colors", "Show similar shirts");
      }
    } else {
      msg = `The ${avail.title} is in stock (${avail.totalStock} pieces). Available sizes: ${avail.availableSizes.join(", ")}; Available shades: ${avail.availableColors.join(", ")}.`;
      suggestions.push(...avail.availableSizes.slice(0, 3).map((s) => `Is size ${s} available?`), "View details");
    }

    const availMeta: AvailabilityMeta = {
      productId: avail.productId,
      title: avail.title,
      size: parsed.targetSize,
      color: parsed.targetColor,
      available: avail.available,
      status: avail.status,
      stock: avail.matchingVariant?.stock || avail.totalStock,
      availableSizes: avail.availableSizes,
      availableColors: avail.availableColors,
      matchingVariantId: avail.matchingVariant?.id,
      reason: avail.reason,
    };

    return {
      message: msg,
      products: productList,
      filters,
      suggestions: suggestions.slice(0, 4),
      providerMode: "curated_nlu",
      availability: availMeta,
    };
  }

  // E. Product View History Query
  if (parsed.intent === "view_history") {
    const viewItems = await getRecentlyViewedTool({
      userId,
      sessionId: userId ? undefined : sessionId,
      dateFilter: parsed.dateFilter,
      limit: parsed.historyLimit || 5,
    });

    const prods = viewItems.map((v) => v.product);
    let msg = "";
    if (prods.length > 0) {
      const filterLabel =
        parsed.dateFilter === "yesterday"
          ? "yesterday"
          : parsed.dateFilter === "today"
          ? "today"
          : "recently";
      msg = `Here are the ${prods.length} garments you viewed ${filterLabel} in our atelier:`;
    } else {
      msg = `You have no recorded product views for this period. Would you like to explore our classic linen shirts or boys' collection?`;
    }

    return {
      message: msg,
      products: prods,
      filters: {},
      suggestions: [
        "Show Linen Shirts under ₹2,000",
        "Boys' Collection",
        "Handloom Heritage",
        "What is your shipping policy?",
      ],
      providerMode: "curated_nlu",
      viewHistory: viewItems.map((v) => ({
        id: v.id,
        viewedAt: v.viewedAt.toISOString(),
        product: v.product,
      })),
    };
  }

  // F. Search History Query
  if (parsed.intent === "search_history") {
    const searchItems = await getSearchHistoryTool({
      userId,
      sessionId: userId ? undefined : sessionId,
      dateFilter: parsed.dateFilter,
      queryFilter: parsed.searchParams.query,
      limit: 5,
    });

    let msg = "";
    const suggestions: string[] = [];

    if (searchItems.length > 0) {
      msg = `Here are your recent inquiries across the atelier. Click any prompt below to explore matching pieces again:`;
      searchItems.forEach((s) => {
        if (!suggestions.includes(s.searchQuery)) {
          suggestions.push(s.searchQuery);
        }
      });
    } else {
      msg = `No previous searches found in your history. You can ask for pure linen shirts, artisan kurtas, or boys' tailoring.`;
      suggestions.push("Linen Shirts under ₹2,000", "Boys' Tailoring", "Pure Handloom Kurtas");
    }

    return {
      message: msg,
      products: [],
      filters: {},
      suggestions: suggestions.slice(0, 4),
      providerMode: "curated_nlu",
      searchHistory: searchItems.map((s) => ({
        id: s.id,
        searchQuery: s.searchQuery,
        filters: s.filters,
      })),
    };
  }

  // G. Repeat Search Query
  if (parsed.intent === "repeat_search") {
    const recentSearches = await getSearchHistoryTool({
      userId,
      sessionId: userId ? undefined : sessionId,
      limit: 1,
    });

    if (recentSearches.length > 0) {
      const lastSearch = recentSearches[0];
      const repeatFilters = (lastSearch.filters || {}) as AssistantFilters;
      const prods = await searchProducts({
        query: lastSearch.searchQuery,
        ...repeatFilters,
      });

      return {
        message: `Repeating your previous inquiry for "${lastSearch.searchQuery}":`,
        products: prods,
        filters: repeatFilters,
        suggestions: ["Under ₹2,000", "Clear filters", "View Details"],
        providerMode: "curated_nlu",
      };
    } else {
      const prods = await searchProducts({ limit: 4 });
      return {
        message: `I could not locate a previous search to repeat. Here are our current atelier highlights:`,
        products: prods,
        filters: {},
        suggestions: ["Linen Shirts under ₹2,000", "Boys' Tailoring", "Handloom Heritage"],
        providerMode: "curated_nlu",
      };
    }
  }

  // H. Restock Information Query
  if (parsed.intent === "restock_info") {
    const targetId = parsed.targetProductId || activeProductId || "classic-linen-shirt";
    const restock = await getRestockInformationTool({
      productId: targetId,
      size: parsed.targetSize,
      color: parsed.targetColor,
    });

    const card = await getProductDetails(targetId);
    const productList = card ? [card] : [];

    let msg = "";
    if (restock.hasRestockInfo) {
      msg = `For the ${restock.title}${parsed.targetSize ? ` (Size ${parsed.targetSize})` : ""}: ${restock.message}`;
    } else {
      msg = `For the ${restock.title}${parsed.targetSize ? ` (Size ${parsed.targetSize})` : ""}: An estimated restock date is not currently available. Would you like to subscribe to a restock alert?`;
    }

    const restockMeta: RestockMeta = {
      productId: restock.productId,
      title: restock.title,
      hasRestockInfo: restock.hasRestockInfo,
      expectedDate: restock.expectedDate,
      expectedQuantity: restock.expectedQuantity,
      message: restock.message,
    };

    return {
      message: msg,
      products: productList,
      filters,
      suggestions: [
        parsed.targetSize ? `Notify me when size ${parsed.targetSize} is available` : "Notify me when available",
        "Check available sizes",
        "Explore similar pieces",
      ],
      providerMode: "curated_nlu",
      restock: restockMeta,
    };
  }

  // I. Restock Notification Query
  if (parsed.intent === "restock_notify") {
    const targetId = parsed.targetProductId || activeProductId || "classic-linen-shirt";
    const card = await getProductDetails(targetId);
    const productList = card ? [card] : [];

    if (!userId) {
      return {
        message: `To receive restock alerts for the ${card?.title || "garment"}, please sign in to your LOOMERA patron account so we can notify you.`,
        products: productList,
        filters,
        suggestions: ["Sign In", "Show available sizes", "View similar shirts"],
        providerMode: "curated_nlu",
      };
    }

    // Authenticated user: find matching variant
    const avail = await checkProductAvailabilityTool({
      productId: targetId,
      size: parsed.targetSize,
      color: parsed.targetColor,
    });

    const targetVariant = avail.matchingVariant || avail.matchingVariants[0];

    if (!targetVariant) {
      return {
        message: `We could not identify the specific size/color combination for ${avail.title} to create a restock notification.`,
        products: productList,
        filters,
        suggestions: ["View available sizes", "Explore catalog"],
        providerMode: "curated_nlu",
      };
    }

    try {
      const variantId = "variantId" in targetVariant ? targetVariant.variantId : targetVariant.id;
      const sub = await subscribeRestockNotification(userId, variantId);
      const subMsg = sub.alreadyActive
        ? `You are already subscribed to restock alerts for ${avail.title} (${targetVariant.size} / ${targetVariant.color}). We will notify you when it returns.`
        : `Your restock alert subscription for ${avail.title} (${targetVariant.size} / ${targetVariant.color}) has been registered. You will be notified when it arrives.`;

      return {
        message: subMsg,
        products: productList,
        filters,
        suggestions: ["View my account", "Show other linen shirts", "Explore collection"],
        providerMode: "curated_nlu",
      };
    } catch {
      return {
        message: `We were unable to register your restock notification at this time. Please try again or check your account page.`,
        products: productList,
        filters,
        suggestions: ["Check available sizes", "Explore catalog"],
        providerMode: "curated_nlu",
      };
    }
  }

  // J. Standard Search / Semantic Discovery / Similar / Collections
  let products: AssistantProduct[] = [];

  if (parsed.intent === "similar" && parsed.targetProductId) {
    products = await getSimilarProducts(parsed.targetProductId);
  } else if (parsed.intent === "search") {
    // Check if semantic discovery parameters apply
    const hasComplexCriteria = Boolean(
      parsed.searchParams.fabric ||
      parsed.searchParams.color ||
      parsed.searchParams.size ||
      parsed.searchParams.maxPrice ||
      parsed.searchParams.minPrice ||
      parsed.searchParams.query
    );

    if (hasComplexCriteria) {
      const semanticResult = await executeSemanticDiscovery({
        query: parsed.searchParams.query,
        category: parsed.searchParams.category,
        fabric: parsed.searchParams.fabric,
        color: parsed.searchParams.color,
        size: parsed.searchParams.size,
        minPrice: parsed.searchParams.minPrice,
        maxPrice: parsed.searchParams.maxPrice,
        sort: parsed.searchParams.sort === "newest" ? "newest" : parsed.searchParams.sort === "price-asc" ? "price-asc" : parsed.searchParams.sort === "price-desc" ? "price-desc" : "relevance",
        limit: 10,
      });
      products = semanticResult.products;
    } else {
      products = await searchProducts(parsed.searchParams);
    }

    // Record search in background if search query exists
    if (parsed.searchParams.query || parsed.searchParams.fabric) {
      const searchQuery = parsed.searchParams.query || `${parsed.searchParams.fabric || ""} shirts`.trim();
      recordSearchQuery({
        query: searchQuery,
        filters: parsed.searchParams as Record<string, unknown>,
        userId,
        sessionId: userId ? undefined : sessionId,
      }).catch((err) => console.error("Search record error:", err));
    }
  } else if (parsed.intent === "reset") {
    products = [];
  } else {
    if (Object.keys(filters).length > 0) {
      products = await searchProducts(filters);
    } else {
      products = await searchProducts({ limit: 4 });
    }
  }

  const newFilters = parsed.intent === "reset" ? {} : parsed.searchParams;
  const { message, suggestions } = buildConversationalResponse(
    parsed,
    products.length,
    newFilters,
    patronName
  );

  return {
    message,
    products,
    filters: newFilters,
    suggestions,
    providerMode: "curated_nlu",
  };
}
