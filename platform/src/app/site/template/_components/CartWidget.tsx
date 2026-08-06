'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { type CartLine, readCart, onCartChange, setQty, removeFromCart, cartTotals, money } from '@/app/site/template/_lib/cart'

// Top-right cart icon + dropdown, mounted in the nav so it's present on
// every page — not just /shop. Reads the shared cart lib; stays in sync with
// the Shop page (and itself) via the same-tab cart-updated event.
export default function CartWidget() {
  const [lines, setLines] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLines(readCart())
    return onCartChange(() => setLines(readCart()))
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const { itemCount, subtotalCents } = cartTotals(lines)

  async function checkout() {
    setError('')
    setCheckingOut(true)
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: lines.map((l) => ({ id: l.id, qty: l.qty })) }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) {
        setError((data && data.error) || 'Could not start checkout. Try again.')
        return
      }
      // Opens Stripe Checkout in its own tab instead of navigating the store
      // away — the customer keeps their place on the site if they back out.
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Could not start checkout. Try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Shopping cart"
        aria-expanded={open}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-[rgb(var(--accent-rgb)/0.15)] transition-colors"
      >
        <svg aria-hidden="true" className="w-6 h-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.693 2.417-7.151a1.125 1.125 0 00-1.107-1.34H5.106M7.5 14.25L5.106 5.099M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-[var(--brand)] text-[10px] font-bold flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-[110]">
          <h3 className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand)] tracking-wide mb-3">Your Cart</h3>

          {lines.length === 0 ? (
            <p className="text-gray-400 text-sm">Your cart is empty.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="w-11 h-11 flex-shrink-0 rounded-md bg-[var(--surface)] overflow-hidden">
                    {l.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded product photos aren't in next.config's image remotePatterns allowlist
                      <img src={l.imageUrl} alt={l.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--brand)] truncate">{l.name}</p>
                    <p className="text-xs text-gray-400">{money(l.priceCents)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button type="button" aria-label={`Decrease ${l.name} quantity`} onClick={() => setQty(l.id, l.qty - 1)} className="w-5 h-5 rounded border border-gray-200 text-gray-500 hover:border-[var(--accent)] flex items-center justify-center text-xs">−</button>
                    <span className="w-4 text-center text-xs">{l.qty}</span>
                    <button type="button" aria-label={`Increase ${l.name} quantity`} onClick={() => setQty(l.id, l.qty + 1, l)} className="w-5 h-5 rounded border border-gray-200 text-gray-500 hover:border-[var(--accent)] flex items-center justify-center text-xs">+</button>
                    <button type="button" aria-label={`Remove ${l.name} from cart`} onClick={() => removeFromCart(l.id)} className="w-5 h-5 rounded text-gray-400 hover:text-red-500 flex items-center justify-center text-xs ml-1">
                      <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--brand)]">Subtotal</span>
            <span className="text-base font-bold text-[var(--brand)]">{money(subtotalCents)}</span>
          </div>

          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

          <button
            type="button"
            disabled={lines.length === 0 || checkingOut}
            onClick={checkout}
            className="w-full bg-[var(--brand)] text-white py-2.5 rounded-md font-bold text-xs tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-2"
          >
            {checkingOut ? 'Redirecting…' : 'Checkout'}
          </button>
          <Link href="/shop" onClick={() => setOpen(false)} className="block text-center text-xs text-[var(--brand)] hover:underline mb-2">
            View Shop
          </Link>
          {lines.length > 0 && (
            <p className="text-center text-[10px] text-gray-400">
              By checking out you agree to our{' '}
              <Link href="/refund-policy" onClick={() => setOpen(false)} className="underline">Refund Policy</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
