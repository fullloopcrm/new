'use client'

// Shared shopping cart — full line-item snapshots (not just id->qty) so any
// component (nav widget, shop grid) can render cart contents without a
// products lookup of its own. localStorage + a same-tab custom event, since
// the native 'storage' event doesn't fire in the tab that made the write.
export interface CartLine {
  id: string
  name: string
  priceCents: number
  imageUrl: string | null
  qty: number
}

const CART_STORAGE_KEY = 'fl-shop-cart-v2'
const CART_EVENT = 'fl-shop-cart-updated'

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
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

export function setQty(id: string, qty: number, product?: { name: string; priceCents: number; imageUrl: string | null }): void {
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
    writeCart([...lines, { id, qty: clampedQty, ...product }])
  }
}

export function removeFromCart(id: string): void {
  setQty(id, 0)
}

export function addToCart(product: { id: string; name: string; priceCents: number; imageUrl: string | null }): void {
  const lines = readCart()
  const existing = lines.find((l) => l.id === product.id)
  setQty(product.id, (existing?.qty || 0) + 1, product)
}

export function cartTotals(lines: CartLine[]): { itemCount: number; subtotalCents: number } {
  return lines.reduce(
    (acc, l) => ({ itemCount: acc.itemCount + l.qty, subtotalCents: acc.subtotalCents + l.qty * l.priceCents }),
    { itemCount: 0, subtotalCents: 0 }
  )
}

export function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
