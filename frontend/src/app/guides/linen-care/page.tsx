import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { Feather, Droplets, Sun, Wind } from "lucide-react";

export const metadata: Metadata = {
  title: "The Connoisseur's Guide to Pure Linen & Heritage Silk Care | LOOMERA",
  description:
    "Master the art of preserving natural European flax linen and unbleached silk. Expert temperature guidelines, organic washing secrets, and architectural pressing techniques.",
  openGraph: {
    title: "The Connoisseur's Guide to Pure Linen & Silk Care | LOOMERA",
    description:
      "Expert textile preservation protocols for raw linen and handloom silk garments.",
    type: "article",
  },
};

export default function LinenCareGuidePage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The Connoisseur's Guide to Pure Linen & Heritage Silk Care",
    description:
      "Master the art of preserving natural European flax linen and unbleached silk garments.",
    author: {
      "@type": "Organization",
      name: "LOOMERA Atelier",
    },
    publisher: {
      "@type": "Organization",
      name: "LOOMERA",
      logo: {
        "@type": "ImageObject",
        url: "https://loomera.com/logo.png",
      },
    },
    datePublished: "2026-11-01",
    dateModified: "2026-11-05",
  };

  return (
    <CartProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div className="min-h-screen bg-[#faf7f2] flex flex-col selection:bg-secondary-fixed selection:text-on-secondary-fixed">
        <Header />

        <main className="flex-1 pt-28 sm:pt-36 pb-20">
          <article className="max-w-4xl mx-auto px-6 sm:px-12">
            {/* Header */}
            <div className="border-b border-stone-200 pb-10 mb-12 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 text-stone-700 text-xs font-mono uppercase tracking-widest mb-6">
                <Feather className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span>Textile Longevity Protocols</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl text-[#264653] font-light tracking-tight leading-tight mb-6">
                The Connoisseur&apos;s Guide to Pure Linen &amp; Silk Care
              </h1>
              <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto font-light leading-relaxed">
                Natural fibres are living textiles. With mindful care, European flax linen softens with age, gaining an architectural patina that outlives synthetic fashion by decades.
              </p>
            </div>

            {/* Core Care Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="p-6 rounded-xs bg-white border border-stone-200/80 shadow-xs">
                <Droplets className="w-6 h-6 text-[#2A9D8F] mb-3" />
                <h3 className="font-serif text-lg text-stone-900 mb-2">Cool Water Wash</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Never exceed 30°C. High temperatures stress unbleached flax fibres and cause unwanted shrinkage. Use plant-based, pH-neutral detergents.
                </p>
              </div>

              <div className="p-6 rounded-xs bg-white border border-stone-200/80 shadow-xs">
                <Wind className="w-6 h-6 text-[#2A9D8F] mb-3" />
                <h3 className="font-serif text-lg text-stone-900 mb-2">Gentle Agitation</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Select a delicate wool or hand-wash cycle with maximum 600 RPM spin. Ample water circulation prevents hard crease creasing.
                </p>
              </div>

              <div className="p-6 rounded-xs bg-white border border-stone-200/80 shadow-xs">
                <Sun className="w-6 h-6 text-[#2A9D8F] mb-3" />
                <h3 className="font-serif text-lg text-stone-900 mb-2">Shade Line Drying</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Avoid tumble dryers entirely. Shake damp garments and dry flat or hang on wide wooden contoured hangers away from direct midday sun.
                </p>
              </div>
            </div>

            {/* In-Depth Protocols */}
            <div className="space-y-10 text-stone-800 leading-relaxed font-light text-sm sm:text-base">
              <section>
                <h2 className="font-serif text-2xl text-[#264653] font-normal mb-4">
                  1. The Art of Embracing Natural Creases
                </h2>
                <p>
                  True connoisseurs recognize that linen is not meant to be stiffly starched like polyester blends. The gentle, fluid rumple of natural European flax is the hallmark of quiet luxury and breathable ease. For formal occasions, press the garment while still slightly damp using medium-high steam on the reverse side.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-[#264653] font-normal mb-4">
                  2. Preserving Heritage Mulberry &amp; Tussar Silk
                </h2>
                <p>
                  Handloom silk kurtas and ceremonial waistcoats require dry-cleaning by eco-conscious specialists, or cold hand-immersion with silk-safe botanical wash. Never wring silk fibres; roll gently inside a plush cotton towel to extract moisture before flat-drying.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-[#264653] font-normal mb-4">
                  3. Seasonal Wardrobe Storage
                </h2>
                <p>
                  Store garments in breathable unbleached muslin garment bags. Cedar blocks or organic lavender sachets provide natural moth repellency without chemical mothballs that damage natural cellulose and protein fibres.
                </p>
              </section>
            </div>

            {/* Curated Silhouette Cross-Sell */}
            <div className="mt-16 p-8 rounded-xs bg-gradient-to-r from-stone-900 to-stone-950 text-stone-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#C5A880]">
                  Atelier Heritage Collection
                </span>
                <h3 className="font-serif text-2xl text-stone-100 mt-1">
                  Discover Our Pure Linen Silhouettes
                </h3>
                <p className="text-xs text-stone-300 font-light mt-1">
                  Tailored strictly from 100% Normandy flax and unbleached yarns.
                </p>
              </div>
              <Link
                href="/collections/men"
                className="shrink-0 px-6 py-3.5 rounded-full bg-[#E76F51] hover:bg-[#d85e40] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors"
              >
                <span>Shop Men&apos;s Atelier &rarr;</span>
              </Link>
            </div>
          </article>
        </main>

        <Footer />
        <CartDrawer />
        <SearchModal />
        <AiAssistantWidget />
      </div>
    </CartProvider>
  );
}
