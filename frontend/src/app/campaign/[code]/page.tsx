import type { Metadata } from "next";
import { getCampaignByCode } from "@/lib/marketing/campaign-service";
import { getProductsFromDb } from "@/lib/products";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { Sparkles, Tag, ShieldCheck } from "lucide-react";

interface CampaignPageProps {
  params: Promise<{
    code: string;
  }>;
}

export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const resolved = await params;
  const campaign = await getCampaignByCode(resolved.code);

  if (!campaign) {
    return {
      title: "Exclusive Campaign — LOOMERA",
      description: "Discover curated artisanal menswear and young gentleman's tailoring.",
    };
  }

  return {
    title: `${campaign.name} — LOOMERA Private Edition`,
    description: campaign.bannerText || campaign.headline,
    openGraph: {
      title: campaign.headline,
      description: campaign.bannerText,
    },
  };
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const resolved = await params;
  const campaign = await getCampaignByCode(resolved.code);

  // Fallback to general showcase if specific campaign code isn't in database
  const headline = campaign?.headline || `The ${resolved.code.toUpperCase()} Showcase`;
  const bannerText = campaign?.bannerText || "Curated natural linen and Mulberry silk pieces tailored for timeless elegance.";
  const ctaCode = campaign?.code || resolved.code.toUpperCase();

  // Load curated products
  const products = await getProductsFromDb({ limit: 12 });

  return (
    <CartProvider>
      <div className="min-h-screen bg-surface flex flex-col selection:bg-secondary-fixed selection:text-on-secondary-fixed">
        <Header />

        <main className="flex-1">
          {/* Campaign Editorial Hero */}
          <section className="relative overflow-hidden bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-stone-100 py-20 px-6 sm:px-12 border-b border-stone-800">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#c5a880_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-800/80 border border-stone-700/60 text-xs font-mono tracking-widest text-[#C5A880] uppercase mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Special Acquisition Flight • {ctaCode}</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-stone-100 mb-6 leading-tight">
                {headline}
              </h1>

              <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto font-light leading-relaxed mb-8">
                {bannerText}
              </p>

              {/* Promo Voucher Pill */}
              <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-stone-800/60 border border-stone-700/60 backdrop-blur-md">
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <Tag className="w-4 h-4 text-[#C5A880]" />
                  <span>Use invitation code at checkout:</span>
                  <span className="font-mono font-bold text-[#C5A880] tracking-wider px-2 py-0.5 rounded bg-stone-900 border border-stone-700">
                    {ctaCode}
                  </span>
                </div>
                <div className="text-xs text-stone-400 border-t sm:border-t-0 sm:border-l border-stone-700 pt-2 sm:pt-0 sm:pl-4">
                  Complimentary express shipping across India included
                </div>
              </div>
            </div>
          </section>

          {/* Curated Garment Collection */}
          <section className="max-w-7xl mx-auto px-6 sm:px-12 py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-stone-200">
              <div>
                <span className="text-xs font-mono tracking-widest text-stone-500 uppercase">
                  Curated Catalog Selection
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 mt-1">
                  Artisanal Silhouettes
                </h2>
              </div>
              <p className="text-sm text-stone-500 mt-2 md:mt-0 font-light">
                Showing {products.length} bespoke garments eligible for campaign benefits
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Reassurance Banner */}
            <div className="mt-20 p-8 rounded-2xl bg-stone-100 border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-6 h-6 text-stone-700 mb-2" />
                <h4 className="font-serif text-base text-stone-900">100% Certified Natural Fibres</h4>
                <p className="text-xs text-stone-600 mt-1">European Flax & Bhagalpur Tussar Silk</p>
              </div>
              <div className="flex flex-col items-center border-t md:border-t-0 md:border-l md:border-r border-stone-200 pt-4 md:pt-0">
                <Sparkles className="w-6 h-6 text-stone-700 mb-2" />
                <h4 className="font-serif text-base text-stone-900">15-Day Return Privileges</h4>
                <p className="text-xs text-stone-600 mt-1">Hassle-free doorstep exchange & refunds</p>
              </div>
              <div className="flex flex-col items-center border-t md:border-t-0 border-stone-200 pt-4 md:pt-0">
                <Tag className="w-6 h-6 text-stone-700 mb-2" />
                <h4 className="font-serif text-base text-stone-900">Tiered Loyalty Accrual</h4>
                <p className="text-xs text-stone-600 mt-1">Earn points on every acquisition order</p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <CartDrawer />
        <SearchModal />
        <AiAssistantWidget />
      </div>
    </CartProvider>
  );
}
