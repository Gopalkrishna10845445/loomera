import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#264653] flex flex-col justify-between selection:bg-[#2A9D8F]/20">
      {/* Atelier Minimal Header */}
      <header className="border-b border-[#ECEBE4] py-6 px-8 text-center bg-white/50 backdrop-blur-sm">
        <Link
          href="/"
          className="font-serif text-2xl font-bold tracking-[0.2em] text-[#264653] uppercase hover:text-[#2A9D8F] transition-colors"
        >
          L O O M E R A
        </Link>
        <p className="text-[10px] tracking-[0.25em] text-[#2A9D8F] uppercase mt-1 font-semibold">
          Bespoke Men&apos;s &amp; Young Gentleman&apos;s Atelier
        </p>
      </header>

      {/* Main 404 Visual Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#264653]/5 border border-[#264653]/15 flex items-center justify-center text-[#264653]">
            <Compass className="w-8 h-8 stroke-[1.5]" />
          </div>

          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#2A9D8F] block mb-2">
            Error 404 &bull; Uncharted Route
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#264653] mb-4">
            Piece Not Found in the Atelier
          </h1>

          <p className="text-[#474741] text-sm leading-relaxed mb-8">
            The sartorial piece or archive volume you are seeking has either been retired, renamed, or temporarily tucked away in our textile storehouse.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/collections"
              className="inline-flex items-center justify-center gap-2 bg-[#264653] hover:bg-[#1D353F] text-white px-6 py-3 rounded-none text-xs uppercase tracking-widest font-semibold transition-all shadow-sm"
            >
              Browse Collections
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 border border-[#264653]/30 hover:bg-[#264653]/5 text-[#264653] px-6 py-3 rounded-none text-xs uppercase tracking-widest font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return Home
            </Link>
          </div>
        </div>
      </main>

      {/* Atelier Footer */}
      <footer className="border-t border-[#ECEBE4] py-6 px-8 text-center text-xs text-[#8A8A82]">
        &copy; {new Date().getFullYear()} LOOMERA Atelier. Architectural Handloom Tailoring.
      </footer>
    </div>
  );
}
