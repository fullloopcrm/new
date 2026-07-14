import type { Metadata } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, websiteSchema, navigationSchema, howToSchema } from "@/app/site/stretch-ny/_lib/schema";
import Navbar from "@/app/site/stretch-ny/_components/Navbar";
import Footer from "@/app/site/stretch-ny/_components/Footer";
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
  metadataBase: new URL("https://www.stretchny.com"),
  title: {
    default: "Assisted Stretch Service NYC | $99/hr Mobile | Stretch NYC",
    template: "%s | Stretch NYC",
  },
  description:
    "NYC's #1 assisted stretch service. Certified therapists come to your home, office, hotel, or any location. $99/hr, 10% off weekly. Manhattan, Brooklyn, Queens, Bronx & Staten Island. Same-day available 7AM-10PM.",
  keywords: [
    "assisted stretch service",
    "assisted stretch service nyc",
    "mobile stretch service nyc",
    "nyc mobile stretching",
    "assisted stretching manhattan",
    "pnf stretching nyc",
    "corporate wellness stretching nyc",
    "hotel stretching service nyc",
    "stretch nyc",
    "flexibility therapy new york",
  ],
  authors: [{ name: "Stretch NYC" }],
  creator: "Stretch NYC",
  publisher: "Stretch NYC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.stretchny.com",
    siteName: "Stretch NYC",
    title: "Assisted Stretch Service NYC | $99/hr Mobile | Stretch NYC",
    description:
      "NYC's #1 assisted stretch service. Certified therapists come to you. $99/hr, 10% off weekly. Manhattan, Brooklyn, Queens, Bronx & Staten Island. Same-day.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Stretch NYC - Mobile Assisted Stretching Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stretch NYC | NYC Mobile Assisted Stretching Service",
    description:
      "Professional mobile assisted stretching across NYC. Certified therapists come to you. $99/session. Same-day available.",
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
    canonical: "https://www.stretchny.com",
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
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        <JsonLd data={navigationSchema} />
        <JsonLd data={howToSchema} />
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
