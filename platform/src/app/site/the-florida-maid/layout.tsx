import Script from 'next/script'
import { Bebas_Neue, Inter } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

import MarketingNav from '@/app/site/the-florida-maid/_components/marketing/MarketingNav'
import MarketingFooter from '@/app/site/the-florida-maid/_components/marketing/MarketingFooter'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[#34D399] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <MarketingNav />
      <main id="main-content">{children}</main>
      <MarketingFooter />
      <Script id="floridamaid-analytics" src="/sites/the-florida-maid/t.js" strategy="afterInteractive" />
    </div>
  )
}
