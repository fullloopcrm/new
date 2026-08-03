import type { Metadata } from "next";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/site/we-pay-you-junk/_components/Header";
import { Footer } from "@/app/site/we-pay-you-junk/_components/Footer";
import { JsonLd } from "@/app/site/we-pay-you-junk/_components/JsonLd";
import { localBusinessLd, websiteLd } from "@/app/site/we-pay-you-junk/_lib/schema";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ClientErrorMonitor from "@/components/monitoring/ClientErrorMonitor";
import TenantAnalyticsScript from "@/components/analytics/TenantAnalyticsScript";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.wepayyoujunkremoval.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "We Pay You Junk Removal | $200/hr Fully Inclusive +$100/hr Per Extra Laborer Nationwide | We Pay You For Your Stuff",
    template: "%s | We Pay You Junk Removal",
  },
  description:
    "America's only junk removal company that pays you. $200/hr (one team member, fully inclusive) +$100/hr per extra laborer with dump fees included, 1 hour minimum. We credit you 50% (when applicable) of resale value on items worth something. 900+ cities across all 50 states. Same-day available 7AM-8PM.",
  alternates: {
    canonical: "/",
  },
  applicationName: "We Pay You Junk Removal",
  authors: [{ name: "We Pay You Junk Removal" }],
  creator: "We Pay You Junk Removal",
  publisher: "We Pay You Junk Removal",
  keywords: [
    "junk removal",
    "junk removal near me",
    "furniture removal",
    "appliance removal",
    "estate cleanout",
    "same-day junk removal",
    "we pay you junk",
    "resale credit junk removal",
  ],
  openGraph: {
    type: "website",
    siteName: "We Pay You Junk Removal",
    title: "We Pay You Junk Removal | $200/hr Fully Inclusive +$100/hr Per Extra Laborer",
    description:
      "America's only junk removal company that pays you. $200/hr fully inclusive, dump fees included, and we credit you 50% of resale value on items worth something. 900+ cities, all 50 states.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "We Pay You Junk Removal | We Pay You For Your Stuff",
    description:
      "$200/hr fully inclusive junk removal that pays you back — 50% resale credit on valuable items. 900+ cities, all 50 states, same-day available.",
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
        <JsonLd data={[localBusinessLd(), websiteLd()]} />
        <Header />
        <main>{children}</main>
        <Footer />
        <ConsentBanner />
        <ClientErrorMonitor slug="we-pay-you-junk" />
        <TenantAnalyticsScript slug="we-pay-you-junk" />
      </body>
    </html>
  );
}
