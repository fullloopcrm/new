import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'The NYC Wash and Fold Service Company — NYC Wash and Fold & Laundry Service From $3/lb'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1a3a5c', padding: '60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: '0.02em', marginBottom: 16 }}>The NYC Wash and Fold Service Company</div>
          <div style={{ fontSize: 36, color: '#4BA3D4', fontWeight: 600, marginBottom: 32 }}>NYC Wash and Fold & Laundry Service</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
            <span>From $3/lb</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>Licensed & Insured</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>5.0★ Google</span>
          </div>
          <div style={{ fontSize: 28, color: '#4BA3D4', marginTop: 40, fontWeight: 600, letterSpacing: '0.1em' }}>(917) 970-6002</div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>MANHATTAN · BROOKLYN · QUEENS · LONG ISLAND · NEW JERSEY</div>
      </div>
    ),
    { ...size }
  )
}
