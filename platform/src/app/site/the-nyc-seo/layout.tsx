// @ts-nocheck
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@/app/globals.css";
import Header from "@/app/site/the-nyc-seo/_components/Header";
import Footer from "@/app/site/the-nyc-seo/_components/Footer";
import { getOrganizationSchema, getWebsiteSchema, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

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
            __html: JSON.stringify(getWebsiteSchema()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getOrganizationSchema()),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
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
