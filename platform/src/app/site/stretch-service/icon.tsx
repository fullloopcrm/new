import { ImageResponse } from 'next/og'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 22, background: '#10b981', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'system-ui' }}>
        S
      </div>
    ),
    { ...size }
  )
}
