// @ts-nocheck
import type { Metadata } from "next";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd, organizationSchema, websiteSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import Navbar from "@/app/site/the-nyc-marketing-company/_components/Navbar";
import Footer from "@/app/site/the-nyc-marketing-company/_components/Footer";
import Analytics from "@/app/site/the-nyc-marketing-company/_components/Analytics";

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
  metadataBase: new URL("https://www.thenycmarketingcompany.com"),
  title: {
    default: "NYC Marketing Company | SEO, Web Design & Branding",
    template: "%s",
  },
  description:
    "The best organic marketing company in NYC. SEO, branding, web design, business development, and automation for local businesses in NYC, Long Island, and Westchester. Pricing starting at $100/hr. Call/text 212.202.9220.",
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
    url: "https://www.thenycmarketingcompany.com",
    siteName: "The NYC Marketing Company",
    title: "NYC Marketing Company | SEO, Web Design & Branding",
    description:
      "The best organic marketing company in NYC. SEO, web design, branding, and automation for local businesses. Pricing starting at $100/hr. Call/text 212.202.9220.",
    images: [
      {
        url: "https://www.thenycmarketingcompany.com/opengraph-image",
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
    creator: "@thenycmarketingco",
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
    canonical: "https://www.thenycmarketingcompany.com",
  },
  verification: { google: "ASP01LqhFjYKzlnrerNtCOxLMxBRDqEHLccndDy8-QI" },
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
        <Analytics />
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
