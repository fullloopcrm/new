import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ConsentGate from "@/components/consent/ConsentGate";

export const metadata: Metadata = {
  title: {
    template: '%s | The NYC Wash and Fold Service Company',
    default: 'The NYC Wash and Fold Service Company — NYC Laundry Service $3/lb | Free Pickup & Delivery',
  },
  description: 'NYC wash and fold laundry service — $3/lb, $39 minimum, free pickup & delivery. Manhattan, Brooklyn & Queens. Same-day rush +$20. Dry cleaning, comforters, commercial. (917) 970-6002.',
  metadataBase: new URL('https://www.washandfoldnyc.com'),
  manifest: '/manifest.json',
  applicationName: 'The NYC Wash and Fold Service Company',
  authors: [{ name: 'The NYC Wash and Fold Service Company', url: 'https://www.washandfoldnyc.com' }],
  creator: 'The NYC Wash and Fold Service Company LLC',
  publisher: 'The NYC Wash and Fold Service Company',
  category: 'Laundry Service',
  classification: 'Laundry Service',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'wash and fold NYC', 'laundry service NYC', 'laundry pickup delivery Manhattan',
    'wash and fold Brooklyn', 'laundry service Queens', 'dry cleaning NYC',
    'comforter cleaning NYC', 'commercial laundry New York',
    'affordable laundry service NYC', 'same day laundry NYC',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'The NYC Wash and Fold Service Company',
    title: 'The NYC Wash and Fold Service Company — NYC Laundry Service $3/lb | Free Pickup & Delivery',
    description: 'NYC wash and fold laundry service — $3/lb, free pickup & delivery. Manhattan, Brooklyn & Queens. (917) 970-6002.',
    url: 'https://www.washandfoldnyc.com',
    images: [
      {
        url: 'https://www.washandfoldnyc.com/opengraph-image',
        width: 512,
        height: 512,
        alt: 'The NYC Wash and Fold Service Company — NYC Laundry Service',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The NYC Wash and Fold Service Company — $3/lb Laundry Service | Free Pickup & Delivery',
    description: 'NYC wash and fold laundry service. $3/lb, free pickup & delivery. Manhattan, Brooklyn & Queens. (917) 970-6002.',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large' as const,
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  alternates: {
    canonical: 'https://www.washandfoldnyc.com',
  },
  other: {
    'format-detection': 'telephone=yes',
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
    'og:phone_number': '+1-917-970-6002',
    'og:email': 'hi@washandfoldnyc.com',
    'business:contact_data:street_address': '150 W 47th St',
    'business:contact_data:locality': 'New York',
    'business:contact_data:region': 'NY',
    'business:contact_data:postal_code': '10036',
    'business:contact_data:country_name': 'United States',
    'business:contact_data:phone_number': '+1-917-970-6002',
    'business:contact_data:website': 'https://www.washandfoldnyc.com',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        {children}
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
