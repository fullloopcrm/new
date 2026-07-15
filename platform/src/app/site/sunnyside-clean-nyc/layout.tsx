import { Bebas_Neue, Inter } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

import MarketingNav from '@/app/site/sunnyside-clean-nyc/_components/marketing/MarketingNav'
import MarketingFooter from '@/app/site/sunnyside-clean-nyc/_components/marketing/MarketingFooter'

export const metadata = {
  title: {
    default: 'Sunnyside Clean NYC — A NYC Maid Service Co. | Professional Cleaning in NYC From $59/hr',
  },
}

// This tree was previously statically prerendered with a 300s ISR window,
// but the static HTML from an old deployment kept being served indefinitely
// instead of revalidating — force every request to render fresh so deploys
// take effect immediately.
export const dynamic = 'force-dynamic'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[#A8F0DC] focus:text-[#1E2A4A] focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <MarketingNav />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  )
}
