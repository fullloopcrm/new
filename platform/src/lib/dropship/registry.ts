import type { DropshipAdapter } from './types'
import { manualAdapter } from './adapters/manual'

// New provider = implement DropshipAdapter in adapters/<name>.ts, add it
// here. Nothing else in the order/fulfillment path changes.
const ADAPTERS: Record<string, DropshipAdapter> = {
  manual: manualAdapter,
}

export function getAdapter(key: string): DropshipAdapter {
  return ADAPTERS[key] || manualAdapter
}

export function listAdapters(): DropshipAdapter[] {
  return Object.values(ADAPTERS)
}
