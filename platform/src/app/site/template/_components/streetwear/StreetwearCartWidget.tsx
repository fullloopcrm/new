'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { type CartLine, readCart, onCartChange, setQty, removeFromCart, cartTotals, money } from '@/app/site/template/_lib/cart'

// Dark-themed cart trigger for the streetwear nav. Reuses the shared cart lib
// (same localStorage key + checkout endpoint as CartWidget) so items added
// here show up identically at /shop — a separate component only because
// CartWidget's icon hardcodes text-[var(--brand)], which is white-on-black
// on the default template's white nav and would render invisible (black on
// black) once --brand is repointed to Urban Co's near-black theme color.
export default function StreetwearCartWidget() {
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
        body: JSON.stringify({ cart: lines.map((l) => ({ id: l.productId, qty: l.qty, color: l.color, size: l.size })) }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) {
        setError((data && data.error) || 'Could not start checkout. Try again.')
        return
      }
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
        className="relative inline-flex items-center justify-center w-10 h-10 hover:bg-white/10 transition-colors"
      >
        <svg aria-hidden="true" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.693 2.417-7.151a1.125 1.125 0 00-1.107-1.34H5.106M7.5 14.25L5.106 5.099M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        {itemCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-[var(--accent)] text-black text-[10px] font-[family-name:var(--font-plex-mono)] font-semibold flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-black border border-white/15 p-4 z-[110]">
          <h3 className="font-[family-name:var(--font-anton)] text-lg text-white tracking-wide uppercase mb-3">Cart</h3>

          {lines.length === 0 ? (
            <p className="text-white/40 text-sm font-[family-name:var(--font-plex-mono)]">Empty.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="w-11 h-11 flex-shrink-0 bg-white/5 overflow-hidden">
                    {l.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- external stock/product photo, not in next.config's image remotePatterns allowlist
                      <img src={l.imageUrl} alt={l.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{l.name}</p>
                    {(l.color || l.size) && (
                      <p className="text-[11px] text-white/50">{[l.color, l.size].filter(Boolean).join(' / ')}</p>
                    )}
                    <p className="text-xs text-white/40 font-[family-name:var(--font-plex-mono)]">{money(l.priceCents)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button type="button" aria-label={`Decrease ${l.name} quantity`} onClick={() => setQty(l.id, l.qty - 1)} className="w-5 h-5 border border-white/20 text-white/70 hover:border-[var(--accent)] hover:text-[var(--accent)] flex items-center justify-center text-xs">−</button>
                    <span className="w-4 text-center text-xs text-white font-[family-name:var(--font-plex-mono)]">{l.qty}</span>
                    <button type="button" aria-label={`Increase ${l.name} quantity`} onClick={() => setQty(l.id, l.qty + 1, l)} className="w-5 h-5 border border-white/20 text-white/70 hover:border-[var(--accent)] hover:text-[var(--accent)] flex items-center justify-center text-xs">+</button>
                    <button type="button" aria-label={`Remove ${l.name} from cart`} onClick={() => removeFromCart(l.id)} className="w-5 h-5 text-white/40 hover:text-red-400 flex items-center justify-center text-xs ml-1">
                      <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/15 pt-3 flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white uppercase tracking-wide">Subtotal</span>
            <span className="text-base font-[family-name:var(--font-plex-mono)] font-semibold text-[var(--accent)]">{money(subtotalCents)}</span>
          </div>

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          <button
            type="button"
            disabled={lines.length === 0 || checkingOut}
            onClick={checkout}
            className="w-full bg-[var(--accent)] text-black py-2.5 font-bold text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed mb-2"
          >
            {checkingOut ? 'Redirecting…' : 'Checkout'}
          </button>
          <Link href="/shop" onClick={() => setOpen(false)} className="block text-center text-xs text-white/60 hover:text-white mb-2">
            View Shop
          </Link>
          {lines.length > 0 && (
            <p className="text-center text-[10px] text-white/30">
              By checking out you agree to our{' '}
              <Link href="/refund-policy" onClick={() => setOpen(false)} className="underline">Refund Policy</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
