import Link from 'next/link'
import { getSiteConfig } from '@/app/site/template/_config/load'

// Tenant-branded 404. Without this, a bad/typo route on a template-routed tenant
// falls through to the platform root not-found, which renders the Full Loop CRM
// marketing page (F-048). This renders inside MarketingLayout, so it carries the
// tenant's own nav, footer, and brand theme.
export default async function NotFound() {
  const config = await getSiteConfig()
  const name = config.identity.siteName ?? config.identity.name
  return (
    <section
      aria-labelledby="nf-heading"
      style={{
        minHeight: '55vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '3rem 1.5rem', gap: '0.75rem',
      }}
    >
      <p style={{ fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>
        404
      </p>
      <h1 id="nf-heading" style={{ fontSize: 'clamp(1.75rem, 1rem + 3vw, 2.75rem)', fontWeight: 700, margin: 0 }}>
        Page not found
      </h1>
      <p style={{ maxWidth: '32rem', opacity: 0.75, margin: 0 }}>
        We couldn&apos;t find that page on {name}. It may have moved, or the link may be broken.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.75rem', display: 'inline-block', padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none',
          background: 'var(--brand)', color: 'var(--accent)',
        }}
      >
        Back to {name}
      </Link>
    </section>
  )
}
