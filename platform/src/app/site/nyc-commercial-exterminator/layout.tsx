import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Header from "@/app/site/nyc-commercial-exterminator/_components/Header";
import Footer from "@/app/site/nyc-commercial-exterminator/_components/Footer";
import Tracker from "@/app/site/nyc-commercial-exterminator/_components/Tracker";
import { getOrganizationSchema, getWebsiteSchema, SITE_URL } from "@/app/site/nyc-commercial-exterminator/_lib/seo";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "NYC Commercial Exterminator | Commercial Pest Control NYC | $249/hr Fully Inclusive",
    template: "%s | NYC Commercial Exterminator",
  },
  description:
    "NYC's commercial-only pest control & exterminator service. $249/hr fully inclusive — restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant treatment, documentation, all labor + products in the rate. No contracts. No deposits. Licensed & insured. Text 212-202-8545.",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "NYC Commercial Exterminator",
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Commercial Exterminator | Commercial Pest Control NYC",
    description:
      "NYC's commercial-only pest control & exterminator. $249/hr fully inclusive for restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant. Text 212-202-8545.",
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
  verification: {
    google: "DHh0Wvh84HnK8A_W9HX2f6gK3Gn1HrVOgey-Z4JMrqo",
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
        {GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        )}
        {CLARITY_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`,
            }}
          />
        )}
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
      <body className={`${inter.variable} font-sans antialiased bg-[#0A0A0A] text-white`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <Suspense fallback={null}>
          <Tracker />
        </Suspense>
        <Analytics />
        <SpeedInsights />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0);})();`,
          }}
        />
      </body>
    </html>
  );
}
