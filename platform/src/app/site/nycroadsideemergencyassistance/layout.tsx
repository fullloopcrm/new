// @ts-nocheck
import type { Metadata } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/site/nycroadsideemergencyassistance/_components/Header";
import { Footer } from "@/app/site/nycroadsideemergencyassistance/_components/Footer";
import { MobileStickyBar } from "@/app/site/nycroadsideemergencyassistance/_components/MobileStickyBar";
import { JsonLd, organizationSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.nycroadsideemergencyassistance.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NYC Roadside Emergency Assistance — Jump Starts, Lockouts, Flat Tires, Tow Trucks | $149/hr, $25 Off Online",
    template: "%s | NYC Roadside Emergency Assistance",
  },
  description:
    "24/7 roadside emergency assistance across all 5 NYC boroughs — jump starts, lockouts, flat tires, fuel delivery, accident recovery, winch-outs and full towing. One rate for every service: $149/hour, 1-hour minimum. Book online and your first hour is $124 — $25 off, no catches. No NYC surcharge, no after-hours markup. 20–40 min arrival. Call (212) 470-4068.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "NYC Roadside Emergency Assistance",
    locale: "en_US",
    url: SITE_URL,
    title: "NYC Roadside Emergency Assistance — 24/7 Jump Start, Lockout, Tire, Tow",
    description: "Stranded in NYC? 24/7 roadside emergency — jump starts, lockouts, flat tires, fuel, towing, accident recovery. One rate: $149/hour, 1-hour min. Book online: $124 first hour. All 5 boroughs.",
    images: [
      {
        url: "/icon",
        width: 1200,
        height: 630,
        alt: "NYC Roadside Emergency Assistance — $149/hour, $25 off online, no catches",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Roadside Emergency Assistance — Jump, Lockout, Tire, Tow 24/7",
    description: "Stranded in NYC? 24/7 roadside help — jump starts, lockouts, flat tires, fuel, towing. $149/hr, $25 off online. All 5 boroughs. (212) 470-4068.",
    images: ["/icon"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  authors: [{ name: "NYC Roadside Emergency Assistance", url: SITE_URL }],
  publisher: "NYC Roadside Emergency Assistance",
  category: "Towing & Roadside Assistance",
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  other: {
    "geo.region": "US-NY",
    "geo.placename": "New York City",
    "geo.position": "40.7128;-74.0060",
    "ICBM": "40.7128, -74.0060",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body antialiased">
        <JsonLd schema={organizationSchema()} />
        <Header />
        <main className="pb-20 lg:pb-0">{children}</main>
        <Footer />
        <MobileStickyBar />
        <Script
          id="tawk-to"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}