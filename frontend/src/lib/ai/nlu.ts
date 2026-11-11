import { AssistantFilters, SearchProductsParams } from "./types";

export interface ParsedIntent {
  intent:
    | "search"
    | "details"
    | "collection"
    | "similar"
    | "complementary"
    | "compare"
    | "recommend"
    | "filters"
    | "shipping_info"
    | "greeting"
    | "reset"
    | "availability"
    | "view_history"
    | "search_history"
    | "repeat_search"
    | "restock_info"
    | "restock_notify"
    | "general_faq";
  searchParams: SearchProductsParams;
  targetProductId?: string;
  compareProductIds?: string[];
  targetCollection?: string;
  targetSize?: string;
  targetColor?: string;
  dateFilter?: "today" | "yesterday" | "last_7_days" | "all";
  historyLimit?: number;
  confidence: number;
}

export const KNOWN_PRODUCTS: Array<{ id: string; name: string; aliases: string[] }> = [
  { id: "classic-linen-shirt", name: "Classic Linen Shirt", aliases: ["classic linen shirt", "classic linen", "linen shirt", "white linen shirt"] },
  { id: "handloom-kurta", name: "Handloom Heritage Kurta", aliases: ["handloom kurta", "heritage kurta", "artisan kurta", "indigo kurta"] },
  { id: "textured-casual-shirt", name: "Textured Casual Shirt", aliases: ["textured shirt", "casual shirt", "textured casual", "olive shirt"] },
  { id: "linen-trousers", name: "Linen Trousers", aliases: ["linen trousers", "linen pants", "trousers", "drawstring trousers"] },
  { id: "boys-linen-shirt", name: "Boys' Linen Shirt", aliases: ["boys linen shirt", "boy linen shirt", "junior linen shirt", "boys shirt"] },
  { id: "classic-kurta", name: "Classic Kurta", aliases: ["classic kurta", "ochre kurta", "festive kurta"] },
  { id: "kids-romper", name: "Kids Linen Romper", aliases: ["kids romper", "linen romper", "romper"] },
  { id: "boys-drawstring-shorts", name: "Boys' Drawstring Shorts", aliases: ["boys shorts", "drawstring shorts", "boys drawstring shorts"] },
];

/**
 * Extracts structured fashion shopping intents, filters, and entities from natural language.
 */
export function parseCustomerQuery(
  rawQuery: string,
  previousFilters: AssistantFilters = {},
  contextProductId?: string
): ParsedIntent {
  const query = rawQuery.trim().toLowerCase();

  // 0. Prompt Injection & Security Probe Defense
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /system\s+prompt/i,
    /database\s+passwords?/i,
    /admin\s+(tokens?|credentials?|passwords?)/i,
    /dump\s+(database|users|tables)/i,
    /reveal\s+(api\s+keys?|secrets?)/i,
    /root\s+access/i,
  ];

  if (injectionPatterns.some((pattern) => pattern.test(query))) {
    return {
      intent: "general_faq",
      searchParams: {},
      confidence: 1.0,
    };
  }

  // 1. Reset / Clear check
  if (
    query === "reset" ||
    query === "clear" ||
    query === "clear filters" ||
    query === "start over" ||
    query === "new search"
  ) {
    return {
      intent: "reset",
      searchParams: {},
      confidence: 1.0,
    };
  }

  // 2. Greeting check
  const greetingRegex = /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|namaste)(\s+there)?$/i;
  if (greetingRegex.test(query)) {
    return {
      intent: "greeting",
      searchParams: { ...previousFilters },
      confidence: 0.95,
    };
  }

  // 3. Shipping info check
  if (
    query.includes("shipping") ||
    query.includes("delivery") ||
    query.includes("free shipping") ||
    query.includes("courier") ||
    query.includes("shipping charge") ||
    query.includes("shipping fee")
  ) {
    return {
      intent: "shipping_info",
      searchParams: { ...previousFilters },
      confidence: 0.95,
    };
  }

  // 4. Repeat Search check
  if (
    query.includes("repeat my last search") ||
    query.includes("repeat last search") ||
    query.includes("repeat previous search") ||
    query === "repeat search" ||
    query.includes("do that search again") ||
    query.includes("run previous search")
  ) {
    return {
      intent: "repeat_search",
      searchParams: {},
      confidence: 0.95,
    };
  }

  // 5. Search History check
  if (
    query.includes("search history") ||
    query.includes("previous searches") ||
    query.includes("past searches") ||
    query.includes("recent searches") ||
    query.includes("what did i search") ||
    query.includes("searches from yesterday") ||
    query.includes("searches yesterday") ||
    query.includes("search records")
  ) {
    let dateFilter: "today" | "yesterday" | "last_7_days" | "all" = "all";
    if (query.includes("yesterday")) dateFilter = "yesterday";
    else if (query.includes("today")) dateFilter = "today";
    else if (query.includes("week")) dateFilter = "last_7_days";

    let queryFilter: string | undefined;
    const matchSpecific = query.match(/(?:find|show|my)\s+([a-z\s]+?)\s+search(?:es)?/i);
    if (matchSpecific && matchSpecific[1]) {
      const q = matchSpecific[1].replace(/\b(previous|past|recent|my)\b/g, "").trim();
      if (q.length > 2) queryFilter = q;
    }

    return {
      intent: "search_history",
      searchParams: queryFilter ? { query: queryFilter } : {},
      dateFilter,
      confidence: 0.95,
    };
  }

  // 6. Product View / Browsing History check
  if (
    query.includes("viewed") ||
    query.includes("looked at") ||
    query.includes("seen recently") ||
    query.includes("browsing history") ||
    query.includes("products i saw") ||
    query.includes("recently viewed") ||
    query.includes("what did i look at") ||
    query.includes("what did i view")
  ) {
    let dateFilter: "today" | "yesterday" | "last_7_days" | "all" = "all";
    if (query.includes("yesterday")) dateFilter = "yesterday";
    else if (query.includes("today")) dateFilter = "today";
    else if (query.includes("week")) dateFilter = "last_7_days";

    let historyLimit = 5;
    const limitMatch = query.match(/(?:last|past)\s+(five|5|three|3|ten|10)\b/i);
    if (limitMatch && limitMatch[1]) {
      const w = limitMatch[1].toLowerCase();
      if (w === "5" || w === "five") historyLimit = 5;
      else if (w === "3" || w === "three") historyLimit = 3;
      else if (w === "10" || w === "ten") historyLimit = 10;
    }

    return {
      intent: "view_history",
      searchParams: {},
      dateFilter,
      historyLimit,
      confidence: 0.95,
    };
  }

  // 7. Product Comparison check
  if (
    query.startsWith("compare") ||
    query.includes("compare with") ||
    query.includes("compare between") ||
    query.includes("difference between") ||
    query.includes("versus") ||
    query.includes(" vs ")
  ) {
    const identifiedProducts: string[] = [];

    // Find all referenced known products in the query
    for (const kp of KNOWN_PRODUCTS) {
      if (query.includes(kp.id) || kp.aliases.some((alias) => query.includes(alias))) {
        if (!identifiedProducts.includes(kp.id)) {
          identifiedProducts.push(kp.id);
        }
      }
    }

    // If only 1 product identified in text but we have a contextProductId, pair them
    if (identifiedProducts.length === 1 && contextProductId && !identifiedProducts.includes(contextProductId)) {
      identifiedProducts.unshift(contextProductId);
    }

    // If 0 products identified and user says "compare these" or "compare shirts", fallback to default pair
    if (identifiedProducts.length === 0) {
      if (contextProductId) {
        identifiedProducts.push(contextProductId);
        // Find a comparison candidate
        const other = contextProductId === "classic-linen-shirt" ? "textured-casual-shirt" : "classic-linen-shirt";
        identifiedProducts.push(other);
      } else {
        identifiedProducts.push("classic-linen-shirt", "textured-casual-shirt");
      }
    } else if (identifiedProducts.length === 1) {
      const other = identifiedProducts[0] === "classic-linen-shirt" ? "textured-casual-shirt" : "classic-linen-shirt";
      identifiedProducts.push(other);
    }

    return {
      intent: "compare",
      compareProductIds: identifiedProducts,
      searchParams: {},
      confidence: 0.95,
    };
  }

  // 8. Personalized Recommendations check
  if (
    query.includes("recommend") ||
    query.includes("for me") ||
    query.includes("suggest something") ||
    query.includes("what should i buy") ||
    query.includes("personalized") ||
    query.includes("my taste") ||
    query.includes("picks for me")
  ) {
    return {
      intent: "recommend",
      searchParams: { ...previousFilters },
      confidence: 0.95,
    };
  }

  // 9. Complementary Styling / Complete the Look check
  if (
    query.includes("what goes with") ||
    query.includes("complete the look") ||
    query.includes("style with") ||
    query.includes("pair with") ||
    query.includes("wear with") ||
    query.includes("matching bottom") ||
    query.includes("matching top") ||
    query.includes("complementary") ||
    query.includes("outfit suggestion")
  ) {
    let targetId = contextProductId;
    for (const kp of KNOWN_PRODUCTS) {
      if (query.includes(kp.id) || kp.aliases.some((alias) => query.includes(alias))) {
        targetId = kp.id;
        break;
      }
    }

    return {
      intent: "complementary",
      targetProductId: targetId || "classic-linen-shirt",
      searchParams: {},
      confidence: 0.95,
    };
  }

  // 10. Extract Size and Color entities early
  let targetSize: string | undefined;
  const sizeMatch = query.match(
    /\b(?:size|in)\s+([sml]|xs|xxl|xl|[0-9]{1,2}(?:\s*yrs)?)\b/i
  );
  if (sizeMatch && sizeMatch[1]) {
    targetSize = sizeMatch[1].toUpperCase().trim();
  }

  let targetColor: string | undefined;
  const colors = [
    { name: "white", regex: /\b(white|pure white)\b/i },
    { name: "cream", regex: /\b(cream|ecru|ivory|off-white|off white|natural)\b/i },
    { name: "navy", regex: /\b(navy|blue|dark blue)\b/i },
    { name: "teal", regex: /\b(teal|cyan|seafoam)\b/i },
    { name: "terracotta", regex: /\b(terracotta)\b/i },
    { name: "rust", regex: /\b(rust|brick)\b/i },
    { name: "olive", regex: /\b(olive|green|sage)\b/i },
    { name: "charcoal", regex: /\b(charcoal|black|grey|gray)\b/i },
    { name: "ochre", regex: /\b(ochre|yellow|mustard|gold)\b/i },
  ];
  for (const c of colors) {
    if (c.regex.test(query)) {
      targetColor = c.name;
      break;
    }
  }

  // Identify target product if referenced by name or slug
  let detectedProductId: string | undefined = contextProductId;
  for (const kp of KNOWN_PRODUCTS) {
    if (query.includes(kp.id) || kp.aliases.some((alias) => query.includes(alias))) {
      detectedProductId = kp.id;
      break;
    }
  }

  // 11. Restock Notify check
  if (
    query.includes("notify me") ||
    query.includes("alert me") ||
    query.includes("notify when available") ||
    query.includes("tell me when")
  ) {
    return {
      intent: "restock_notify",
      targetProductId: detectedProductId,
      targetSize,
      targetColor,
      searchParams: {},
      confidence: 0.95,
    };
  }

  // 12. Restock Information check
  if (
    query.includes("when will") ||
    query.includes("when is") ||
    query.includes("restock") ||
    query.includes("come back") ||
    query.includes("available again") ||
    query.includes("back in stock")
  ) {
    return {
      intent: "restock_info",
      targetProductId: detectedProductId,
      targetSize,
      targetColor,
      searchParams: {},
      confidence: 0.95,
    };
  }

  // 13. Availability check
  const availabilityKeywords = [
    "available",
    "availability",
    "in stock",
    "out of stock",
    "do you have",
    "how many pieces",
    "how many available",
    "sizes are available",
    "colors are available",
    "what sizes",
    "which sizes",
  ];
  const isAvailabilityQuery = availabilityKeywords.some((kw) => query.includes(kw));

  if (isAvailabilityQuery) {
    return {
      intent: "availability",
      targetProductId: detectedProductId,
      targetSize,
      targetColor,
      searchParams: {},
      confidence: 0.95,
    };
  }

  // 14. Similar products check
  const similarMatch = query.match(
    /(?:similar to|like|resemble|alternatives? to|matching)\s+(?:the\s+)?([a-z0-9\-]+)/i
  );
  if (similarMatch && similarMatch[1]) {
    const rawTarget = similarMatch[1].trim();
    return {
      intent: "similar",
      targetProductId: rawTarget,
      searchParams: {},
      confidence: 0.9,
    };
  }
  if (query.includes("similar") || query.includes("show similar") || query.includes("find similar")) {
    return {
      intent: "similar",
      targetProductId: detectedProductId || "classic-linen-shirt",
      searchParams: {},
      confidence: 0.9,
    };
  }

  // Accumulate filters starting from previous state (Multi-turn progressive refinement)
  const params: SearchProductsParams = {
    ...previousFilters,
  };

  if (targetColor) params.color = targetColor;
  if (targetSize) params.size = targetSize;

  // 15. Price extraction
  const underPriceMatch = query.match(
    /(?:under|below|less than|max|up to|within)\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]+)?)/i
  );
  if (underPriceMatch && underPriceMatch[1]) {
    const priceVal = parseInt(underPriceMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(priceVal)) {
      params.maxPrice = priceVal;
    }
  }

  const abovePriceMatch = query.match(
    /(?:above|over|more than|min|starting at|from)\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]+)?)/i
  );
  if (abovePriceMatch && abovePriceMatch[1]) {
    const priceVal = parseInt(abovePriceMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(priceVal)) {
      params.minPrice = priceVal;
    }
  }

  const betweenPriceMatch = query.match(
    /between\s*(?:rs\.?|inr|₹)?\s*([0-9]+)\s*(?:and|to|-)\s*(?:rs\.?|inr|₹)?\s*([0-9]+)/i
  );
  if (betweenPriceMatch && betweenPriceMatch[1] && betweenPriceMatch[2]) {
    params.minPrice = parseInt(betweenPriceMatch[1], 10);
    params.maxPrice = parseInt(betweenPriceMatch[2], 10);
  }

  // 16. Sorting extraction
  if (query.includes("cheapest") || query.includes("lowest price") || query.includes("price low to high") || query.includes("affordable")) {
    params.sort = "price-asc";
  } else if (query.includes("highest price") || query.includes("price high to low") || query.includes("luxury") || query.includes("premium")) {
    params.sort = "price-desc";
  } else if (query.includes("newest") || query.includes("new arrival") || query.includes("latest") || query.includes("fresh")) {
    params.sort = "newest";
  }

  // 17. Category extraction
  if (/\b(boy|boys|boys'|young|youth|junior|son)\b/i.test(query)) {
    params.category = "boys";
  } else if (/\b(kid|kids|kids'|toddler|infant|romper)\b/i.test(query)) {
    params.category = "kids";
  } else if (/\b(handloom|heritage|artisan|kurta|kurtas|traditional|ethnic)\b/i.test(query)) {
    params.category = "handloom";
  } else if (/\b(men|mens|men's|gentlemen|man)\b/i.test(query)) {
    params.category = "men";
  }

  // 18. Fabric extraction
  if (/\b(linen|flax)\b/i.test(query)) {
    params.fabric = "linen";
  } else if (/\b(cotton)\b/i.test(query)) {
    params.fabric = "cotton";
  } else if (/\b(muslin)\b/i.test(query)) {
    params.fabric = "muslin";
  } else if (/\b(silk)\b/i.test(query)) {
    params.fabric = "silk";
  }

  // 19. Garment keyword extraction
  const garmentMatch = query.match(
    /\b(shirts?|trousers?|pants?|shorts?|kurtas?|rompers?|tops?|clothing|garments?)\b/i
  );
  if (garmentMatch && garmentMatch[1]) {
    const rawG = garmentMatch[1].toLowerCase();
    if (rawG.startsWith("shirt")) params.query = "shirt";
    else if (rawG.startsWith("trouser") || rawG.startsWith("pant")) params.query = "trouser";
    else if (rawG.startsWith("short")) params.query = "shorts";
    else if (rawG.startsWith("kurta")) params.query = "kurta";
    else if (rawG.startsWith("romper")) params.query = "romper";
  } else if (!params.fabric && !params.color && !params.category && !params.maxPrice) {
    const cleanResidual = query
      .replace(/\b(show|find|search|give|display|get|look|looking|for|me|i|need|want|please|some|the|a|an)\b/gi, "")
      .trim();
    if (cleanResidual.length > 2) {
      params.query = cleanResidual;
    }
  }

  return {
    intent: "search",
    searchParams: params,
    confidence: 0.85,
  };
}

/**
 * Builds conversational assistant responses and suggested follow-up chips.
 */
export function buildConversationalResponse(
  intent: ParsedIntent,
  resultCount: number,
  activeFilters: AssistantFilters,
  patronName?: string
): { message: string; suggestions: string[] } {
  const salutation = patronName ? `Welcome back, ${patronName}.` : "Welcome to LOOMERA.";

  if (intent.intent === "greeting") {
    return {
      message: `${salutation} I am your personal shopping consultant. How may I assist your wardrobe selection today? You can ask me to discover pure linen shirts, check product availability, compare garments, or view personalized recommendations.`,
      suggestions: [
        "Recommend pieces for me",
        "Compare Classic Linen Shirt with Textured Casual Shirt",
        "Show linen shirts under ₹2,000",
        "What is your shipping policy?",
      ],
    };
  }

  if (intent.intent === "general_faq") {
    return {
      message: `I am your LOOMERA fashion consultant dedicated exclusively to fine artisan menswear and youth tailoring. I can assist with garment discoveries, size availability, and wardrobe styling.`,
      suggestions: [
        "Recommend pieces for me",
        "Explore Linen Shirts",
        "Boys' Tailoring",
        "What is your shipping policy?",
      ],
    };
  }

  if (intent.intent === "shipping_info") {
    return {
      message: `At LOOMERA, we provide complimentary insured express delivery on all orders above ₹2,999 across India. For orders below ₹2,999, a standard artisan courier fee of ₹150 applies. All garments are delivered in bespoke plastic-free gift packaging.`,
      suggestions: [
        "Shop Linen Shirts",
        "View Men's Collection",
        "View Boys' Collection",
        "Find products under ₹2,000",
      ],
    };
  }

  if (intent.intent === "reset") {
    return {
      message: `Your shopping filters have been cleared. What would you like to explore across the LOOMERA atelier?`,
      suggestions: [
        "Men's Pure Linen",
        "Boys' Handloom Shorts",
        "Artisan Kurtas",
        "New Arrivals",
      ],
    };
  }

  if (intent.intent === "compare") {
    return {
      message: `Here is the side-by-side artisan comparison for the requested garments:`,
      suggestions: [
        "Which sizes are available?",
        "Complete the look",
        "Show similar linen shirts",
        "Clear filters",
      ],
    };
  }

  if (intent.intent === "recommend") {
    return {
      message: patronName
        ? `Based on your atelier taste and wardrobe history, here are your bespoke recommendations:`
        : `Here are our most celebrated artisan highlights recommended for your wardrobe:`,
      suggestions: [
        "Under ₹2,000",
        "Show Pure Linen only",
        "Complete the look",
        "Clear filters",
      ],
    };
  }

  if (intent.intent === "complementary") {
    return {
      message: `To complete your ensemble, our stylists recommend these pairing pieces:`,
      suggestions: [
        "Check available sizes",
        "Compare with other bottoms",
        "View details",
        "Clear filters",
      ],
    };
  }

  // Search results message
  if (resultCount === 0) {
    const filterDesc: string[] = [];
    if (activeFilters.fabric) filterDesc.push(activeFilters.fabric);
    if (activeFilters.color) filterDesc.push(activeFilters.color);
    if (activeFilters.query) filterDesc.push(activeFilters.query);
    if (activeFilters.maxPrice) filterDesc.push(`under ₹${activeFilters.maxPrice.toLocaleString("en-IN")}`);

    const descStr = filterDesc.length > 0 ? ` for ${filterDesc.join(" ")}` : "";
    return {
      message: `I could not locate any garments matching your exact specifications${descStr}. Consider broadening your criteria or exploring our curated collections.`,
      suggestions: [
        "Clear filters",
        "Show all Linen Shirts",
        "Explore Men's Wardrobe",
        "Explore Boys' Tailoring",
      ],
    };
  }

  // Successful search results
  const filterDesc: string[] = [];
  if (activeFilters.color) filterDesc.push(activeFilters.color);
  if (activeFilters.fabric) filterDesc.push(`${activeFilters.fabric}`);
  if (activeFilters.query) filterDesc.push(activeFilters.query);
  if (activeFilters.category) filterDesc.push(`in ${activeFilters.category}`);
  if (activeFilters.size) filterDesc.push(`in size ${activeFilters.size}`);
  if (activeFilters.maxPrice) filterDesc.push(`under ₹${activeFilters.maxPrice.toLocaleString("en-IN")}`);

  const criteriaText = filterDesc.length > 0 ? ` matching ${filterDesc.join(" ")}` : "";
  const countText = resultCount === 1 ? "1 exquisite piece" : `${resultCount} handcrafted pieces`;

  const suggestions: string[] = [];
  if (!activeFilters.maxPrice) suggestions.push("Under ₹2,000");
  if (!activeFilters.color) suggestions.push("Only White or Cream");
  if (!activeFilters.fabric && !activeFilters.query?.includes("linen")) suggestions.push("Pure Linen only");
  if (activeFilters.category !== "boys") suggestions.push("Boys' Collection");
  if (suggestions.length < 3) suggestions.push("Clear filters");

  return {
    message: `I found ${countText}${criteriaText} from our atelier catalog:`,
    suggestions: suggestions.slice(0, 4),
  };
}
