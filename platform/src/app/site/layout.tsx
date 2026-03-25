import Script from 'next/script'
import { Bebas_Neue, Inter } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

import MarketingNav from '@/components/site/MarketingNav'
import MarketingFooter from '@/components/site/MarketingFooter'
import { getTenantFromHeaders, getTenantServices, getTenantAreas } from '@/lib/tenant-site'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantFromHeaders()
  const services = tenant ? await getTenantServices(tenant.id) : []
  const areas = tenant ? await getTenantAreas(tenant.id) : []

  const navData = {
    businessName: tenant?.name || 'Our Company',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    logoUrl: tenant?.logo_url || '/logo.png',
    stripePayUrl: (tenant?.website_content as Record<string, unknown>)?.stripe_pay_url as string || '',
    services: services.map((s: { name: string; id: string }) => ({
      name: s.name,
      href: `/services/${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    })),
  }

  const footerData = {
    businessName: tenant?.name || 'Our Company',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    services: navData.services,
    areas: areas.map((a: string) => ({
      name: a,
      href: `/${a.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    })),
  }

  return (
    <div
      className={`${bebasNeue.variable} ${inter.variable} font-[family-name:var(--font-inter)]`}
      style={{
        '--brand': tenant?.primary_color || '#1E2A4A',
        '--brand-accent': tenant?.secondary_color || '#A8F0DC',
      } as React.CSSProperties}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[var(--brand-accent)] focus:text-[var(--brand)] focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm">
        Skip to main content
      </a>
      <MarketingNav {...navData} />
      <main id="main-content">{children}</main>
      <MarketingFooter {...footerData} />
      {tenant?.slug && <Script id="tenant-analytics" src="/t.js" strategy="afterInteractive" />}
    </div>
  )
}
