import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'The NYC Classifieds — Free Local Classifieds for New York City'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}
          >
            The NYC Classifieds
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: '#bfdbfe',
              lineHeight: 1.4,
              marginBottom: 32,
            }}
          >
            Free Local Classifieds for New York City
          </div>
          <div
            style={{
              display: 'flex',
              gap: 24,
              fontSize: 20,
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              Every User Geo-Verified
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              100% Free
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
