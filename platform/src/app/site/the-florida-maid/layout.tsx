import Script from 'next/script'
import { Bebas_Neue, Inter } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

import Link from 'next/link'
import MarketingNav from '@/app/site/the-florida-maid/_components/marketing/MarketingNav'
import MarketingFooter from '@/app/site/the-florida-maid/_components/marketing/MarketingFooter'
import ConsentBanner from '@/components/consent/ConsentBanner'
import ConsentGate from '@/components/consent/ConsentGate'
import TenantAnalyticsScript from '@/components/analytics/TenantAnalyticsScript'
import ClientErrorMonitor from '@/components/monitoring/ClientErrorMonitor'
import SiteChatWidget from '@/app/site/the-florida-maid/_components/marketing/SiteChatWidget'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[#34D399] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <div className="bg-[#A8F0DC] text-[#1E2A4A] text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-9 py-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center">
          <span>Earn 10% recurring on every cleaning your referrals book &mdash; paid after each visit, no cap.</span>
          <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" className="underline underline-offset-2 whitespace-nowrap">
            Start Earning &rarr;
          </Link>
        </div>
      </div>
      <MarketingNav />
      <main id="main-content">{children}</main>
      <MarketingFooter />
      <ConsentGate>
        <Script id="floridamaid-analytics" src="/sites/the-florida-maid/t.js" strategy="afterInteractive" />
      </ConsentGate>
      <TenantAnalyticsScript slug="the-florida-maid" />
      <ConsentBanner privacyHref="/privacy-policy" />
      <ClientErrorMonitor slug="the-florida-maid" />
      <SiteChatWidget />
    </div>
  )
}
