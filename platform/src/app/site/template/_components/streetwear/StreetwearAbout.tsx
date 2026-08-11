import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { STREETWEAR_LINKS } from '@/app/site/template/_lib/streetwear/nav-links'

// About page for the streetwear-editorial variant — same badge / heading /
// description section rhythm as the homepage, left-aligned, black text on
// white (no gray sections here per Jeff's call on the homepage welcome
// block). Top band stays black to match the shop grid's header convention.
export default function StreetwearAbout({ config }: { config: SiteConfig }) {
  return (
    <div className="bg-black min-h-screen text-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 pt-12 pb-8 border-b border-white/10">
        <p className="text-[var(--accent)] text-[11px] font-bold tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-plex-mono)]">
          {config.identity.name}
        </p>
        <h1 className="font-[family-name:var(--font-anton)] text-5xl sm:text-6xl uppercase tracking-wide mb-3">About</h1>
        <p className="text-white/50 max-w-xl leading-relaxed">Global drip, local roots — the story behind {config.identity.name}.</p>
      </div>

      <section className="bg-white text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl">
          <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-6">
            Our Story
          </span>
          <h2 className="font-[family-name:var(--font-anton)] text-4xl sm:text-5xl uppercase tracking-wide leading-[0.95] mb-6">
            Global Drip, Local Roots
          </h2>
          <p className="text-black/70 text-base sm:text-lg leading-relaxed">
            Where hype meets culture. {config.identity.name} is a New York City streetwear brand, born and based right here in Midtown — 150 West 47th Street, Diamond District. We build for the block: heavyweight fleece, hard-edged graphics, zero filler. Drip sourced globally, worn locally.
          </p>
        </div>
      </section>

      <section className="bg-white text-black pb-16 sm:pb-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl">
          <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-6">
            Based In NYC
          </span>
          <h2 className="font-[family-name:var(--font-anton)] text-4xl sm:text-5xl uppercase tracking-wide leading-[0.95] mb-6">
            Made For The Five Boroughs
          </h2>
          <p className="text-black/70 text-base sm:text-lg leading-relaxed">
            {config.identity.name} runs out of the Diamond District — no mood boards, no seasonal gimmicks. Just NYC streetwear culture, straight from Midtown to every borough.
          </p>
        </div>
      </section>

      <section className="bg-white text-black pb-16 sm:pb-24 border-t border-black/10 pt-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
          <h2 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide mb-6">
            Shop The Collection
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {STREETWEAR_LINKS.filter((l) => l.href !== '/' && l.href !== '/contact').map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-black hover:text-[var(--accent)] transition-colors text-sm font-bold tracking-[0.15em] uppercase underline underline-offset-4"
              >
                {l.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
