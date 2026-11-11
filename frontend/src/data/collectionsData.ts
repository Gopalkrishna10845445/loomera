export interface CollectionConfig {
  key: "men" | "boys" | "handloom" | "new-arrivals";
  route: string;
  creativeDirection: string;
  eyebrow: string;
  headline: string;
  headlineBreak?: string;
  description: string;
  primaryCta: {
    label: string;
    targetId: string;
    actionType?: "scroll" | "filter";
    filterValue?: string;
  };
  secondaryCta: {
    label: string;
    targetId: string;
    actionType?: "scroll" | "filter";
    filterValue?: string;
  };
  heroImage: string;
  heroImageAlt: string;
  categories: string[];
  seoTitle: string;
  seoDescription: string;
  themeAccent: string;
}

export const COLLECTIONS_CONFIG: Record<string, CollectionConfig> = {
  men: {
    key: "men",
    route: "/collections/men",
    creativeDirection: "THE MODERN GENTLEMAN",
    eyebrow: "THE MODERN GENTLEMAN",
    headline: "Refined Essentials.",
    headlineBreak: "Effortless Style.",
    description:
      "Discover thoughtfully designed menswear, premium linen, and timeless essentials for every day.",
    primaryCta: {
      label: "SHOP ALL MEN",
      targetId: "products-grid",
      actionType: "filter",
      filterValue: "All Men",
    },
    secondaryCta: {
      label: "EXPLORE LINEN",
      targetId: "products-grid",
      actionType: "filter",
      filterValue: "Linen Shirts",
    },
    heroImage: "/assets/reference/col_men.jpg",
    heroImageAlt: "Gentleman in refined linen attire from LOOMERA Men's Collection",
    categories: [
      "All Men",
      "Linen Shirts",
      "Trousers",
      "Kurtas",
      "Casual Wear",
      "Co-ord Sets",
      "Festive Wear",
    ],
    seoTitle: "Men's Collection — Refined Essentials & Linen Wardrobe | LOOMERA",
    seoDescription:
      "Explore LOOMERA Men's Collection. Thoughtfully designed menswear, breathable 100% Normandy linen shirts, relaxed pleat trousers, and handloom kurtas for the modern gentleman.",
    themeAccent: "#264653",
  },
  boys: {
    key: "boys",
    route: "/collections/boys",
    creativeDirection: "LITTLE MOMENTS. TIMELESS STYLE.",
    eyebrow: "MADE FOR LITTLE ADVENTURES",
    headline: "Little Moments.",
    headlineBreak: "Timeless Style.",
    description:
      "Comfortable, thoughtfully designed clothing for every little adventure, family gathering, and special occasion.",
    primaryCta: {
      label: "SHOP EVERYDAY WEAR",
      targetId: "products-grid",
      actionType: "filter",
      filterValue: "Everyday Essentials",
    },
    secondaryCta: {
      label: "EXPLORE FESTIVE STYLES",
      targetId: "products-grid",
      actionType: "filter",
      filterValue: "Festive Wear",
    },
    heroImage: "/assets/reference/col_boys_smiling.jpg",
    heroImageAlt: "Young boy smiling in breathable linen shirt from LOOMERA Youth Collection",
    categories: [
      "All Boys",
      "Linen Shirts",
      "Everyday Essentials",
      "Traditional Kurtas",
      "Festive Wear",
      "Matching Outfits",
    ],
    seoTitle: "Boys' Collection — Natural Linen & Tailoring for Growing Explorers | LOOMERA",
    seoDescription:
      "Discover LOOMERA Boys' Collection. Ultra-gentle pre-washed linen, organic muslin rompers, and tailored drawstring shorts created for little moments and lasting comfort.",
    themeAccent: "#2A9D8F",
  },
  handloom: {
    key: "handloom",
    route: "/collections/handloom",
    creativeDirection: "TRADITION, WOVEN FOR TODAY",
    eyebrow: "CRAFTED WITH INTENTION",
    headline: "Rooted in Tradition.",
    headlineBreak: "Designed for Today.",
    description:
      "Explore handloom-inspired clothing that brings heritage, natural textures, and contemporary style together.",
    primaryCta: {
      label: "SHOP HANDLOOM",
      targetId: "products-grid",
      actionType: "filter",
      filterValue: "All Handloom",
    },
    secondaryCta: {
      label: "DISCOVER THE CRAFT",
      targetId: "craftsmanship-story",
      actionType: "scroll",
    },
    heroImage: "/assets/reference/col_handloom.jpg",
    heroImageAlt: "Artisanal handloom fabric and kurta styling from LOOMERA Heritage",
    categories: [
      "All Handloom",
      "Handloom Kurtas",
      "Handwoven Shirts",
      "Cotton Essentials",
      "Festive Collection",
      "Heritage Styles",
    ],
    seoTitle: "Handloom Heritage Collection — Artisanal Slub & Charkha Weaves | LOOMERA",
    seoDescription:
      "Explore LOOMERA Handloom Collection. Rich terracotta and peacock teal handloom kurtas loomed by heritage artisan guilds with pure breathable cotton and slub yarns.",
    themeAccent: "#E76F51",
  },
  "new-arrivals": {
    key: "new-arrivals",
    route: "/collections/new-arrivals",
    creativeDirection: "THE LATEST FROM LOOMERA",
    eyebrow: "JUST ARRIVED",
    headline: "New Season.",
    headlineBreak: "New Essentials.",
    description:
      "Discover the latest additions to the LOOMERA wardrobe.",
    primaryCta: {
      label: "EXPLORE ALL NEW",
      targetId: "products-grid",
      actionType: "scroll",
    },
    secondaryCta: {
      label: "FILTER BY FIT & COLOR",
      targetId: "filter-bar",
      actionType: "scroll",
    },
    heroImage: "/assets/reference/hero_model.jpg",
    heroImageAlt: "Gentleman presenting new season linen essentials from LOOMERA",
    categories: [
      "All Products",
      "Men",
      "Boys",
      "Handloom",
    ],
    seoTitle: "New Arrivals — Fresh Silhouettes & Seasonal Linen Drops | LOOMERA",
    seoDescription:
      "Shop the latest arrivals from LOOMERA. Browse new cuts in French linen, soft Baltic boyswear, and hand-loomed festive kurtas with instant filtering and sorting.",
    themeAccent: "#264653",
  },
};
