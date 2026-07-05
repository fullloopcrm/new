import Script from 'next/script'
import { Bebas_Neue, Inter } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

import MarketingNav from '@/app/site/template/_components/MarketingNav'
import MarketingFooter from '@/app/site/template/_components/MarketingFooter'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { buildThemeCss } from '@/app/site/template/_config/theme'

// Fallback title for tenant pages that set no metadata of their own — namely the
// 'use client' booking/apply/feedback/referral pages, which would otherwise
// inherit the platform root layout's "Full Loop CRM" title. Server-rendered
// marketing pages set their own title and are unaffected (no template here, so
// their existing titles are not wrapped/doubled). Resolved per-tenant.
export async function generateMetadata() {
  const config = await getSiteConfig()
  return {
    title: {
      default: config.identity.siteName ?? config.identity.name,
    },
  }
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig()
  return (
    <div className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}>
      {/* Per-tenant brand palette → CSS vars. One value re-themes the whole
          template; components read var(--brand)/var(--accent). */}
      <style dangerouslySetInnerHTML={{ __html: buildThemeCss(config.theme) }} />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[var(--accent)] focus:text-[var(--brand)] focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <MarketingNav config={config} />
      <main id="main-content">{children}</main>
      <MarketingFooter config={config} />
      <Script id="site-analytics" src="/t.js" strategy="afterInteractive" />
    </div>
  )
}
