/**
 * LOOMERA — Schema.org JSON-LD Structured Data Generators
 * Generates verified rich snippets for Google Search: Product, Offer, BreadcrumbList, Organization.
 */

import { Product } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://loomera.com";

export function generateProductJsonLd(product: Product) {
  const productUrl = `${BASE_URL}/products/${product.id}`;
  const imageUrl = product.image.startsWith("http") ? product.image : `${BASE_URL}${product.image}`;

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: [imageUrl],
    description: product.desc,
    sku: product.id,
    mpn: `LMR-${product.id.toUpperCase()}`,
    brand: {
      "@type": "Brand",
      name: "LOOMERA",
    },
    material: "Natural European Flax Linen",
    countryOfOrigin: "IN",
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: product.price,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "LOOMERA",
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 15,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: product.price >= 2999 ? 0 : 250,
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "d",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "d",
          },
        },
      },
    },
  };
}

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LOOMERA",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: "Luxury menswear and young gentleman's tailoring sculpted strictly from raw linen, unbleached cotton, and heritage looms.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
      email: "concierge@loomera.com",
    },
  };
}
