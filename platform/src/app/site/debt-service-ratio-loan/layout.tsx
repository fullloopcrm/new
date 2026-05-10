// @ts-nocheck
import type { Metadata } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, websiteSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import Navbar from "@/app/site/debt-service-ratio-loan/_components/Navbar";
import Footer from "@/app/site/debt-service-ratio-loan/_components/Footer";

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
  metadataBase: new URL("https://www.debtserviceratioloan.com"),
  title: {
    default: "DSCR Loans | Debt Service Coverage Ratio Loan Guide",
    template: "%s | DebtServiceRatioLoan.com",
  },
  description:
    "Expert DSCR loan guides, calculators, and lender connections for real estate investors. 650+ cities. No income verification.",
  keywords: [
    "dscr loan",
    "debt service coverage ratio",
    "dscr mortgage",
    "dscr rental loan",
    "investment property loan",
    "no income verification loan",
    "dscr loan requirements",
    "dscr loan rates",
    "real estate investor loan",
    "dscr loan calculator",
  ],
  authors: [{ name: "DebtServiceRatioLoan.com" }],
  creator: "DebtServiceRatioLoan.com",
  publisher: "DebtServiceRatioLoan.com",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.debtserviceratioloan.com",
    siteName: "DebtServiceRatioLoan.com",
    title: "DSCR Loans | Debt Service Coverage Ratio Loan Guide",
    description:
      "Your complete guide to DSCR loans — debt service coverage ratio knowledge, tips, lender connections, and resources for real estate investors across 600+ cities.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DSCR Loans - Debt Service Coverage Ratio Loan Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DSCR Loans | Debt Service Coverage Ratio Loan Guide",
    description:
      "Your complete guide to DSCR loans for real estate investors across 600+ cities nationwide.",
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
    canonical: "https://www.debtserviceratioloan.com",
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
