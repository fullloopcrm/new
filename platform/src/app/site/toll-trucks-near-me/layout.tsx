import type { Metadata } from "next";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/site/toll-trucks-near-me/_components/Header";
import { Footer } from "@/app/site/toll-trucks-near-me/_components/Footer";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ClientErrorMonitor from "@/components/monitoring/ClientErrorMonitor";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.tolltrucksnearme.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Toll Trucks Near Me | 24/7 Tow Truck Dispatch Nationwide | 30-Minute Arrival Option",
    template: "%s | Toll Trucks Near Me",
  },
  description:
    "24/7 tow truck dispatch nationwide. Flat upfront pricing — no surprise surcharges. 30-minute arrival option backed by a $50 auto-credit. Light-duty, medium-duty, and heavy-duty towing plus $75 flat roadside assistance. 900+ cities across all 50 states.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Toll Trucks Near Me",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <ConsentBanner />
        <ClientErrorMonitor slug="toll-trucks-near-me" />
      </body>
    </html>
  );
}
