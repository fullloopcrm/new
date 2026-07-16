// ---------------------------------------------------------------------------
// SIGNAL — Google Business Profile drift monitoring (Phase 1).
//
// Reuses the per-tenant OAuth token already granted via the "Connect Google"
// flow (src/lib/google.ts) — no new consent scope needed, since
// business.manage covers every Business Profile API. Reads a wider
// readMask than the one-time connect-time snapshot
// (src/app/api/google/callback/route.ts) so we can detect drift in fields
// that snapshot never captured: phone, hours, categories.
//
// State table, not a time series: seo_gbp_profile holds one row per tenant
// (upsert), diffed against the previous run. A real change fires a
// `notifications` row (same pattern sync-google-reviews already uses) —
// "someone changed your Google listing" is a business-relevant signal,
// not noise to trend.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google'

const BUSINESS_INFO_ENDPOINT = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const READ_MASK = 'title,phoneNumbers,storefrontAddress,regularHours,specialHours,categories,profile'

type Tenant = { id: string; name: string; google_business: { location_name?: string } | null }

type GbpFields = {
  title: string | null
  phone_numbers: Record<string, unknown>
  address: Record<string, unknown>
  regular_hours: Record<string, unknown>
  special_hours: Record<string, unknown>
  categories: Record<string, unknown>
}

type GbpSnapshotRow = GbpFields & {
  tenant_id: string
  location_name: string
  raw: Record<string, unknown>
  checked_at: string
}

const DIFF_FIELDS = ['title', 'phone_numbers', 'address', 'regular_hours', 'special_hours', 'categories'] as const

function fieldLabel(field: (typeof DIFF_FIELDS)[number]): string {
  switch (field) {
    case 'title': return 'business name'
    case 'phone_numbers': return 'phone number'
    case 'address': return 'address'
    case 'regular_hours': return 'hours'
    case 'special_hours': return 'special hours'
    case 'categories': return 'category'
  }
}

async function fetchProfile(accessToken: string, locationName: string): Promise<Record<string, unknown>> {
  const url = `${BUSINESS_INFO_ENDPOINT}/${locationName}?readMask=${READ_MASK}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Business Information fetch failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json as Record<string, unknown>
}

function toFields(raw: Record<string, unknown>): GbpFields {
  return {
    title: (raw.title as string) ?? null,
    phone_numbers: (raw.phoneNumbers as Record<string, unknown>) ?? {},
    address: (raw.storefrontAddress as Record<string, unknown>) ?? {},
    regular_hours: (raw.regularHours as Record<string, unknown>) ?? {},
    special_hours: (raw.specialHours as Record<string, unknown>) ?? {},
    categories: (raw.categories as Record<string, unknown>) ?? {},
  }
}

function diffFields(prev: GbpFields, next: GbpFields): string[] {
  return DIFF_FIELDS.filter((f) => JSON.stringify(prev[f]) !== JSON.stringify(next[f])).map(fieldLabel)
}

export type GbpScanResult = {
  tenants: number
  scanned: number
  changed: number
  skipped: string[]
}

export async function runGbpProfileScan(): Promise<GbpScanResult> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, google_business')
    .not('google_tokens', 'is', null)

  const tenants = ((data ?? []) as Tenant[]).filter((t) => t.google_business?.location_name)
  const out: GbpScanResult = { tenants: tenants.length, scanned: 0, changed: 0, skipped: [] }

  for (const tenant of tenants) {
    const locationName = tenant.google_business!.location_name!
    try {
      const accessToken = await getValidAccessToken(tenant.id)
      if (!accessToken) {
        out.skipped.push(`${tenant.name}: no valid token`)
        continue
      }

      const raw = await fetchProfile(accessToken, locationName)
      const fields = toFields(raw)

      const { data: prevRow } = await supabaseAdmin
        .from('seo_gbp_profile')
        .select('title, phone_numbers, address, regular_hours, special_hours, categories')
        .eq('tenant_id', tenant.id)
        .single()

      if (prevRow) {
        const changedFields = diffFields(prevRow as GbpFields, fields)
        if (changedFields.length > 0) {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenant.id,
            type: 'gbp_profile_changed',
            title: 'Google Business Profile changed',
            message: `Your Google listing's ${changedFields.join(', ')} changed since the last check. Verify it still matches your booking info.`,
          })
          out.changed++
        }
      }

      const snapshot: GbpSnapshotRow = {
        tenant_id: tenant.id,
        location_name: locationName,
        ...fields,
        raw,
        checked_at: new Date().toISOString(),
      }
      const { error } = await supabaseAdmin
        .from('seo_gbp_profile')
        .upsert(snapshot, { onConflict: 'tenant_id' })
      if (error) throw new Error(`seo_gbp_profile upsert failed: ${error.message}`)

      out.scanned++
    } catch (e) {
      out.skipped.push(`${tenant.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return out
}
