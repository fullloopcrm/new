import type { Metadata } from "next";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd, organizationSchema, websiteSchema } from "@/app/site/consortium-nyc/_lib/schema";
import Navbar from "@/app/site/consortium-nyc/_components/Navbar";
import Footer from "@/app/site/consortium-nyc/_components/Footer";
import { PartnerBanner } from "@/app/site/consortium-nyc/_lib/brand";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ClientErrorMonitor from "@/components/monitoring/ClientErrorMonitor";
import TenantAnalyticsScript from "@/components/analytics/TenantAnalyticsScript";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.consortiumnyc.com"),
  title: {
    default: "NYC Web Design & Website Design Company | Consortium NYC",
    template: "%s | Consortium NYC",
  },
  description:
    "Consortium NYC is a NYC web design & website design company building custom, high-performance, SEO-ready websites for businesses across NYC, Long Island, and Westchester. Now partnered with The NYC Marketing Co. Call/text (212) 202-9220.",
  keywords: [
    "nyc web design",
    "nyc website design",
    "web design nyc",
    "website design nyc",
    "web design company nyc",
    "website design company new york",
    "custom web design nyc",
    "nyc web designer",
    "affordable web design nyc",
    "small business web design nyc",
    "web design manhattan",
    "web design long island",
    "web design westchester",
  ],
  authors: [{ name: "Consortium NYC" }],
  creator: "Consortium NYC",
  publisher: "Consortium NYC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.consortiumnyc.com",
    siteName: "Consortium NYC",
    title: "NYC Web Design & Website Design Company | Consortium NYC",
    description:
      "Custom NYC web design & website design that ranks and converts. High-performance, SEO-ready websites for businesses across NYC, Long Island, and Westchester. Now partnered with The NYC Marketing Co. Call/text (212) 202-9220.",
    images: [
      {
        url: "/og-consortium.jpg",
        width: 1200,
        height: 630,
        alt: "Consortium NYC - NYC Web Design Company",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Web Design & Website Design Company | Consortium NYC",
    description:
      "Custom NYC web design & website design that ranks and converts. SEO-ready websites for local businesses across NYC, Long Island & Westchester. Call/text (212) 202-9220.",
    images: ["/og-consortium.jpg"],
    creator: "@consortiumnyc",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.consortiumnyc.com",
  },
  // verification: { google: "ADD_REAL_CODE_FROM_SEARCH_CONSOLE" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable} ${jetbrains.variable}`}
    >
      <head>
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
      </head>
      <body className="font-body antialiased">
        <PartnerBanner />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <ConsentBanner privacyHref="/privacy-policy" />
        <ClientErrorMonitor slug="consortium-nyc" />
        <TenantAnalyticsScript slug="consortium-nyc" />
      </body>
    </html>
  );
}
