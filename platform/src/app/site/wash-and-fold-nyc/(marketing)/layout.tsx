import { Bebas_Neue, Inter } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

import MarketingNav from '@/app/site/wash-and-fold-nyc/_components/marketing/MarketingNav'
import MarketingFooter from '@/app/site/wash-and-fold-nyc/_components/marketing/MarketingFooter'
import FloatingBubbles from '@/app/site/wash-and-fold-nyc/_components/marketing/FloatingBubbles'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[#4BA3D4] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <FloatingBubbles />
      <MarketingNav />
      <main id="main-content" className="relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  )
}
