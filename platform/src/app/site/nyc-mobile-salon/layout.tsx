import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import LayoutShell from "@/app/site/nyc-mobile-salon/_components/LayoutShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thenycmobilesalon.com"),
  authors: [{ name: "The NYC Mobile Salon" }],
  creator: "The NYC Mobile Salon",
  publisher: "The NYC Mobile Salon",
  title: {
    default: "The NYC Mobile Salon — Beauty Services Delivered to Your Door",
    template: "%s | The NYC Mobile Salon",
  },
  description:
    "Licensed beauty professionals come to you anywhere in NYC. Hair, nails, makeup, grooming & more across all 5 boroughs. Book your in-home appointment today.",
  openGraph: {
    title: "The NYC Mobile Salon — Beauty Services Delivered to Your Door",
    description:
      "Licensed beauty professionals come to you anywhere in NYC. Hair, nails, makeup, grooming & more across all 5 boroughs.",
    type: "website",
    url: "https://thenycmobilesalon.com",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "The NYC Mobile Salon — Mobile Beauty Services in NYC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The NYC Mobile Salon — Beauty Services Delivered to Your Door",
    description: "Licensed beauty professionals come to you anywhere in NYC. Hair, nails, makeup, grooming & more across all 5 boroughs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${playfair.variable} antialiased`}>
        <LayoutShell>{children}</LayoutShell>
        <script
          dangerouslySetInnerHTML={{
            __html: `var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src="https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n";s1.charset="UTF-8";s1.setAttribute("crossorigin","*");s0.parentNode.insertBefore(s1,s0)})();`,
          }}
        />
      </body>
    </html>
  );
}
