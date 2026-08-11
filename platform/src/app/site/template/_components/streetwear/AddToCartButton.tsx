'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addToCart } from '@/app/site/template/_lib/cart'

interface Product {
  id: string
  name: string
  priceCents: number
  imageUrl: string | null
  colorOptions?: string[]
  sizeOptions?: string[]
}

// Small add-to-cart trigger used inside server-rendered product tiles
// (StreetwearHome, StreetwearShopGrid) — isolated as its own client component
// so the parent grid can stay a server component and fetch products directly.
// Products with color/size options route to the PDP instead of quick-adding —
// silently picking a default variant hides the choice from the customer.
export default function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false)
  const hasOptions = (product.colorOptions?.length || 0) > 0 || (product.sizeOptions?.length || 0) > 0

  if (hasOptions) {
    return (
      <Link
        href={`/shop/${product.id}`}
        className="inline-block bg-[var(--accent)] text-black px-3 py-1.5 font-bold text-[11px] tracking-widest uppercase hover:bg-white transition-colors"
      >
        Select Options
      </Link>
    )
  }

  function handleAdd() {
    addToCart(product)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1200)
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="bg-[var(--accent)] text-black px-3 py-1.5 font-bold text-[11px] tracking-widest uppercase hover:bg-white transition-colors"
    >
      {added ? 'Added' : 'Add'}
    </button>
  )
}
