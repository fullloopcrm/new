import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: '%s | The NYC Maid',
    default: 'The NYC Maid - Professional Cleaning Services in NYC From $59/hr',
  },
  description: 'NYC house cleaning & maid service from $59/hr. Manhattan, Brooklyn, Queens, Long Island & NJ. Licensed, insured, 5.0★ Google rated. Book online or call (212) 202-8400.',
  metadataBase: new URL('https://www.thenycmaid.com'),
  manifest: '/manifest.json',
  applicationName: 'The NYC Maid',
  authors: [{ name: 'The NYC Maid', url: 'https://www.thenycmaid.com' }],
  creator: 'The NYC Maid Cleaning Service LLC',
  publisher: 'The NYC Maid',
  category: 'Home Services',
  classification: 'Cleaning Service',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'NYC maid service', 'house cleaning NYC', 'apartment cleaning New York',
    'deep cleaning service Manhattan', 'maid service Brooklyn', 'cleaning service Queens',
    'move in cleaning NYC', 'office cleaning New York', 'same day cleaning NYC',
    'affordable cleaning service NYC', 'weekly maid service NYC',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'The NYC Maid',
    title: 'The NYC Maid - Professional Cleaning Services in NYC From $59/hr',
    description: 'NYC house cleaning & maid service from $59/hr. Manhattan, Brooklyn, Queens, Long Island & NJ. Licensed, insured, 5.0★ Google rated.',
    url: 'https://www.thenycmaid.com',
    images: [
      {
        url: 'https://www.thenycmaid.com/icon-512.png',
        width: 512,
        height: 512,
        alt: 'The NYC Maid - Professional Cleaning Service',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The NYC Maid - NYC Cleaning Service From $59/hr',
    description: 'Professional house cleaning across NYC, Long Island & NJ. 5.0★ Google. Licensed & insured. Book online or call (212) 202-8400.',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large' as const,
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  alternates: {
    canonical: 'https://www.thenycmaid.com',
    languages: {
      'en-US': 'https://www.thenycmaid.com',
      'es-US': 'https://www.thenycmaid.com',
    },
  },
  verification: {
    other: {
      'msvalidate.01': [''],
    },
  },
  other: {
    'format-detection': 'telephone=yes',
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
    'rating': 'general',
    'revisit-after': '3 days',
    'distribution': 'global',
    'language': 'English',
    'og:phone_number': '+1-212-202-8400',
    'og:email': 'hi@thenycmaid.com',
    'business:contact_data:street_address': '150 W 47th St',
    'business:contact_data:locality': 'New York',
    'business:contact_data:region': 'NY',
    'business:contact_data:postal_code': '10036',
    'business:contact_data:country_name': 'United States',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="alternate" hrefLang="en-US" href="https://www.thenycmaid.com" />
        <link rel="alternate" hrefLang="es-US" href="https://www.thenycmaid.com" />
        <link rel="alternate" hrefLang="x-default" href="https://www.thenycmaid.com" />
      </head>
      <body>
        {children}
        <Script id="tawk-to" strategy="afterInteractive">{`
          var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
          (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
          })();
        `}</Script>
        <Script id="error-catcher" strategy="beforeInteractive">{`
          window.addEventListener('error', function(e) {
            if (!e.message) return;
            if (e.message.indexOf('Failed to load chunk') !== -1 || e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('ChunkLoadError') !== -1) {
              window.location.reload();
              return;
            }
            fetch('/api/errors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: e.message, stack: e.error?.stack, url: location.href, source: 'window.onerror' })
            }).catch(function(){});
          });
          window.addEventListener('unhandledrejection', function(e) {
            var msg = e.reason?.message || String(e.reason);
            if (msg.indexOf('Failed to load chunk') !== -1 || msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
              window.location.reload();
              return;
            }
            fetch('/api/errors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg, stack: e.reason?.stack, url: location.href, source: 'unhandled-promise' })
            }).catch(function(){});
          });
        `}</Script>
      </body>
    </html>
  );
}
