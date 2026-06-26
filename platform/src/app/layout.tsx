import type { Metadata } from 'next'
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono, Fraunces } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const sora = Sora({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-sora', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-dm-sans', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-space-grotesk', display: 'swap' })
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://homeservicesbusinesscrm.com'),
  title: 'Home Service Business CRM That Runs Itself | Full Loop CRM',
  description: 'The full-cycle, AI-managed home service business CRM that runs an automated business. Live-proven by The NYC Maid — ~200 services a month, run by one person in under an hour a day. No other CRM does even 50% of this.',
  keywords: 'home service business crm, home service crm, crm for home service business, cleaning business CRM, field service CRM, AI sales chatbot, lead generation CRM, booking software for cleaners, maid service software',
  authors: [{ name: 'Full Loop CRM' }],
  openGraph: {
    title: 'Home Service Business CRM That Runs Itself | Full Loop CRM',
    description: 'The full-cycle, AI-managed home service business CRM that runs an automated business — live-proven by The NYC Maid: ~200 services/month, one person, under an hour a day.',
    type: 'website',
    url: 'https://homeservicesbusinesscrm.com',
    siteName: 'Full Loop CRM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home Service Business CRM That Runs Itself | Full Loop',
    description: 'The home service business CRM proven by a real, live business — AI sales, scheduling, GPS ops, payments, reviews, and retargeting in one platform.',
  },
  icons: {
    icon: '/icon.svg',
  },
  alternates: {
    canonical: 'https://homeservicesbusinesscrm.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Don't mount ClerkProvider when the publishable key isn't set — the
  // static SEO /site/* pages prerender at build time and shouldn't crash
  // when Clerk envs are missing. Pages that actually need auth are all
  // dynamic and gated separately.
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const Wrapper = hasClerk ? ClerkProvider : ({ children }: { children: React.ReactNode }) => <>{children}</>
  return (
    <Wrapper>
      <html lang="en">
        <body className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable} ${jetbrains.variable} ${fraunces.variable} antialiased`}>
          {children}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('error', function(e) {
                  if (e.message && (e.message.includes('Failed to fetch dynamically imported module') ||
                      e.message.includes('ChunkLoadError') ||
                      e.message.includes('Loading chunk') ||
                      e.message.includes('Failed to load chunk'))) {
                    window.location.reload();
                  }
                });
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason && (e.reason.message || String(e.reason));
                  if (reason && (reason.includes('Failed to fetch dynamically imported module') ||
                      reason.includes('ChunkLoadError') ||
                      reason.includes('Loading chunk') ||
                      reason.includes('Failed to load chunk'))) {
                    window.location.reload();
                  }
                });
              `,
            }}
          />
        </body>
      </html>
    </Wrapper>
  )
}
