import { Inter } from 'next/font/google'
import ConsentBanner from '@/components/consent/ConsentBanner'
import ConsentGate from '@/components/consent/ConsentGate'
import TenantAnalyticsScript from '@/components/analytics/TenantAnalyticsScript'
import { SITE_URL, PRIVACY_URL } from '@/app/site/wash-and-fold-nyc/_lib/emd/shared-content'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

/** Minimal chrome for the Wash and Fold NYC neighborhood microsites — no shared nav/logo/footer beyond what WashFoldMicrosite itself renders. Sibling directory to emd-microsites/ (Florida Maid) and emd-microsites-exterminator/ (The NYC Exterminator) so this subtree never inherits either of their layouts or tenant analytics ids. */
export default function WashFoldMicrositeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} font-[family-name:var(--font-inter)] bg-white`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[#2B7BB0] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <a
        href={SITE_URL}
        className="group block bg-[#1a3a5c] text-white hover:bg-[#2B7BB0] transition-colors"
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-center">
          <span className="text-sm font-semibold leading-snug">
            Part of Wash and Fold NYC — licensed laundry pickup &amp; delivery across Manhattan, Brooklyn &amp; Queens.
          </span>
          <span className="hidden sm:inline text-sm font-bold tracking-widest uppercase whitespace-nowrap group-hover:underline">
            Visit WashAndFoldNYC.com &rarr;
          </span>
        </div>
      </a>
      <main id="main-content">{children}</main>
      <ConsentGate>
        <TenantAnalyticsScript slug="wash-and-fold-nyc" />
      </ConsentGate>
      <ConsentBanner privacyHref={PRIVACY_URL} />
    </div>
  )
}
