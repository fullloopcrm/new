// @ts-nocheck
import type { Metadata } from "next";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, websiteSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import Navbar from "@/app/site/the-nyc-interior-designer/_components/Navbar";
import Footer from "@/app/site/the-nyc-interior-designer/_components/Footer";

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
  metadataBase: new URL("https://www.thenycinteriordesigner.com"),
  title: {
    default: "NYC Interior Designer | Professional Interior Design Services in New York City",
    template: "%s | The NYC Interior Designer",
  },
  description:
    "Professional NYC interior design services including full home design, kitchen and bathroom remodels, space planning, and commercial interiors. Serving Manhattan, Brooklyn, Queens, Bronx, Staten Island, and beyond.",
  keywords: [
    "NYC interior designer",
    "interior design NYC",
    "New York City interior design",
    "Manhattan interior designer",
    "Brooklyn interior designer",
    "Queens interior designer",
    "NYC kitchen design",
    "NYC bathroom design",
    "NYC space planning",
    "commercial interior design NYC",
  ],
  authors: [{ name: "The NYC Interior Designer" }],
  creator: "The NYC Interior Designer",
  publisher: "The NYC Interior Designer",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.thenycinteriordesigner.com",
    siteName: "The NYC Interior Designer",
    title: "NYC Interior Designer | Professional Interior Design Services in New York City",
    description:
      "Professional NYC interior design services — full home design, kitchen and bathroom remodels, space planning, and commercial interiors for residential and commercial properties across all five boroughs.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "The NYC Interior Designer - Professional Interior Design Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Interior Designer | Professional Interior Design Services in New York City",
    description:
      "Professional NYC interior design services for residential and commercial properties across all five boroughs.",
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
    canonical: "https://www.thenycinteriordesigner.com",
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
        <script
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
