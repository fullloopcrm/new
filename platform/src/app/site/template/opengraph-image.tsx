import { ImageResponse } from 'next/og'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'

// Per-tenant image: reads config via headers(), so it must be dynamic (not
// prerendered at build). Node runtime; avoid glyphs that need a font download.
export const dynamic = 'force-dynamic'
export const alt = 'Professional home services'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const config = await getSiteConfig()
  const p = industryProfile(config.industry)
  const bg = config.theme.primary || '#1E2A4A'
  const accent = config.theme.accent || '#A8F0DC'

  // Cleaning tenants keep the familiar "House Cleaning & Maid Service" tagline;
  // every other trade shows its own service label. No hardcoded $59/hr or NYC.
  const tagline = p.isCleaning ? 'House Cleaning & Maid Service' : p.serviceLabel

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: bg, padding: '60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: '0.02em', marginBottom: 16, textAlign: 'center' }}>{config.identity.name}</div>
          <div style={{ display: 'flex', fontSize: 36, color: accent, fontWeight: 600, marginBottom: 32 }}>{tagline}</div>
          <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>{`Licensed & Insured  ·  ${config.rating.toFixed(1)} from ${config.reviewCount} reviews`}</div>
          <div style={{ display: 'flex', fontSize: 28, color: accent, marginTop: 40, fontWeight: 600, letterSpacing: '0.1em' }}>{config.contact.phone}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{`${p.serviceLabel} · ${config.geo.placename}`}</div>
      </div>
    ),
    { ...size }
  )
}
