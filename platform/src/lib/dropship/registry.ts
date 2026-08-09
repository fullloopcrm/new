import type { DropshipAdapter } from './types'
import { manualAdapter } from './adapters/manual'
import { printifyAdapter } from './adapters/printify'
import { decryptSecret } from '@/lib/secret-crypto'

// New provider = implement DropshipAdapter in adapters/<name>.ts, add it
// here. Nothing else in the order/fulfillment path changes.
const ADAPTERS: Record<string, DropshipAdapter> = {
  manual: manualAdapter,
  printify: printifyAdapter,
}

export function getAdapter(key: string): DropshipAdapter {
  return ADAPTERS[key] || manualAdapter
}

export function listAdapters(): DropshipAdapter[] {
  return Object.values(ADAPTERS)
}

/** dropship_suppliers.config as stored (apiKey encrypted) -> config an adapter can actually call an API with. */
export function decryptSupplierConfig(config: Record<string, unknown> | null): Record<string, unknown> {
  if (!config) return {}
  if (typeof config.apiKey !== 'string' || !config.apiKey) return config
  return { ...config, apiKey: decryptSecret(config.apiKey) }
}
