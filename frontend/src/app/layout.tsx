import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AttributionTracker } from "@/components/AttributionTracker";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-futura-web",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "LOOMERA — Editorial Linen & Handloom Fashion Commerce",
  description:
    "Premium men's and boys' linen and handloom fashion commerce. Pure European flax linen, heritage handloom kurtas, and modern gentleman tailoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={jost.variable}
    >
      <body className="bg-white font-sans text-black antialiased selection:bg-[#051A6E] selection:text-white overflow-x-hidden min-h-screen">
        <AuthProvider>
          <CartProvider>
            <AttributionTracker />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
