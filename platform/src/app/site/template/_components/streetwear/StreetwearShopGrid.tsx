'use client'

import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { money } from '@/app/site/template/_lib/cart'
import { swatchHex } from '@/app/site/template/_lib/colorSwatch'
import AddToCartButton from './AddToCartButton'
import ZoomImage from './ZoomImage'

export interface StreetwearProduct {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  category: string | null
  createdAt?: string | null
  colorOptions?: string[]
  sizeOptions?: string[]
}

function ColorSwatches({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Available colors">
      {colors.map((c) => (
        <span
          key={c}
          title={c}
          className="h-4 w-4 rounded-full border border-white/20"
          style={{ backgroundColor: swatchHex(c) }}
        />
      ))}
    </div>
  )
}

const NEW_WINDOW_DAYS = 14
function isNew(createdAt?: string | null): boolean {
  if (!createdAt) return false
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

// Hard-edged product grid for the streetwear-editorial variant — no rounded
// corners, no soft card shadows, orange hover state, mono price tags. Used by
// both /shop (all products) and /shop/c/[category] (category landing pages),
// which is why heading/subheading are props rather than hardcoded copy.
export default function StreetwearShopGrid({
  config,
  products,
  heading,
  subheading,
  page = 1,
  totalPages = 1,
  basePath = '/shop',
}: {
  config: SiteConfig
  products: StreetwearProduct[]
  heading: string
  subheading?: string
  page?: number
  totalPages?: number
  basePath?: string
}) {
  const pageHref = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`)
  return (
    <div className="bg-black min-h-screen text-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 pt-12 pb-8 border-b border-white/10">
        <p className="text-[var(--accent)] text-[11px] font-bold tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-plex-mono)]">
          {config.identity.name}
        </p>
        <h1 className="font-[family-name:var(--font-anton)] text-5xl sm:text-6xl uppercase tracking-wide mb-3">{heading}</h1>
        {subheading && <p className="text-white/50 max-w-xl leading-relaxed">{subheading}</p>}
      </div>

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-4 border-b border-white/10 flex flex-wrap gap-6">
        {[
          { name: 'All', href: '/shop' },
          { name: 'Fellas', href: '/shop/c/fellas' },
          { name: 'Ladies', href: '/shop/c/ladies' },
          { name: 'Accessories', href: '/shop/c/accessories' },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="text-white/60 hover:text-[var(--accent)] text-xs font-semibold tracking-[0.15em] uppercase transition-colors">
            {c.name}
          </Link>
        ))}
      </div>

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-12">
        {products.length === 0 ? (
          <div className="border border-white/15 p-12 text-center text-white/40">No products available yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 lg:gap-x-10 lg:gap-y-20">
            {products.map((p) => (
              <div key={p.id} className="group">
                <Link href={`/shop/${p.id}`} className="block">
                  <div className="aspect-[3/4] relative overflow-hidden bg-white/5">
                    {isNew(p.createdAt) && (
                      <span className="absolute top-4 left-4 z-10 bg-white text-black text-[11px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5">
                        New
                      </span>
                    )}
                    {p.imageUrl ? (
                      <ZoomImage src={p.imageUrl} alt={p.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/15">
                        <svg aria-hidden="true" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 3h17.25M3.375 3v17.25m17.25-17.25v17.25M3.375 20.25h17.25M8.25 9h7.5m-7.5 3.75h7.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="pt-5 pb-2">
                  {p.category && <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2 font-[family-name:var(--font-plex-mono)]">{p.category}</p>}
                  <Link href={`/shop/${p.id}`}>
                    <h3 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide leading-[0.95] hover:text-[var(--accent)] transition-colors">{p.name}</h3>
                  </Link>
                  {p.description && (
                    <p className="mt-3 text-white/50 text-sm leading-relaxed line-clamp-2 max-w-xs">{p.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 gap-3">
                    <ColorSwatches colors={p.colorOptions ?? []} />
                    <span className="font-[family-name:var(--font-plex-mono)] text-white font-semibold text-base shrink-0">{money(p.priceCents)}</span>
                  </div>
                  <div className="mt-4">
                    <AddToCartButton product={p} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Shop pagination" className="flex items-center justify-center gap-2 mt-16">
            <Link
              href={pageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`w-9 h-9 flex items-center justify-center border text-xs font-semibold ${
                page <= 1 ? 'border-white/10 text-white/20 pointer-events-none' : 'border-white/25 text-white/70 hover:border-[var(--accent)] hover:text-[var(--accent)]'
              }`}
            >
              &larr;
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`w-9 h-9 flex items-center justify-center border text-xs font-semibold font-[family-name:var(--font-plex-mono)] ${
                  p === page ? 'bg-white text-black border-white' : 'border-white/25 text-white/70 hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {p}
              </Link>
            ))}
            <Link
              href={pageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`w-9 h-9 flex items-center justify-center border text-xs font-semibold ${
                page >= totalPages ? 'border-white/10 text-white/20 pointer-events-none' : 'border-white/25 text-white/70 hover:border-[var(--accent)] hover:text-[var(--accent)]'
              }`}
            >
              &rarr;
            </Link>
          </nav>
        )}
      </div>
    </div>
  )
}
