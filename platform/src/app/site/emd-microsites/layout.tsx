import { Bebas_Neue, Inter } from 'next/font/google'
import ConsentBanner from '@/components/consent/ConsentBanner'
import ConsentGate from '@/components/consent/ConsentGate'
import Script from 'next/script'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

/** Minimal chrome for EMD one-page microsites — fonts + consent only. No shared nav, footer, or logo; each microsite's own brand name is the only header. */
export default function EmdMicrositeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[#34D399] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <main id="main-content">{children}</main>
      <ConsentGate>
        <Script id="floridamaid-analytics" src="/sites/the-florida-maid/t.js" strategy="afterInteractive" />
      </ConsentGate>
      <ConsentBanner privacyHref="/privacy-policy" />
    </div>
  )
}
