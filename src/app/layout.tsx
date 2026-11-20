import type { Metadata } from "next";
import "./globals.css";
import Header, { BRAND } from "@/components/Header";
import Footer from "@/components/Footer";
import ConsentBanner from "@/components/ConsentBanner";

export const metadata: Metadata = {
  title: { default: `${BRAND} | Discover products & connect with businesses`, template: `%s | ${BRAND}` },
  description: "Discover products, compare offers and connect with verified businesses in East Africa.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" style={{ position: "absolute", left: -999 }}>Skip to content</a>
        <Header />
        <main id="main"><div className="wrap">{children}</div></main>
        <Footer />
        <ConsentBanner />
      </body>
    </html>
  );
}
