import { ImageResponse } from 'next/og'
import { getTenantFromHeaders } from '@/lib/tenant-site'

export const runtime = 'nodejs'
export const alt = 'Professional Services'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const tagline = tenant?.tagline || 'Professional services'
  const phone = tenant?.phone || ''
  const primaryColor = tenant?.primary_color || '#1E2A4A'
  const accentColor = tenant?.secondary_color || '#A8F0DC'

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: primaryColor, padding: '60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: '0.02em', marginBottom: 16 }}>{name}</div>
          <div style={{ fontSize: 36, color: accentColor, fontWeight: 600, marginBottom: 32 }}>{tagline}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
            <span>Licensed &amp; Insured</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>5-Star Rated</span>
          </div>
          {phone && (
            <div style={{ fontSize: 28, color: accentColor, marginTop: 40, fontWeight: 600, letterSpacing: '0.1em' }}>{phone}</div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
