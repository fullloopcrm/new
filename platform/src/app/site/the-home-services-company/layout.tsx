import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteChromeHeader, SiteChromeFooter } from "@/app/site/the-home-services-company/_components/SiteChrome";
import { SiteSchema } from "@/app/site/the-home-services-company/_components/SiteSchema";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ClientErrorMonitor from "@/components/monitoring/ClientErrorMonitor";
import TenantAnalyticsScript from "@/components/analytics/TenantAnalyticsScript";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.thehomeservicescompany.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Home Services Co | 40 Home Services Starting at $99/Hour | 990 Cities Nationwide",
    template: "%s | Home Services Co",
  },
  description:
    "Home Services Co — 40 home services under one roof. HVAC, plumbing, electrical, painting, flooring, cleaning, handyman, and more. Starting at $99/hour, licensed and insured, same-day availability. 990 cities across all 50 states.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Home Services Co",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body antialiased">
        <SiteSchema />
        <SiteChromeHeader />
        <main>{children}</main>
        <SiteChromeFooter />
        <ConsentBanner />
        <ClientErrorMonitor slug="the-home-services-company" />
        <TenantAnalyticsScript slug="the-home-services-company" />
      </body>
    </html>
  );
}
