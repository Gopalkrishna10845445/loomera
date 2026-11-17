import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { Feather, Droplets, Sun, Wind, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "The Editorial Guide to Pure Linen & Handloom Care | LOOMERA",
  description:
    "Master the art of preserving pure European flax linen and artisanal handloom fabrics. Expert washing guidelines, temperature control, and modern pressing techniques.",
  openGraph: {
    title: "The Editorial Guide to Pure Linen & Handloom Care | LOOMERA",
    description:
      "Expert textile preservation protocols for raw linen and handloom garments.",
    type: "article",
  },
};

export default function LinenCareGuidePage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The Editorial Guide to Pure Linen & Handloom Care",
    description:
      "Master the art of preserving natural European flax linen and handloom garments.",
    author: {
      "@type": "Organization",
      name: "LOOMERA Editorial",
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
    dateModified: "2026-11-17",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div className="min-h-screen bg-white flex flex-col font-futura">
        <Header />

        <main className="flex-1 py-10 sm:py-16">
          <article className="max-w-4xl mx-auto px-4 sm:px-8">
            {/* Header */}
            <div className="border-b border-[#E5E7EB] pb-10 mb-12 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#051A6E] text-white text-xs font-bold uppercase tracking-wider mb-6">
                <Feather className="w-3.5 h-3.5" />
                <span>TEXTILE LONGEVITY GUIDE</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-black leading-tight mb-4">
                THE CONNOISSEUR&apos;S GUIDE TO PURE LINEN &amp; HANDLOOM CARE
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 max-w-2xl mx-auto font-normal leading-relaxed">
                Natural fibres are living textiles. With mindful care, pure European flax linen softens with every wash, gaining a fluid drape that outlasts synthetic blends by decades.
              </p>
            </div>

            {/* Core Care Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
              <div className="p-6 bg-white border border-[#E5E7EB]">
                <Droplets className="w-6 h-6 text-[#051A6E] mb-3" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-black mb-2">Cool Water Wash</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Never exceed 30°C. High temperatures stress natural flax fibres and cause unwanted shrinkage. Use plant-based, pH-neutral detergents.
                </p>
              </div>

              <div className="p-6 bg-white border border-[#E5E7EB]">
                <Wind className="w-6 h-6 text-[#051A6E] mb-3" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-black mb-2">Gentle Agitation</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Select a delicate or hand-wash cycle with maximum 600 RPM spin. Ample water circulation prevents harsh fold creases.
                </p>
              </div>

              <div className="p-6 bg-white border border-[#E5E7EB]">
                <Sun className="w-6 h-6 text-[#051A6E] mb-3" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-black mb-2">Shade Line Drying</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Avoid tumble dryers entirely. Shake damp garments gently and dry flat or hang on wide wooden hangers away from direct sunlight.
                </p>
              </div>
            </div>

            {/* In-Depth Protocols */}
            <div className="space-y-8 text-gray-800 leading-relaxed text-xs sm:text-sm">
              <section>
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black mb-2">
                  1. THE ART OF EMBRACING NATURAL TEXTURE
                </h2>
                <p className="text-gray-600">
                  Linen is not meant to be stiffly starched like synthetic office shirts. The gentle, fluid drape of European flax is the hallmark of modern luxury and breathable comfort. For formal occasions, press the garment while still slightly damp using medium-high steam on the reverse side.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black mb-2">
                  2. PRESERVING HERITAGE HANDLOOM WEAVES
                </h2>
                <p className="text-gray-600">
                  Handloom kurtas and artisanal shirts feature manual shuttle textures that benefit from cold hand-immersion with gentle detergents. Never wring natural fibres; press gently between a clean towel to extract excess moisture before air drying.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black mb-2">
                  3. SEASONAL STORAGE PROTOCOLS
                </h2>
                <p className="text-gray-600">
                  Store garments in breathable unbleached cotton garment bags. Natural cedar blocks provide moth protection without chemical mothballs that can degrade natural cellulose fibres.
                </p>
              </section>
            </div>

            {/* Collection CTA Strip */}
            <div className="mt-14 p-8 bg-[#2D2D2D] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-[2px] text-gray-300">
                  LOOMERA ATELIER COLLECTION
                </span>
                <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white mt-1">
                  DISCOVER PURE LINEN SILHOUETTES
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Tailored strictly from 100% natural European flax and handloom threads.
                </p>
              </div>
              <Link
                href="/collections/men"
                className="btn-primary w-full sm:w-auto px-6 h-11 inline-flex items-center justify-center gap-2"
              >
                <span>SHOP MEN&apos;S COLLECTION</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </article>
        </main>

        <Footer />
        <CartDrawer />
        <SearchModal />
        <AiAssistantWidget />
      </div>
    </>
  );
}
