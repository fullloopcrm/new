import type { Metadata } from 'next'
import Script from 'next/script'
import LayoutClient from './LayoutClient'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  themeColor: '#2563eb',
  title: {
    default: 'NYC Classifieds — Free Local Classifieds for New York City | The NYC Classifieds',
    template: '%s',
  },
  description: 'Free local classifieds for NYC. Apartments, jobs, services, for sale, gigs & more across 126+ neighborhoods in all 5 boroughs. Every user geo-verified. 100% free.',
  keywords: ['NYC classifieds', 'free classifieds', 'local classifieds', 'classifieds', 'free NYC classifieds', 'New York City classifieds', 'New York classifieds', 'classifieds near me', 'free classifieds NYC', 'free local classifieds', 'Craigslist NYC alternative', 'apartments NYC', 'jobs NYC', 'for sale NYC', 'services NYC', 'Brooklyn classifieds', 'Manhattan classifieds', 'Queens classifieds', 'Bronx classifieds', 'Staten Island classifieds', 'neighborhood classifieds NYC', 'online classifieds NYC', 'NYC community board'],
  openGraph: {
    siteName: 'The NYC Classifieds',
    type: 'website',
    locale: 'en_US',
    title: 'NYC Classifieds — Free Local Classifieds for New York City',
    description: 'Free local classifieds for NYC. Apartments, jobs, services, for sale & more across 126+ neighborhoods. Every user geo-verified. 100% free.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NYC Classifieds — Free Local Classifieds for New York City',
    description: 'Free local classifieds for NYC. Apartments, jobs, services, for sale & more. Every user geo-verified. 100% free.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <LayoutClient>
          <div id="main-content">{children}</div>
        </LayoutClient>
        <Script id="tawk-to" strategy="lazyOnload">{`
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
      </body>
    </html>
  )
}
