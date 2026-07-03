/**
 * Sales pipeline — stage definitions + forecast math.
 */

// Unified spine (matches the DB check constraint + the kanban). Labels are the
// operator-facing words; values are the locked stage keys.
export const PIPELINE_STAGES = [
  { value: 'new', label: 'Lead', color: 'bg-slate-100 text-slate-700', defaultProbability: 10 },
  { value: 'qualifying', label: 'Qualify', color: 'bg-blue-50 text-blue-700', defaultProbability: 25 },
  { value: 'quoted', label: 'Quote', color: 'bg-violet-50 text-violet-700', defaultProbability: 50 },
  { value: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700', defaultProbability: 80 },
  { value: 'sold', label: 'Sold', color: 'bg-green-50 text-green-700', defaultProbability: 100 },
  { value: 'lost', label: 'Lost', color: 'bg-red-50 text-red-600', defaultProbability: 0 },
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['value']
export const OPEN_STAGES: PipelineStage[] = ['new', 'qualifying', 'quoted', 'pending']
export const CLOSED_STAGES: PipelineStage[] = ['sold', 'lost']

export function stageMeta(stage: string) {
  return PIPELINE_STAGES.find(s => s.value === stage) || PIPELINE_STAGES[0]
}

export interface DealForForecast {
  stage: string
  status: string
  value_cents: number | null
  probability: number | null
  expected_close_date: string | null
}

export interface ForecastBucket {
  label: string
  deals: number
  totalValueCents: number
  weightedValueCents: number
}

/**
 * Weighted forecast by month. Sum of (value × probability / 100) grouped
 * by expected_close_date year+month. Only OPEN stages included.
 */
export function computeForecast(deals: DealForForecast[], monthsAhead = 6): ForecastBucket[] {
  const buckets = new Map<string, ForecastBucket>()
  const now = new Date()
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    buckets.set(key, { label, deals: 0, totalValueCents: 0, weightedValueCents: 0 })
  }
  for (const d of deals) {
    if (!OPEN_STAGES.includes(d.stage as PipelineStage)) continue
    if (d.status && d.status !== 'active') continue
    if (!d.expected_close_date) continue
    const close = new Date(d.expected_close_date)
    const key = `${close.getUTCFullYear()}-${String(close.getUTCMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)
    if (!bucket) continue
    const val = Number(d.value_cents) || 0
    const prob = Number(d.probability) || 0
    bucket.deals += 1
    bucket.totalValueCents += val
    bucket.weightedValueCents += Math.round((val * prob) / 100)
  }
  return Array.from(buckets.values())
}

export function computeStageTotals(deals: DealForForecast[]) {
  const totals = new Map<string, { count: number; totalCents: number; weightedCents: number }>()
  for (const d of deals) {
    if (d.status && d.status !== 'active') continue
    const key = d.stage || 'lead'
    if (!totals.has(key)) totals.set(key, { count: 0, totalCents: 0, weightedCents: 0 })
    const b = totals.get(key)!
    b.count += 1
    const val = Number(d.value_cents) || 0
    const prob = Number(d.probability) || 0
    b.totalCents += val
    b.weightedCents += Math.round((val * prob) / 100)
  }
  return totals
}
