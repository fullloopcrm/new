import Image from 'next/image'

/**
 * Shared visual primitives for the photography vertical — extracted from
 * PhotographyHome so the service detail pages (services/[slug]) can reuse
 * the exact same film-strip/Polaroid/badge language instead of drifting
 * into a different look per page.
 */

export function FilmStripEdge() {
  return (
    <div
      aria-hidden="true"
      className="h-5 w-full"
      style={{
        backgroundColor: 'var(--brand)',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 3.5px, transparent 3.6px)',
        backgroundSize: '26px 100%',
        backgroundPosition: 'center',
      }}
    />
  )
}

export function Scanlines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.07]"
      style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)' }}
    />
  )
}

export function RetroSun({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${className ?? ''}`}
      style={{
        backgroundImage:
          'linear-gradient(180deg, var(--accent) 0%, var(--accent) 40%, transparent 40%, transparent 47%, var(--accent) 47%, var(--accent) 54%, transparent 54%, transparent 61%, var(--accent) 61%, var(--accent) 100%)',
      }}
    />
  )
}

/** SEO section kicker — the exact-match keyword badge every section leads with. */
export function Badge({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-bold text-xs tracking-[0.2em] uppercase px-3 py-1.5 mb-4"
      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
    >
      {children}
    </span>
  )
}

/** A photo framed like a slide/print — sprocket-tick border, slight rotation. */
export function FramedPhoto({ src, alt, caption, className }: { src: string; alt: string; caption?: string; className?: string }) {
  return (
    <div className={`bg-white p-3 pb-10 shadow-[10px_10px_0_0_rgba(0,0,0,0.15)] ${className ?? ''}`}>
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover grayscale" />
      </div>
      {caption && <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-gray-500 text-center mt-3">{caption}</p>}
    </div>
  )
}
