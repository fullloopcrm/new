'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import JsonLd from '@/app/site/template/_components/JsonLd'
import { buildBusiness, breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import { addToCart, money } from '@/app/site/template/_lib/cart'
import { swatchHex } from '@/app/site/template/_lib/colorSwatch'
import ZoomImage from '@/app/site/template/_components/streetwear/ZoomImage'

export interface ProductDetail {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  category: string | null
  isDigital: boolean
  colorOptions: string[]
  sizeOptions: string[]
}

export default function ProductDetailClient({ config, product }: { config: SiteConfig; product: ProductDetail }) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [optionError, setOptionError] = useState('')
  const business = buildBusiness(config)
  const needsColor = product.colorOptions.length > 0
  const needsSize = product.sizeOptions.length > 0

  useEffect(() => {
    if (!zoomed) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoomed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomed])

  function handleAdd() {
    if (needsColor && !color) {
      setOptionError('Select a color.')
      return
    }
    if (needsSize && !size) {
      setOptionError('Select a size.')
      return
    }
    setOptionError('')
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        color: color || undefined,
        size: size || undefined,
      })
    }
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1500)
  }

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    offers: {
      '@type': 'Offer',
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${business.url}/shop/${product.id}`,
    },
  }

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: business.url },
          { name: 'Shop', url: `${business.url}/shop` },
          { name: product.name, url: `${business.url}/shop/${product.id}` },
        ])}
      />

      <div className="bg-[var(--brand)] text-white py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/shop" className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-4 w-fit">
            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Shop
          </Link>
          <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-[var(--brand)] bg-[var(--accent)] rounded-full px-2.5 py-1 mb-3">
            Official Store
          </span>
          <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-1">{product.category || 'Shop'}</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-2xl sm:text-3xl tracking-wide mb-3">
            {product.name}
          </h1>
          <p className="text-white/70 text-sm max-w-xl leading-relaxed">
            Hand-picked gear from the {config.identity.name} team you already trust.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-[var(--surface)] rounded-2xl relative overflow-hidden">
          {product.imageUrl ? (
            <ZoomImage src={product.imageUrl} alt={product.name} onClick={() => setZoomed(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[rgb(var(--brand-rgb)/0.25)]">
              <svg aria-hidden="true" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 3h17.25M3.375 3v17.25m17.25-17.25v17.25M3.375 20.25h17.25M8.25 9h7.5m-7.5 3.75h7.5" />
              </svg>
            </div>
          )}
        </div>

        <div>
          <p className="text-2xl font-bold text-[var(--brand)] mb-5">{money(product.priceCents)}</p>
          {product.description && <p className="text-gray-500 leading-relaxed mb-8">{product.description}</p>}

          {needsColor && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Color{color ? `: ${color}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setOptionError('') }}
                    aria-pressed={color === c}
                    aria-label={c}
                    title={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? 'border-[var(--accent)] scale-110' : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: swatchHex(c) }}
                  />
                ))}
              </div>
            </div>
          )}

          {needsSize && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Size{size ? `: ${size}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizeOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSize(s); setOptionError('') }}
                    aria-pressed={size === s}
                    className={`min-w-[44px] h-9 px-3 rounded-md border text-xs font-semibold transition-colors ${
                      size === s
                        ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-[var(--brand)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {optionError && <p className="text-red-600 text-xs mb-3">{optionError}</p>}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center border border-gray-200 rounded-md">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[var(--brand)]">−</button>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Quantity"
                min={1}
                max={20}
                value={qty}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10)
                  if (!Number.isNaN(next)) setQty(Math.min(20, Math.max(1, next)))
                }}
                onBlur={(e) => {
                  if (e.target.value === '') setQty(1)
                }}
                className="w-12 text-center text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[var(--brand)]">+</button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 bg-[var(--accent)] text-[var(--brand)] py-2.5 rounded-md font-bold text-xs tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors"
            >
              {added ? 'Added ✓' : 'Add to Cart'}
            </button>
          </div>

          {product.isDigital ? (
            <p className="text-xs text-gray-400">Digital item — delivered by email after checkout, no shipping required.</p>
          ) : (
            <p className="text-xs text-gray-400">Ships to your address, collected at checkout.</p>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {['Visa', 'Mastercard', 'Amex', 'Discover', 'Apple Pay', 'Google Pay'].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center h-7 px-2.5 rounded border border-gray-200 bg-white text-[10px] font-semibold tracking-wide text-gray-500"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
      </div>

      {zoomed && product.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} zoomed in`}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox preview of the same Supabase-hosted product photo */}
          <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close zoomed image"
            className="absolute top-4 right-4 bg-white/90 rounded-full p-2 hover:bg-white"
          >
            <svg aria-hidden="true" className="w-5 h-5 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
