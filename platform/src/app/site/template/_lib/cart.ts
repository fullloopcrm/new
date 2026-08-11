'use client'

// Shared shopping cart — full line-item snapshots (not just id->qty) so any
// component (nav widget, shop grid) can render cart contents without a
// products lookup of its own. localStorage + a same-tab custom event, since
// the native 'storage' event doesn't fire in the tab that made the write.
//
// `id` is the LINE identity (productId + color + size combo) so the same
// product in two different colors/sizes stacks as two separate lines instead
// of colliding into one. `productId` is kept separately since that's what
// checkout re-reads price/name from.
export interface CartLine {
  id: string
  productId: string
  name: string
  priceCents: number
  imageUrl: string | null
  qty: number
  color?: string
  size?: string
}

export interface CartProduct {
  id: string
  name: string
  priceCents: number
  imageUrl: string | null
  color?: string
  size?: string
}

const CART_STORAGE_KEY = 'fl-shop-cart-v2'
const CART_EVENT = 'fl-shop-cart-updated'

function lineId(productId: string, color?: string, size?: string): string {
  return [productId, color || '', size || ''].join('::')
}

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    // Back-compat: pre-variant carts had no productId — treat id as productId.
    return parsed.map((l: CartLine) => ({ ...l, productId: l.productId || l.id }))
  } catch {
    return []
  }
}

function writeCart(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
  } catch {
    // storage unavailable (private mode, quota) — cart just won't persist
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

export function onCartChange(handler: () => void): () => void {
  window.addEventListener(CART_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CART_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function setQty(id: string, qty: number, product?: CartProduct): void {
  const lines = readCart()
  const idx = lines.findIndex((l) => l.id === id)
  if (qty <= 0) {
    if (idx !== -1) writeCart(lines.filter((l) => l.id !== id))
    return
  }
  const clampedQty = Math.min(20, qty)
  if (idx !== -1) {
    const next = [...lines]
    next[idx] = { ...next[idx], qty: clampedQty }
    writeCart(next)
  } else if (product) {
    const { id: productId, color, size, ...rest } = product
    writeCart([...lines, { id, productId, color, size, qty: clampedQty, ...rest }])
  }
}

export function removeFromCart(id: string): void {
  setQty(id, 0)
}

export function addToCart(product: CartProduct): void {
  const id = lineId(product.id, product.color, product.size)
  const lines = readCart()
  const existing = lines.find((l) => l.id === id)
  setQty(id, (existing?.qty || 0) + 1, product)
}

export function cartTotals(lines: CartLine[]): { itemCount: number; subtotalCents: number } {
  return lines.reduce(
    (acc, l) => ({ itemCount: acc.itemCount + l.qty, subtotalCents: acc.subtotalCents + l.qty * l.priceCents }),
    { itemCount: 0, subtotalCents: 0 }
  )
}

// Re-exported for existing client-component callers (CartWidget, ShopClient,
// StreetwearCartWidget) — the implementation lives in money.ts, a plain
// module with no 'use client' directive, so server components (StreetwearHome)
// can import money() directly without pulling in this client-only file.
export { money } from './money'
