import type { Metadata } from 'next'
import Script from 'next/script'
import Navbar from '@/components/marketing/navbar'
import Footer from '@/components/marketing/footer'
import '../marketing.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://fullloopcrm.com'),
  applicationName: 'Full Loop CRM',
  authors: [{ name: 'Full Loop CRM', url: 'https://fullloopcrm.com' }],
  creator: 'Full Loop CRM',
  publisher: 'Full Loop CRM',
  formatDetection: { telephone: true, email: true, address: true },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large' as const,
    'max-video-preview': -1,
  },
  category: 'technology',
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <Script
        id="tawk-to"
        strategy="lazyOnload"
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
    </>
  )
}
