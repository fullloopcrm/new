// @ts-nocheck
import type { Metadata } from "next";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd, organizationSchema, websiteSchema } from "@/app/site/consortium-nyc/_lib/schema";
import Navbar from "@/app/site/consortium-nyc/_components/Navbar";
import Footer from "@/app/site/consortium-nyc/_components/Footer";

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
    default: "NYC Marketing Company | The NYC Marketing Company",
    template: "%s | The NYC Marketing Company",
  },
  description:
    "The NYC Marketing Company is a full-service NYC marketing company specializing in SEO, branding, web design, business development, and automation for local businesses in NYC, Long Island, and Westchester. Call/text (212) 202-9220.",
  keywords: [
    "nyc marketing company",
    "seo agency new york",
    "web design nyc",
    "branding agency new york city",
    "small business marketing nyc",
    "local seo new york",
    "affordable web design nyc",
    "seo company manhattan",
    "digital marketing long island",
    "web design westchester",
  ],
  authors: [{ name: "The NYC Marketing Company" }],
  creator: "The NYC Marketing Company",
  publisher: "The NYC Marketing Company",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.consortiumnyc.com",
    siteName: "The NYC Marketing Company",
    title: "NYC Marketing Company | The NYC Marketing Company",
    description:
      "Full-service NYC marketing company for local businesses in NYC, Long Island, and Westchester. SEO, web design, branding, and automation. Call/text (212) 202-9220.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "The NYC Marketing Company - NYC Marketing Company",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Marketing Company | The NYC Marketing Company",
    description:
      "Full-service NYC marketing company for local businesses. SEO, web design, branding, and automation. Call/text (212) 202-9220.",
    images: ["/og-image.jpg"],
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
        <GoogleAnalytics gaId="G-QN1ZPCL4NS" />
        {/* Rebrand announcement banner */}
        <div className="relative z-50 bg-teal-600 text-white text-center py-3 px-4 text-sm sm:text-base font-medium font-cta tracking-wide">
          Consortium NYC is now <strong>The NYC Marketing Company</strong>.{" "}
          <a
            href="https://www.thenycmarketingcompany.com"
            className="underline underline-offset-2 hover:text-teal-100 transition-colors"
          >
            Visit our new site &rarr;
          </a>
        </div>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Script id="tawk-to" strategy="afterInteractive">{`
          var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
          (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
          })();
        `}</Script>
      </body>
    </html>
  );
}
