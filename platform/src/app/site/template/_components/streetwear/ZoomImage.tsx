'use client'

import { useRef } from 'react'

const LENS_RADIUS_PX = 150
const LENS_SCALE = 3

// Grayscale-to-color magnifying lens — the brand's own black/white/gray
// identity turned into the hover mechanic instead of a generic scale-zoom.
// The photo sits desaturated by default; a circular lens follows the cursor
// showing a heavily magnified, full-color close-up of exactly what's under
// it (stitching, laces, hands — real detail), while everything outside the
// lens stays grayscale and unscaled. No click needed. On brand precisely
// because a color brand couldn't do this — the effect only makes sense
// because everything else is monochrome.
export default function ZoomImage({
  src,
  alt,
  onClick,
}: {
  src: string
  alt: string
  onClick?: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const lensImgRef = useRef<HTMLImageElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    wrapRef.current?.style.setProperty('--spot-x', `${x}px`)
    wrapRef.current?.style.setProperty('--spot-y', `${y}px`)
    wrapRef.current?.style.setProperty('--spot-opacity', '1')
    // transform-origin at the cursor point keeps that exact point fixed while
    // the image scales up around it — the standard magnifying-lens technique.
    if (lensImgRef.current) lensImgRef.current.style.transformOrigin = `${x}px ${y}px`
  }

  function handleMouseLeave() {
    wrapRef.current?.style.setProperty('--spot-opacity', '0')
  }

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 overflow-hidden${onClick ? ' cursor-zoom-in' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Zoom in on ${alt}` : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{ '--spot-x': '50%', '--spot-y': '50%', '--spot-opacity': 0 } as React.CSSProperties}
    >
      {/* Base layer: full color, unscaled */}
      {/* eslint-disable-next-line @next/next/no-img-element -- external stock photo, not in next.config's image remotePatterns allowlist */}
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />

      {/* Lens layer: full color, heavily magnified, clipped to a circle at the cursor */}
      <div
        className="absolute inset-0 transition-opacity duration-150 ease-out pointer-events-none"
        style={{
          opacity: 'var(--spot-opacity)',
          clipPath: `circle(${LENS_RADIUS_PX}px at var(--spot-x) var(--spot-y))`,
          WebkitClipPath: `circle(${LENS_RADIUS_PX}px at var(--spot-x) var(--spot-y))`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- external stock photo, not in next.config's image remotePatterns allowlist */}
        <img
          ref={lensImgRef}
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: `scale(${LENS_SCALE})` }}
        />
      </div>

      {/* Lens rim — makes the circle read as a physical magnifying glass, not just a color patch */}
      <div
        className="absolute inset-0 transition-opacity duration-150 ease-out pointer-events-none"
        style={{
          opacity: 'var(--spot-opacity)',
          background: `radial-gradient(circle ${LENS_RADIUS_PX}px at var(--spot-x) var(--spot-y), transparent ${LENS_RADIUS_PX - 2}px, rgba(255,255,255,0.9) ${LENS_RADIUS_PX - 2}px, rgba(255,255,255,0.9) ${LENS_RADIUS_PX}px, transparent ${LENS_RADIUS_PX}px)`,
        }}
      />
    </div>
  )
}
