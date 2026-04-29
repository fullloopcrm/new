import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { JsonLd, organizationSchema, websiteSchema } from '@/lib/schema'
import '../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://homeservicesbusinesscrm.com'),
  applicationName: 'Full Loop CRM',
  authors: [{ name: 'Full Loop CRM', url: 'https://homeservicesbusinesscrm.com' }],
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
    <div className="loop-marketing min-h-screen">
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <div
        style={{
          background: '#E8DCC4',
          color: '#1C1C1C',
          fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #C8C5BC',
        }}
      >
        Notice <span style={{ color: '#A8A8A4' }}>·</span> we are currently in beta <span style={{ color: '#A8A8A4' }}>|</span> testing the platform
      </div>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  )
}
