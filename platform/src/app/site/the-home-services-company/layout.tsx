// @ts-nocheck
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import { SiteChromeHeader, SiteChromeFooter } from "@/app/site/the-home-services-company/_components/SiteChrome";
import { SiteSchema } from "@/app/site/the-home-services-company/_components/SiteSchema";

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
        <Script id="tawk-to" strategy="afterInteractive">
          {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
