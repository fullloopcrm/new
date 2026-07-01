import type { Metadata } from "next";
import Script from "next/script";
import { Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/site/we-pay-you-junk/_components/Header";
import { Footer } from "@/app/site/we-pay-you-junk/_components/Footer";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const SITE_URL = "https://www.wepayyoujunkremoval.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "We Pay You Junk Removal | $200/hr Fully Inclusive +$100/hr Per Extra Laborer Nationwide | We Pay You For Your Stuff",
    template: "%s | We Pay You Junk Removal",
  },
  description:
    "America's only junk removal company that pays you. $200/hr (one team member, fully inclusive) +$100/hr per extra laborer with dump fees included, 1 hour minimum. We credit you 50% (when applicable) of resale value on items worth something. 900+ cities across all 50 states. Same-day available 7AM-8PM.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "We Pay You Junk Removal",
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
        <Header />
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
