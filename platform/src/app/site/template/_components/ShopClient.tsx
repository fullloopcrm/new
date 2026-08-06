'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import JsonLd from '@/app/site/template/_components/JsonLd'
import { buildBusiness, productItemListSchema, breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import { addToCart, money } from '@/app/site/template/_lib/cart'

export interface ShopProduct {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  category: string | null
}

export default function ShopClient({ config, products }: { config: SiteConfig; products: ShopProduct[] }) {
  const [addedId, setAddedId] = useState<string | null>(null)

  function handleAdd(product: ShopProduct) {
    addToCart({ id: product.id, name: product.name, priceCents: product.priceCents, imageUrl: product.imageUrl })
    setAddedId(product.id)
    window.setTimeout(() => setAddedId((cur) => (cur === product.id ? null : cur)), 1200)
  }

  const business = buildBusiness(config)

  return (
    <>
      {products.length > 0 && <JsonLd data={productItemListSchema(business, products)} />}
      <JsonLd data={breadcrumbSchema([{ name: 'Home', url: business.url }, { name: 'Shop', url: `${business.url}/shop` }])} />

      <div className="bg-[var(--brand)] text-white py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-[var(--brand)] bg-[var(--accent)] rounded-full px-2.5 py-1 mb-3">
            Official Store
          </span>
          <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-1">Shop</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-2xl sm:text-3xl tracking-wide mb-3">
            {config.identity.name}
          </h1>
          <p className="text-white/70 text-sm max-w-xl leading-relaxed">
            Welcome to the {config.identity.name} store — hand-picked gear from the team you already trust for {config.industry}. Browse below, add what you like, and check out securely in a couple of taps.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {products.length === 0 ? (
          <div className="border border-gray-200 rounded-2xl p-10 text-center text-gray-500 bg-white">
            No products available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => (
              <div key={product.id} className="group border border-gray-200 rounded-2xl overflow-hidden bg-white hover:border-[var(--accent)] hover:shadow-lg transition-all flex flex-col">
                <Link href={`/shop/${product.id}`} className="block">
                  <div className="aspect-square bg-[var(--surface)] relative overflow-hidden">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded product photos live in Supabase Storage, not in next.config's image remotePatterns allowlist (same reasoning as CatalogTab.tsx)
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[rgb(var(--brand-rgb)/0.25)]">
                        <svg aria-hidden="true" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 3h17.25M3.375 3v17.25m17.25-17.25v17.25M3.375 20.25h17.25M8.25 9h7.5m-7.5 3.75h7.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-5 flex flex-col flex-1">
                  {product.category && (
                    <span className="inline-block self-start text-[10px] font-semibold tracking-widest uppercase text-[var(--brand)] bg-[var(--surface)] border border-[rgb(var(--accent-rgb)/0.3)] rounded-full px-2.5 py-1 mb-2">
                      {product.category}
                    </span>
                  )}
                  <Link href={`/shop/${product.id}`}>
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-1 hover:underline">{product.name}</h3>
                  </Link>
                  {product.description && <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">{product.description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-[var(--brand)] font-bold text-lg">{money(product.priceCents)}</span>
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      className="bg-[var(--accent)] text-[var(--brand)] px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors min-w-[64px]"
                    >
                      {addedId === product.id ? 'Added ✓' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
