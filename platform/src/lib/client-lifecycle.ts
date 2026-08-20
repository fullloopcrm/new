import { tenantDb } from '@/lib/tenant-db'
import { getSettings } from '@/lib/settings'

export type ClientLifecycle = 'active' | 'at_risk' | 'churned'

interface BookingRow {
  client_id: string | null
  start_time: string
}

// Same definition as GET /api/clients/analytics: lifecycle is driven by the
// most recent completed/paid booking against the tenant's configured
// active/at-risk thresholds, not the free-text clients.status field.
export async function getClientLifecycleMap(tenantId: string): Promise<Map<string, ClientLifecycle>> {
  const db = tenantDb(tenantId)
  const settings = await getSettings(tenantId)
  const dayMs = 24 * 60 * 60 * 1000
  const activeCutoff = new Date(Date.now() - settings.active_client_threshold_days * dayMs).toISOString()
  const atRiskCutoff = new Date(Date.now() - settings.at_risk_threshold_days * dayMs).toISOString()

  const { data: bookings } = await db
    .from('bookings')
    .select('client_id, start_time')
    .in('status', ['completed', 'paid'])

  const lastBookingByClient = new Map<string, string>()
  for (const b of (bookings as BookingRow[] | null) || []) {
    if (!b.client_id) continue
    const existing = lastBookingByClient.get(b.client_id)
    if (!existing || b.start_time > existing) lastBookingByClient.set(b.client_id, b.start_time)
  }

  const result = new Map<string, ClientLifecycle>()
  for (const [clientId, lastBooking] of lastBookingByClient) {
    result.set(clientId, lastBooking >= activeCutoff ? 'active' : lastBooking >= atRiskCutoff ? 'at_risk' : 'churned')
  }
  return result
}

// Applies a campaign recipient_filter ('all' | 'active' | 'at_risk' | 'churned' | 'new')
// against a client list. Clients with no completed/paid booking history are
// treated as churned (never active, never at-risk) unless they're a 'new' signup.
export function filterClientsByRecipientFilter<T extends { id: string; created_at?: string | null }>(
  clients: T[],
  filter: string,
  lifecycleMap: Map<string, ClientLifecycle>
): T[] {
  if (filter === 'all' || !filter) return clients
  if (filter === 'new') {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    return clients.filter((c) => c.created_at && new Date(c.created_at).getTime() >= cutoff)
  }
  if (filter === 'active' || filter === 'at_risk' || filter === 'churned') {
    return clients.filter((c) => (lifecycleMap.get(c.id) || 'churned') === filter)
  }
  return clients
}
