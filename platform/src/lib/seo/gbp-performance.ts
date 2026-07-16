// ---------------------------------------------------------------------------
// SIGNAL — Google Business Profile performance metrics (Phase 2).
//
// Reuses the same per-tenant OAuth token as gbp.ts (Phase 1) via
// getValidAccessToken — no new consent scope needed. Pulls the Business
// Profile Performance API's daily time series (search/maps impressions,
// calls, direction requests, website clicks) per connected location.
//
// Upserted per (tenant_id, metric_date), not blind-appended: Google's own
// data for the last few days can still be revised after first reported, so
// re-fetching a trailing window and upserting corrects late-arriving counts
// instead of leaving stale rows next to corrected ones.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google'

const PERFORMANCE_ENDPOINT = 'https://businessprofileperformance.googleapis.com/v1'
const DEFAULT_WINDOW_DAYS = 30

const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'WEBSITE_CLICKS',
] as const
type DailyMetric = (typeof DAILY_METRICS)[number]

const METRIC_COLUMN: Record<DailyMetric, string> = {
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: 'views_search_desktop',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: 'views_search_mobile',
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'views_maps_desktop',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'views_maps_mobile',
  CALL_CLICKS: 'calls',
  BUSINESS_DIRECTION_REQUESTS: 'direction_requests',
  WEBSITE_CLICKS: 'website_clicks',
}

type Tenant = { id: string; name: string; google_business: { location_name?: string } | null }

type GoogleDate = { year: number; month: number; day: number }
type DatedValue = { date: GoogleDate; value?: string }
type DailyMetricTimeSeries = { dailyMetric: DailyMetric; timeSeries?: { datedValues?: DatedValue[] } }

type PerformanceRow = {
  tenant_id: string
  location_name: string
  metric_date: string
  checked_at: string
  views_search_desktop?: number
  views_search_mobile?: number
  views_maps_desktop?: number
  views_maps_mobile?: number
  calls?: number
  direction_requests?: number
  website_clicks?: number
}

function toGoogleDate(d: Date): GoogleDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

function fromGoogleDate(d: GoogleDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

function buildQuery(start: GoogleDate, end: GoogleDate): string {
  const params = new URLSearchParams()
  for (const metric of DAILY_METRICS) params.append('dailyMetrics', metric)
  params.set('dailyRange.start_date.year', String(start.year))
  params.set('dailyRange.start_date.month', String(start.month))
  params.set('dailyRange.start_date.day', String(start.day))
  params.set('dailyRange.end_date.year', String(end.year))
  params.set('dailyRange.end_date.month', String(end.month))
  params.set('dailyRange.end_date.day', String(end.day))
  return params.toString()
}

async function fetchPerformance(
  accessToken: string,
  locationName: string,
  start: GoogleDate,
  end: GoogleDate,
): Promise<DailyMetricTimeSeries[]> {
  const url = `${PERFORMANCE_ENDPOINT}/${locationName}:fetchMultiDailyMetricsTimeSeries?${buildQuery(start, end)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Business Profile Performance fetch failed (${res.status}): ${JSON.stringify(json)}`)
  }
  const series = (json?.multiDailyMetricTimeSeries ?? []) as { dailyMetricTimeSeries?: DailyMetricTimeSeries[] }[]
  return series.flatMap((s) => s.dailyMetricTimeSeries ?? [])
}

function toRows(tenantId: string, locationName: string, series: DailyMetricTimeSeries[]): PerformanceRow[] {
  const byDate = new Map<string, PerformanceRow>()
  const checkedAt = new Date().toISOString()

  for (const entry of series) {
    const column = METRIC_COLUMN[entry.dailyMetric]
    if (!column) continue
    for (const dv of entry.timeSeries?.datedValues ?? []) {
      const dateKey = fromGoogleDate(dv.date)
      const row: PerformanceRow =
        byDate.get(dateKey) ?? { tenant_id: tenantId, location_name: locationName, metric_date: dateKey, checked_at: checkedAt }
      ;(row as Record<string, unknown>)[column] = Number(dv.value ?? 0)
      byDate.set(dateKey, row)
    }
  }

  return [...byDate.values()]
}

export type GbpPerformanceScanResult = {
  tenants: number
  scanned: number
  recorded: number
  skipped: string[]
}

export async function runGbpPerformanceScan(opts?: { windowDays?: number }): Promise<GbpPerformanceScanResult> {
  const windowDays = opts?.windowDays ?? DEFAULT_WINDOW_DAYS
  const end = new Date()
  const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const startDate = toGoogleDate(start)
  const endDate = toGoogleDate(end)

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, google_business')
    .not('google_tokens', 'is', null)

  const tenants = ((data ?? []) as Tenant[]).filter((t) => t.google_business?.location_name)
  const out: GbpPerformanceScanResult = { tenants: tenants.length, scanned: 0, recorded: 0, skipped: [] }

  for (const tenant of tenants) {
    const locationName = tenant.google_business!.location_name!
    try {
      const accessToken = await getValidAccessToken(tenant.id)
      if (!accessToken) {
        out.skipped.push(`${tenant.name}: no valid token`)
        continue
      }

      const series = await fetchPerformance(accessToken, locationName, startDate, endDate)
      const rows = toRows(tenant.id, locationName, series)

      if (rows.length) {
        const { error } = await supabaseAdmin
          .from('seo_gbp_performance')
          .upsert(rows, { onConflict: 'tenant_id,metric_date' })
        if (error) throw new Error(`seo_gbp_performance upsert failed: ${error.message}`)
      }

      out.recorded += rows.length
      out.scanned++
    } catch (e) {
      out.skipped.push(`${tenant.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return out
}
