import { Inter } from 'next/font/google'
import ConsentBanner from '@/components/consent/ConsentBanner'
import ConsentGate from '@/components/consent/ConsentGate'
import TenantAnalyticsScript from '@/components/analytics/TenantAnalyticsScript'
import { SITE_URL, PRIVACY_URL } from '@/app/site/the-nyc-exterminator/_lib/emd/shared-content'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

/** Minimal chrome for the NYC Exterminator neighborhood microsites — no shared nav/logo/footer beyond what NeighborhoodMicrosite itself renders. Sibling directory to emd-microsites/ (the Florida Maid EMD tree) so this subtree never inherits that layout's Florida Maid-branded referral banner or tenant analytics id. */
export default function NeighborhoodMicrositeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} font-[family-name:var(--font-inter)] bg-[#0A0A0A]`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-green-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <a
        href={SITE_URL}
        className="group block bg-green-600 text-white hover:bg-green-500 transition-colors"
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-center">
          <span className="text-sm font-semibold leading-snug">
            Part of The NYC Exterminator — licensed pest control across every NYC borough, NJ, Long Island &amp; Westchester.
          </span>
          <span className="hidden sm:inline text-sm font-bold tracking-widest uppercase whitespace-nowrap group-hover:underline">
            Visit TheNYCExterminator.com &rarr;
          </span>
        </div>
      </a>
      <main id="main-content">{children}</main>
      <ConsentGate>
        <TenantAnalyticsScript slug="the-nyc-exterminator" />
      </ConsentGate>
      <ConsentBanner privacyHref={PRIVACY_URL} />
    </div>
  )
}
