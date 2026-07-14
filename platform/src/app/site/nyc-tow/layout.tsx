import type { Metadata } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/site/nyc-tow/_components/Header";
import { Footer } from "@/app/site/nyc-tow/_components/Footer";
import { MobileStickyBar } from "@/app/site/nyc-tow/_components/MobileStickyBar";
import { JsonLd, organizationSchema } from "@/app/site/nyc-tow/_lib/schema";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ConsentGate from "@/components/consent/ConsentGate";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.thenyctowingservice.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The NYC Towing Service | 24/7 Towing & Roadside in All 5 Boroughs",
    template: "%s | The NYC Towing Service",
  },
  description:
    "24/7 towing and roadside assistance across all five NYC boroughs. Light-duty, heavy-duty, flatbed, battery, tire, lockout, gas, and winch-out. Flat-rate pricing, 20–40 minute arrival, licensed and insured. Call (212) 470-4068.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "The NYC Towing Service",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body antialiased">
        <JsonLd schema={organizationSchema()} />
        <Header />
        <main className="pb-20 lg:pb-0">{children}</main>
        <Footer />
        <MobileStickyBar />
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
