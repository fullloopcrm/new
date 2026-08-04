import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import LayoutShell from "@/app/site/nyc-mobile-salon/_components/LayoutShell";
import "./globals.css";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ClientErrorMonitor from "@/components/monitoring/ClientErrorMonitor";
import TenantAnalyticsScript from "@/components/analytics/TenantAnalyticsScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thenycmobilesalon.com"),
  authors: [{ name: "The NYC Mobile Salon" }],
  creator: "The NYC Mobile Salon",
  publisher: "The NYC Mobile Salon",
  title: {
    default: "The NYC Mobile Salon — Beauty Services Delivered to Your Door",
    template: "%s | The NYC Mobile Salon",
  },
  description:
    "Licensed beauty professionals come to you anywhere in NYC. Hair, nails, makeup, grooming & more across all 5 boroughs. Book your in-home appointment today.",
  openGraph: {
    title: "The NYC Mobile Salon — Beauty Services Delivered to Your Door",
    description:
      "Licensed beauty professionals come to you anywhere in NYC. Hair, nails, makeup, grooming & more across all 5 boroughs.",
    type: "website",
    url: "https://thenycmobilesalon.com",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "The NYC Mobile Salon — Mobile Beauty Services in NYC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The NYC Mobile Salon — Beauty Services Delivered to Your Door",
    description: "Licensed beauty professionals come to you anywhere in NYC. Hair, nails, makeup, grooming & more across all 5 boroughs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${playfair.variable} antialiased`}>
        <LayoutShell>{children}</LayoutShell>
        <ConsentBanner />
        <ClientErrorMonitor slug="nyc-mobile-salon" />
        <TenantAnalyticsScript slug="nyc-mobile-salon" />
      </body>
    </html>
  );
}
