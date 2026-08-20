'use client'

import { useState } from 'react'
import ZoomImage from './ZoomImage'

export interface HeroTab {
  key: string
  label: string
  imageUrl: string | null
  // Landing-only background — crossfades in like any other tab (and can be
  // the default active index) but gets no nav button, since it's not a
  // destination the visitor picks, just what's showing before they click.
  hidden?: boolean
}

// Manual tab switcher for the hero — replaces the old Shop Now/Our Story CTA
// row. Each tab with an imageUrl crossfades in as the hero's background
// photo; tabs without one fall back to the plain black hero. The background
// div is `absolute inset-0` — it paints the nearest positioned ancestor, the
// hero <section> itself, not just this component's own box, since no element
// in between sets its own position.
export default function HeroTabs({ tabs }: { tabs: HeroTab[] }) {
  const [active, setActive] = useState(0)

  return (
    <>
      <div className="absolute inset-0 -z-10">
        {tabs.map((t, i) =>
          t.imageUrl ? (
            <ZoomImage
              key={t.key}
              src={t.imageUrl}
              alt=""
              className={`transition-opacity duration-500 ease-out ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : null
        )}
      </div>

      <div className="flex justify-end flex-wrap gap-2 pr-2 sm:pr-6">
        {tabs.map((t, i) =>
          t.hidden ? null : (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(i)}
              className={`px-6 py-3 text-xs font-bold tracking-[0.15em] uppercase transition-colors border ${
                i === active
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white/70 border-white/25 hover:border-white hover:text-white'
              }`}
            >
              {t.label}
            </button>
          )
        )}
      </div>
    </>
  )
}
