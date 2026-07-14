import type { Metadata } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, websiteSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import Navbar from "@/app/site/landscaping-in-nyc/_components/Navbar";
import Footer from "@/app/site/landscaping-in-nyc/_components/Footer";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ConsentGate from "@/components/consent/ConsentGate";

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
  metadataBase: new URL("https://www.landscapinginnyc.com"),
  title: {
    default: "NYC Landscaping | Professional Landscaping Services in New York City",
    template: "%s | Landscaping In NYC",
  },
  description:
    "Professional NYC landscaping services including garden design, lawn care, hardscaping, and outdoor living spaces. Serving Manhattan, Brooklyn, Queens, Bronx, and Staten Island.",
  keywords: [
    "NYC landscaping",
    "landscaping in NYC",
    "New York City landscaping",
    "Manhattan landscaping",
    "Brooklyn landscaping",
    "Queens landscaping",
    "NYC garden design",
    "NYC lawn care",
    "NYC hardscaping",
    "outdoor living NYC",
  ],
  authors: [{ name: "Landscaping In NYC" }],
  creator: "Landscaping In NYC",
  publisher: "Landscaping In NYC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.landscapinginnyc.com",
    siteName: "Landscaping In NYC",
    title: "NYC Landscaping | Professional Landscaping Services in New York City",
    description:
      "Professional NYC landscaping services — garden design, lawn care, hardscaping, and outdoor living spaces for residential and commercial properties across all five boroughs.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Landscaping In NYC - Professional Landscaping Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Landscaping | Professional Landscaping Services in New York City",
    description:
      "Professional NYC landscaping services for residential and commercial properties across all five boroughs.",
    images: ["/og-image.jpg"],
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
    canonical: "https://www.landscapinginnyc.com",
  },
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
        <Navbar />
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
        <ConsentBanner privacyHref="/privacy-policy" />
      </body>
    </html>
  );
}
