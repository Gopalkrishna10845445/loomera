import type { Metadata } from "next";
import { getCampaignByCode } from "@/lib/marketing/campaign-service";
import { getProductsFromDb } from "@/lib/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import SearchModal from "@/components/SearchModal";
import AiAssistantWidget from "@/components/assistant/AiAssistantWidget";
import { Sparkles, Tag, ShieldCheck, Truck, RefreshCw } from "lucide-react";

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
      description: "Discover curated menswear and young gentleman's tailoring.",
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
  const headline = campaign?.headline || `THE ${resolved.code.toUpperCase()} SHOWCASE`;
  const bannerText = campaign?.bannerText || "Curated natural linen and heritage handloom pieces tailored for timeless modern elegance.";
  const ctaCode = campaign?.code || resolved.code.toUpperCase();

  // Load curated products
  const products = await getProductsFromDb({ limit: 12 });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 w-full">
        {/* Campaign Editorial Hero */}
        <section className="relative overflow-hidden bg-[#2D2D2D] text-white py-16 sm:py-20 px-4 sm:px-8 border-b border-[#E5E7EB]">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#051A6E] text-white text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SPECIAL CAMPAIGN &bull; {ctaCode}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-white mb-4 leading-tight">
              {headline}
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed mb-6">
              {bannerText}
            </p>

            {/* Promo Voucher Box */}
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 bg-black/50 border border-gray-700">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white font-medium">
                <Tag className="w-4 h-4 text-[#051A6E]" />
                <span>Use code at checkout:</span>
                <span className="font-mono font-bold text-white tracking-wider px-2.5 py-1 bg-[#051A6E]">
                  {ctaCode}
                </span>
              </div>
              <div className="text-xs text-gray-300 border-t sm:border-t-0 sm:border-l border-gray-700 pt-2 sm:pt-0 sm:pl-4 uppercase tracking-wider font-bold">
                Free Express Delivery Included
              </div>
            </div>
          </div>
        </section>

        {/* Curated Garment Collection */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#E5E7EB]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#051A6E]">
                CURATED CAMPAIGN STYLES
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mt-1">
                ELIGIBLE PIECES
              </h2>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 md:mt-0">
              {products.length} {products.length === 1 ? "STYLE" : "STYLES"} IN THIS CAMPAIGN
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Reassurance Strip */}
          <div className="mt-16 p-8 bg-gray-50 border border-[#E5E7EB] grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-6 h-6 text-[#051A6E] mb-2" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-black">100% PURE FLAX &amp; HANDLOOM</h4>
              <p className="text-xs text-gray-500 mt-1">European Flax &amp; Authentic Loom Weaves</p>
            </div>
            <div className="flex flex-col items-center border-t md:border-t-0 md:border-l md:border-r border-[#E5E7EB] pt-4 md:pt-0">
              <RefreshCw className="w-6 h-6 text-[#051A6E] mb-2" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-black">15-DAY DOORSTEP RETURNS</h4>
              <p className="text-xs text-gray-500 mt-1">Free exchanges and swift refunds</p>
            </div>
            <div className="flex flex-col items-center border-t md:border-t-0 border-[#E5E7EB] pt-4 md:pt-0">
              <Truck className="w-6 h-6 text-[#051A6E] mb-2" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-black">EXPRESS INSURED SHIPPING</h4>
              <p className="text-xs text-gray-500 mt-1">Real-time airway tracking updates</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <CartDrawer />
      <SearchModal />
      <AiAssistantWidget />
    </div>
  );
}
