import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'The NYC Maid — NYC House Cleaning & Maid Service From $49/hr'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E2A4A', padding: '60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: '0.02em', marginBottom: 16 }}>The NYC Maid</div>
          <div style={{ fontSize: 36, color: '#A8F0DC', fontWeight: 600, marginBottom: 32 }}>NYC House Cleaning & Maid Service</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
            <span>From $49/hr</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>Licensed & Insured</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>5.0★ Google</span>
          </div>
          <div style={{ fontSize: 28, color: '#A8F0DC', marginTop: 40, fontWeight: 600, letterSpacing: '0.1em' }}>(212) 202-8400</div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>MANHATTAN · BROOKLYN · QUEENS · LONG ISLAND · NEW JERSEY</div>
      </div>
    ),
    { ...size }
  )
}
