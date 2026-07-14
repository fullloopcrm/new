import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/site/theroadsidehelper/_components/Header";
import { Footer } from "@/app/site/theroadsidehelper/_components/Footer";
import { localBusinessSchema, organizationSchema, webSiteSchema, graph } from "@/app/site/theroadsidehelper/_lib/schema";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ConsentGate from "@/components/consent/ConsentGate";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.theroadsidehelper.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "24/7 Roadside Assistance Near Me — $149/hr Flat Rate | The Roadside Helper",
    template: "%s",
  },
  description:
    "24/7 roadside assistance at flat $149/hr — jump-starts, flat tire changes, lockouts, fuel delivery, towing, winch-outs. No membership. 1-hour minimum. Call (888) 944-3001. 900+ cities, all 50 states.",
  keywords: [
    "roadside assistance near me",
    "24/7 roadside assistance",
    "jump start service",
    "flat tire change",
    "car lockout service",
    "fuel delivery",
    "tow truck service",
    "winch out recovery",
    "battery replacement on site",
    "motorcycle roadside",
    "RV roadside",
    "diesel roadside",
    "fleet roadside",
    "pay as you go roadside",
    "$149 per hour roadside",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "The Roadside Helper",
    title: "24/7 Roadside Assistance Near Me — $149/hr Flat | (888) 944-3001",
    description: "Jump-starts, flat tires, lockouts, fuel, tow, winch. Flat $149/hr, 24/7, no membership. Nationwide.",
    locale: "en_US",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "24/7 Roadside Assistance Near Me — $149/hr Flat",
    description: "Jump-starts, flat tires, lockouts, fuel, tow. Flat $149/hr. Call (888) 944-3001.",
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
  applicationName: "The Roadside Helper",
  authors: [{ name: "The Roadside Helper" }],
  category: "Roadside Assistance",
  formatDetection: { telephone: true, address: true, email: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: graph([organizationSchema(), webSiteSchema(), localBusinessSchema()]),
          }}
        />
      </head>
      <body className="font-body antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <ConsentGate>
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
        </ConsentGate>
        <ConsentBanner />
      </body>
    </html>
  );
}