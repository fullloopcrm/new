import type { DropshipAdapter } from './types'
import { manualAdapter } from './adapters/manual'
import { printifyAdapter } from './adapters/printify'
import { printfulAdapter } from './adapters/printful'
import { gootenAdapter } from './adapters/gooten'
import { apliiqAdapter } from './adapters/apliiq'
import { decryptSecret } from '@/lib/secret-crypto'

// New provider = implement DropshipAdapter in adapters/<name>.ts, add it
// here. Nothing else in the order/fulfillment path changes.
const ADAPTERS: Record<string, DropshipAdapter> = {
  manual: manualAdapter,
  printify: printifyAdapter,
  printful: printfulAdapter,
  gooten: gootenAdapter,
  apliiq: apliiqAdapter,
}

export function getAdapter(key: string): DropshipAdapter {
  return ADAPTERS[key] || manualAdapter
}

export function listAdapters(): DropshipAdapter[] {
  return Object.values(ADAPTERS)
}

/** dropship_suppliers.config as stored (secrets encrypted) -> config an adapter can actually call an API with. */
export function decryptSupplierConfig(config: Record<string, unknown> | null): Record<string, unknown> {
  if (!config) return {}
  const decrypted = { ...config }
  if (typeof decrypted.apiKey === 'string' && decrypted.apiKey) decrypted.apiKey = decryptSecret(decrypted.apiKey)
  if (typeof decrypted.sharedSecret === 'string' && decrypted.sharedSecret) decrypted.sharedSecret = decryptSecret(decrypted.sharedSecret)
  return decrypted
}
