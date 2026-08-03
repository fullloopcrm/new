import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/app/site/the-nyc-seo/_components/Header";
import Footer from "@/app/site/the-nyc-seo/_components/Footer";
import { getOrganizationSchema, getWebsiteSchema, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ClientErrorMonitor from "@/components/monitoring/ClientErrorMonitor";
import TenantAnalyticsScript from "@/components/analytics/TenantAnalyticsScript";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The NYC SEO | NYC SEO Agency for Local Businesses",
    template: "%s | The NYC SEO",
  },
  description:
    "Full-service SEO agency in New York City. Local SEO, Google Maps, AI search optimization, and programmatic pages for service businesses across NYC, NJ, Long Island & Westchester.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "The NYC SEO",
  },
  twitter: {
    card: "summary_large_image",
    title: "The NYC SEO | NYC SEO Agency",
    description:
      "Full-service SEO agency in New York City. On-page, off-page, technical, local, and AI search optimization for service businesses. 25+ years experience.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(getWebsiteSchema()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(getOrganizationSchema()),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <ConsentBanner />
        <ClientErrorMonitor slug="the-nyc-seo" />
        <TenantAnalyticsScript slug="the-nyc-seo" />
      </body>
    </html>
  );
}
