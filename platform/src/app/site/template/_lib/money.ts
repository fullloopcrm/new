// Plain formatter, no 'use client' — importable from server components
// (StreetwearHome) as well as client components (cart.ts re-exports it for
// existing callers like CartWidget/ShopClient, unchanged).
export function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
