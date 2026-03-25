import Link from 'next/link'
import { Bebas_Neue, Inter } from 'next/font/google'
import { getTenantFromHeaders, getTenantServices, getTenantAreas, toSlug } from '@/lib/tenant-site'
import type { Metadata } from 'next'
import SiteNav from '@/components/site/SiteNav'

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return {}

  const name = tenant.name || 'Business'
  const tagline = tenant.tagline || 'Professional service you can trust.'
  const url = tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`

  return {
    title: {
      default: `${name} | ${tagline}`,
      template: `%s | ${name}`,
    },
    description: tagline,
    metadataBase: new URL(url),
    robots: { index: true, follow: true },
    openGraph: {
      siteName: name,
      type: 'website',
      url,
      title: `${name} | ${tagline}`,
      description: tagline,
      ...(tenant.logo_url && { images: [{ url: tenant.logo_url, alt: name }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | ${tagline}`,
      description: tagline,
      ...(tenant.logo_url && { images: [tenant.logo_url] }),
    },
    alternates: { canonical: url },
    other: { 'format-detection': 'telephone=no' },
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantFromHeaders()

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Site Not Found</h1>
          <p className="mt-4 text-slate-600">
            The site you are looking for does not exist or is not configured.
          </p>
        </div>
      </div>
    )
  }

  const businessName = tenant.name || 'Business'
  const phone = tenant.phone || ''
  const email = tenant.email || ''
  const address = tenant.address || ''
  const industry = tenant.industry || ''
  const primaryColor = tenant.primary_color || '#1E2A4A'
  const accentColor = tenant.secondary_color || '#A8F0DC'
  const tagline = tenant.tagline || ''
  const baseUrl = tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`

  const phoneDigits = phone.replace(/[^+\d]/g, '')

  // Fetch services and areas for nav/footer
  const services = await getTenantServices(tenant.id)
  const areas = await getTenantAreas(tenant.id)

  // Compute a slightly darker accent for hover
  // Simple approach: darken by mixing with black
  const accentHover = accentColor === '#A8F0DC' ? '#8DE8CC' : accentColor

  // Organization schema
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: businessName,
    url: baseUrl,
    ...(phone && { telephone: phone }),
    ...(email && { email }),
    ...(address && { address: { '@type': 'PostalAddress', streetAddress: address } }),
    ...(tenant.logo_url && { logo: tenant.logo_url }),
    ...(tagline && { description: tagline }),
  }

  return (
    <div
      className={`${bebas.variable} ${inter.variable} font-[family-name:var(--font-inter)] min-h-screen flex flex-col`}
      style={{
        '--brand': primaryColor,
        '--brand-accent': accentColor,
        '--brand-accent-hover': accentHover,
      } as React.CSSProperties}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-[var(--brand-accent)] focus:text-[var(--brand)] focus:px-4 focus:py-2 focus:rounded-md focus:font-bold focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Site-wide Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* Sitemap link hint */}
      <link rel="sitemap" type="application/xml" href={`/api/tenant-sitemap?slug=${tenant.slug}`} />

      {/* Navigation (client component for interactivity) */}
      <SiteNav
        businessName={businessName}
        logoUrl={tenant.logo_url}
        phone={phone}
        industry={industry}
        areas={areas}
        services={services.map((s) => ({ id: s.id, name: s.name, slug: s.slug || toSlug(s.name) }))}
        brandColor={primaryColor}
        accentColor={accentColor}
      />

      {/* Main Content */}
      <main id="main-content" className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-[var(--brand)] text-gray-400">
        {/* Brand heading */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
          <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl md:text-4xl tracking-wide text-center mb-2">
            {businessName}
          </h2>
          <div className="w-16 h-[2px] bg-[var(--brand-accent)] mx-auto mb-12" />
        </div>

        {/* Links grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {/* Services */}
            {services.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Services</h3>
                <ul className="space-y-2.5">
                  {services.map((svc) => (
                    <li key={svc.id}>
                      <Link href={`/services/${svc.slug || toSlug(svc.name)}`} className="text-sm hover:text-white transition-colors">
                        {svc.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas */}
            {areas.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Areas</h3>
                <ul className="space-y-2.5">
                  {areas.map((area) => (
                    <li key={area}>
                      <Link href={`/areas/${toSlug(area)}`} className="text-sm hover:text-white transition-colors">
                        {area}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Company */}
            <div>
              <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Company</h3>
              <ul className="space-y-2.5">
                <li><Link href="/about" className="text-sm hover:text-white transition-colors">About</Link></li>
                <li><Link href="/reviews" className="text-sm hover:text-white transition-colors">Reviews</Link></li>
                <li><Link href="/careers" className="text-sm hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Contact</h3>
              <ul className="space-y-2.5">
                {phone && (
                  <li>
                    <a href={`tel:${phoneDigits}`} className="text-sm text-[var(--brand-accent)] hover:text-white transition-colors">
                      {phone}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="text-sm hover:text-white transition-colors">
                      {email}
                    </a>
                  </li>
                )}
                {address && (
                  <li className="text-sm">{address}</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {businessName}. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              {phone && (
                <>
                  <a href={`tel:${phoneDigits}`} className="text-[var(--brand-accent)]/70 hover:text-[var(--brand-accent)]">
                    {phone}
                  </a>
                  {' '}&middot;{' '}
                </>
              )}
              Powered by{' '}
              <a
                href="https://www.fullloopcrm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-accent)] font-semibold hover:text-white underline underline-offset-2 decoration-[var(--brand-accent)]/50"
              >
                Full Loop CRM
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
