/**
 * LOOMERA AI Shopping Assistant - Type Definitions
 */

export interface AssistantProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number;
  isOnSale?: boolean;
  category: string;
  image: string;
  badge?: string | null;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  origin?: string | null;
  fabricCare?: string | null;
}

export interface SearchProductsParams {
  query?: string;
  category?: string;
  fabric?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "featured";
  limit?: number;
}

export interface AssistantFilters {
  query?: string;
  category?: string;
  fabric?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "featured";
}

export interface AvailabilityMeta {
  productId: string;
  title: string;
  size?: string;
  color?: string;
  available: boolean;
  status: "in_stock" | "low_stock" | "out_of_stock" | "unavailable";
  stock?: number;
  availableSizes?: string[];
  availableColors?: string[];
  matchingVariantId?: string;
  reason?: string;
}

export interface RestockMeta {
  productId: string;
  title: string;
  hasRestockInfo: boolean;
  expectedDate?: string;
  expectedQuantity?: number;
  message: string;
}

export interface ComparisonAttribute {
  label: string;
  key: string;
  values: {
    productId: string;
    productTitle: string;
    displayValue: string;
    rawValue?: unknown;
  }[];
}

export interface GarmentComparisonResult {
  products: AssistantProduct[];
  attributes: ComparisonAttribute[];
  summary: string;
  differences: string[];
  recommendationNote: string;
}

export interface ScoredRecommendation {
  product: AssistantProduct;
  score: number;
  explanation: string;
  reasons: string[];
}

export interface ComplementaryRecommendation {
  product: AssistantProduct;
  pairingRole: string;
  stylingAdvice: string;
  inStock: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  products?: AssistantProduct[];
  filters?: AssistantFilters;
  suggestions?: string[];
  availability?: AvailabilityMeta;
  restock?: RestockMeta;
  comparison?: GarmentComparisonResult;
  recommendations?: ScoredRecommendation[];
  complementary?: ComplementaryRecommendation[];
  createdAt: number;
}

export interface AssistantResponse {
  message: string;
  products: AssistantProduct[];
  filters: AssistantFilters;
  suggestions: string[];
  providerMode: "llm" | "curated_nlu";
  availability?: AvailabilityMeta;
  restock?: RestockMeta;
  comparison?: GarmentComparisonResult;
  recommendations?: ScoredRecommendation[];
  complementary?: ComplementaryRecommendation[];
  searchHistory?: Array<{ id: string; searchQuery: string; filters: Record<string, unknown> }>;
  viewHistory?: Array<{ id: string; viewedAt: string; product: AssistantProduct }>;
}
