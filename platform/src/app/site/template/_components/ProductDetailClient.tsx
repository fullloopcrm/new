'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import JsonLd from '@/app/site/template/_components/JsonLd'
import { buildBusiness, breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import { addToCart, money } from '@/app/site/template/_lib/cart'

export interface ProductDetail {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  category: string | null
  isDigital: boolean
}

export default function ProductDetailClient({ config, product }: { config: SiteConfig; product: ProductDetail }) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const business = buildBusiness(config)

  function handleAdd() {
    for (let i = 0; i < qty; i++) {
      addToCart({ id: product.id, name: product.name, priceCents: product.priceCents, imageUrl: product.imageUrl })
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <JsonLd data={productLd} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: business.url },
          { name: 'Shop', url: `${business.url}/shop` },
          { name: product.name, url: `${business.url}/shop/${product.id}` },
        ])}
      />

      <Link href="/shop" className="text-sm text-gray-500 hover:text-[var(--brand)] inline-flex items-center gap-1 mb-6">
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-[var(--surface)] rounded-2xl relative overflow-hidden">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded product photos live in Supabase Storage, not in next.config's image remotePatterns allowlist
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[rgb(var(--brand-rgb)/0.25)]">
              <svg aria-hidden="true" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 3h17.25M3.375 3v17.25m17.25-17.25v17.25M3.375 20.25h17.25M8.25 9h7.5m-7.5 3.75h7.5" />
              </svg>
            </div>
          )}
        </div>

        <div>
          {product.category && (
            <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-[var(--brand)] bg-[var(--surface)] border border-[rgb(var(--accent-rgb)/0.3)] rounded-full px-2.5 py-1 mb-3">
              {product.category}
            </span>
          )}
          <h1 className="font-[family-name:var(--font-bebas)] text-3xl sm:text-4xl text-[var(--brand)] tracking-wide mb-3">
            {product.name}
          </h1>
          <p className="text-2xl font-bold text-[var(--brand)] mb-5">{money(product.priceCents)}</p>
          {product.description && <p className="text-gray-500 leading-relaxed mb-8">{product.description}</p>}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center border border-gray-200 rounded-md">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[var(--brand)]">−</button>
              <span className="w-8 text-center text-sm">{qty}</span>
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
        </div>
      </div>
    </div>
  )
}
