/**
 * ALL-TRADES SIMULATION — Phase 1: full onboarding lifecycle across every vertical.
 *
 * For each of the 15 IndustryKeys, acts as a business owner (Jeff Tucker) and drives:
 *   lead (prospect) → qualify (approve) → sell (tenant row) → onboard (provisionTenant)
 *   → verify services/config/checklist/payment/hours/guidelines/invite → idempotency
 *   → clean up all test-* rows.
 *
 * Exercises REAL libs (mapIndustry, provisionTenant, signupPricing). No Stripe, no external
 * comms. Owner contact = Jeff so any owner notification routes to him.
 *
 * USAGE: cd platform && npx tsx scripts/sim-all-trades.ts
 *   SIM_PERSIST=1  keep the tenants (default: clean up)
 *   SIM_ONLY=cleaning,pest   run a subset
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'

// ---- env ----
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\\n$/, '')
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1) }
// Guarantee no real emails fire during the sim (platform Resend disabled).
process.env.RESEND_API_KEY = 'placeholder'
const supabase = createClient(url, key, { auth: { persistSession: false } })

const OWNER = { name: 'Jeff Tucker', email: 'fullloopcrm@gmail.com', phone: '+12122029220' }
const PERSIST = process.env.SIM_PERSIST === '1'
const ONLY = (process.env.SIM_ONLY || '').split(',').map(s => s.trim()).filter(Boolean)

import type { IndustryKey } from '../src/lib/provision-tenant'
import { SERVICE_PRESETS } from '../src/lib/industry-presets'

const VALID_INDUSTRIES = Object.keys(SERVICE_PRESETS)

const CITIES = [
  { city: 'Austin', state: 'TX', zip: '78701' }, { city: 'Charlotte', state: 'NC', zip: '28202' },
  { city: 'Phoenix', state: 'AZ', zip: '85004' }, { city: 'Denver', state: 'CO', zip: '80202' },
  { city: 'Columbus', state: 'OH', zip: '43215' }, { city: 'Tampa', state: 'FL', zip: '33602' },
  { city: 'Nashville', state: 'TN', zip: '37203' }, { city: 'Kansas City', state: 'MO', zip: '64106' },
]

// ALL 53 territory-map service_categories + "Other". model = the trade's primary
// shape in the ONE system: 'service' = booking business (short/1-day; self-book →
// pending → smart-schedule), 'project' = lead business (sales pipeline; can run
// days→a year → the project calendar view). Every tenant runs BOTH paths here;
// model is the per-trade lens Jeff asked for. `industry` is resolved at runtime by
// the real mapIndustry() — trades with no specific vertical fall to 'general'.
const TRADES: Array<{ category: string; model: 'service' | 'project' }> = [
  { category: 'Aging-in-Place / Home Accessibility Mods', model: 'project' },
  { category: 'Air Duct & Dryer Vent Cleaning', model: 'service' },
  { category: 'Appliance Repair', model: 'service' },
  { category: 'Carpet & Upholstery Cleaning', model: 'service' },
  { category: 'Chimney Sweep', model: 'service' },
  { category: 'Concrete & Masonry', model: 'project' },
  { category: 'Deck Building', model: 'project' },
  { category: 'Demolition', model: 'project' },
  { category: 'Drywall Repair', model: 'project' },
  { category: 'Electrical', model: 'service' },
  { category: 'Epoxy / Garage Floor Coating', model: 'project' },
  { category: 'Fencing', model: 'project' },
  { category: 'Fire Damage Restoration', model: 'project' },
  { category: 'Flooring Installation', model: 'project' },
  { category: 'Foundation & Waterproofing', model: 'project' },
  { category: 'Garage Door Repair', model: 'service' },
  { category: 'Gutter Cleaning', model: 'service' },
  { category: 'Handyman', model: 'service' },
  { category: 'Holiday / Christmas Light Installation', model: 'service' },
  { category: 'Home Inspection', model: 'service' },
  { category: 'House Cleaning', model: 'service' },
  { category: 'HVAC', model: 'service' },
  { category: 'Insulation', model: 'project' },
  { category: 'Irrigation / Sprinklers', model: 'service' },
  { category: 'Junk Removal & Hauling', model: 'service' },
  { category: 'Landscaping', model: 'project' },
  { category: 'Lawn Care', model: 'service' },
  { category: 'Locksmith', model: 'service' },
  { category: 'Mobile Car Detailing', model: 'service' },
  { category: 'Mobile Pet Grooming', model: 'service' },
  { category: 'Mold Remediation', model: 'project' },
  { category: 'Moving Services', model: 'project' },
  { category: 'Painting', model: 'project' },
  { category: 'Paving', model: 'project' },
  { category: 'Pest Control', model: 'service' },
  { category: 'Pet Waste Removal', model: 'service' },
  { category: 'Plumbing', model: 'service' },
  { category: 'Pool Cleaning & Maintenance', model: 'service' },
  { category: 'Post-Construction Cleaning', model: 'service' },
  { category: 'Pressure Washing', model: 'service' },
  { category: 'Remodeling / General Contracting', model: 'project' },
  { category: 'Replacement Windows & Doors', model: 'project' },
  { category: 'Roofing', model: 'project' },
  { category: 'Septic Services', model: 'service' },
  { category: 'Siding Installation', model: 'project' },
  { category: 'Smart Home & Security Installation', model: 'project' },
  { category: 'Snow Removal', model: 'service' },
  { category: 'Solar Panel Installation', model: 'project' },
  { category: 'Stucco Repair', model: 'project' },
  { category: 'Trash Bin / Garbage Can Cleaning', model: 'service' },
  { category: 'Tree Service', model: 'service' },
  { category: 'Water Damage Restoration', model: 'project' },
  { category: 'Window Cleaning', model: 'service' },
  { category: 'Other', model: 'service' }, // freeform → verifies unknown-trade fallback to 'general'
]

// Redirect from Jeff (2026-07-16 12:37): sim as REAL tenants using EVERY feature,
// trade-specific, not mechanical CRUD checks. W3's archetype = emergency/24-7
// businesses (a burst pipe, a dead AC in a heat wave, a fire last night — these
// customers don't accept "next Tuesday"). "Towing" was named in the split but has
// no matching territory service_category in TRADES above (not in migrations/
// territory data either) — flagged to leader, not invented here. Restoration
// covers the fire/water/mold trio, all mapping to the single 'restoration'
// IndustryKey. Real customer language + the REAL seeded service name for each
// trade (industry-presets.ts), not synthetic pricing.
const EMERGENCY_SCENARIOS: Record<string, { complaint: string; emergencyServiceNames: string[] }> = {
  'Plumbing': {
    complaint: 'Burst pipe under the kitchen sink, water pooling across the floor, need someone out TODAY before it hits the hallway',
    emergencyServiceNames: ['Emergency Plumbing'],
  },
  'HVAC': {
    complaint: "AC compressor died overnight, it's 97 out and there's a newborn in the house, need same-day service",
    emergencyServiceNames: ['Emergency', '24/7'], // no match expected — see P11.2 finding below
  },
  'Fire Damage Restoration': {
    complaint: 'Kitchen fire last night, smoke damage through the first floor, insurance adjuster comes in 48 hours, need board-up + assessment ASAP',
    emergencyServiceNames: ['Fire & Smoke Restoration'],
  },
  'Water Damage Restoration': {
    complaint: 'Water heater burst overnight, standing water in the basement, mold risk if it is not dried within 24 hours',
    emergencyServiceNames: ['Water Damage Extraction'],
  },
  'Mold Remediation': {
    complaint: 'Found black mold behind the drywall after a slow leak — closing on the house in 5 days and the inspector flagged it',
    emergencyServiceNames: ['Mold Remediation'],
  },
}

type Check = { name: string; pass: boolean; detail?: string }
type TradeResult = { category: string; industry: string; model: string; passed: number; failed: number; failures: string[]; ms: number; leftovers: string[] }

function slugify(name: string, id: string): string {
  return 'sim-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + id.slice(0, 6)
}

async function runTrade(t: (typeof TRADES)[number], idx: number): Promise<TradeResult> {
  const t0 = Date.now()
  const checks: Check[] = []
  const leftovers: string[] = []
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail })

  const runId = `${idx}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
  const loc = CITIES[idx % CITIES.length]

  // ---- P1.0 mapIndustry (real trade name → canonical vertical) ----
  const { mapIndustry } = await import('../src/lib/provision-tenant')
  const ind = mapIndustry(t.category)
  const bizName = `SIM ${t.category} ${runId}`
  add(`mapIndustry("${t.category}") → valid vertical`, VALID_INDUSTRIES.includes(ind), `got ${ind}`)
  // "add the missing": every REAL trade must resolve to its own specific vertical.
  // Only the freeform "Other" is allowed to fall back to 'general'.
  add(`trade → specific vertical (not generic)`, t.category === 'Other' ? ind === 'general' : ind !== 'general', ind)

  let tenantId: string | null = null
  let prospectId: string | null = null
  let dealId: string | null = null
  try {
    // ---- P1.1 LEAD: prospect (as if partnership form / qualify submitted) ----
    const { data: prospect, error: pErr } = await supabase.from('prospects').insert({
      business_name: bizName, owner_name: OWNER.name, owner_email: OWNER.email, owner_phone: OWNER.phone,
      trade: t.category, primary_city: loc.city, primary_state: loc.state, primary_zip: loc.zip,
      paid_tier: 'growth', status: 'new',
    }).select('id, business_name, status').single()
    add('lead: prospect created', !!prospect && !pErr, pErr?.message)
    if (!prospect) throw new Error('prospect insert failed: ' + pErr?.message)
    prospectId = prospect.id

    // ---- P1.2 QUALIFY: approve prospect ----
    const { error: qErr } = await supabase.from('prospects').update({ status: 'approved' }).eq('id', prospect.id)
    add('qualify: prospect → approved', !qErr, qErr?.message)

    // ---- P1.3 SELL: tenant row (post-checkout) ----
    const { signupPricing } = await import('../src/lib/tier-prices')
    const pricing = signupPricing()
    const slug = slugify(bizName, prospect.id)
    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
      name: bizName, slug, industry: ind,
      phone: OWNER.phone, email: OWNER.email,
      owner_name: OWNER.name, owner_email: OWNER.email, owner_phone: OWNER.phone,
      status: 'active', plan: 'growth',
      monthly_rate: Math.round((pricing.monthly_cents || 0) / 100),
      setup_fee: Math.round((pricing.setup_cents || 0) / 100),
      setup_fee_paid_at: new Date().toISOString(), billing_status: 'active',
      address: `${loc.city}, ${loc.state} ${loc.zip}`,
    }).select('id, slug').single()
    add('sell: tenant created', !!tenant && !tErr, tErr?.message)
    if (!tenant) throw new Error('tenant insert failed: ' + tErr?.message)
    tenantId = tenant.id

    // ---- P1.4 default entity ----
    const { error: eErr } = await supabase.from('entities').insert({ tenant_id: tenant.id, name: bizName, is_default: true, active: true })
    add('onboard: default entity seeded', !eErr, eErr?.message)

    // ---- P1.5 ONBOARD: provisionTenant ----
    const { provisionTenant } = await import('../src/lib/provision-tenant')
    const prov = await provisionTenant({ tenantId: tenant.id, industry: ind })
    add('onboard: provisionTenant ran', prov.seeded.services > 0, `seeded ${JSON.stringify(prov.seeded)}`)

    // ---- P1.6 services w/ SKU price_cents (no $0 proposals) ----
    const { data: services } = await supabase.from('service_types')
      .select('id, name, price_cents, item_type, per_unit, default_hourly_rate').eq('tenant_id', tenant.id)
    const svcCount = services?.length || 0
    add(`services: >= ${4} seeded`, svcCount >= 4, `${svcCount} seeded`)
    const zeroPriced = (services || []).filter(s => !s.price_cents || s.price_cents <= 0)
    add('services: all have price_cents > 0', zeroPriced.length === 0, zeroPriced.length ? `${zeroPriced.length} at $0: ${zeroPriced.map(s => s.name).join(', ')}` : 'ok')

    // ---- P1.7 selena_config + industry checklist ----
    const { data: fresh } = await supabase.from('tenants')
      .select('selena_config, payment_methods, business_hours, guidelines_en').eq('id', tenant.id).single()
    const cfg = (fresh?.selena_config || {}) as Record<string, unknown>
    add('config: selena_config populated', Object.keys(cfg).length > 0)
    const checklist = (cfg.checklist_fields as Array<{ key: string }> | undefined) || []
    add('config: checklist_fields present', checklist.length >= 5, `${checklist.length} fields`)
    // cleaning is the ONLY vertical that asks bedrooms; others must NOT.
    const hasBedrooms = checklist.some(f => f.key === 'bedrooms')
    add('config: bedrooms only for cleaning', ind === 'cleaning' ? hasBedrooms : !hasBedrooms, `hasBedrooms=${hasBedrooms}`)

    // ---- P1.8 payment/hours/guidelines ----
    add('config: payment_methods populated', Array.isArray(fresh?.payment_methods) && (fresh!.payment_methods as unknown[]).length > 0)
    add('config: business_hours set', !!fresh?.business_hours)
    add('config: guidelines_en set', !!fresh?.guidelines_en)

    // ---- P1.9 invite (owner claim) ----
    const token = randomBytes(32).toString('hex')
    const { error: invErr } = await supabase.from('tenant_invites').insert({
      tenant_id: tenant.id, email: OWNER.email.toLowerCase(), role: 'owner', token,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    add('onboard: owner invite created', !invErr, invErr?.message)

    // ---- P1.10 idempotency: 2nd provision must not duplicate ----
    const prov2 = await provisionTenant({ tenantId: tenant.id, industry: ind })
    const { count: svcAfter } = await supabase.from('service_types').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
    add('idempotency: 2nd provision skips services', prov2.skipped.some(s => s.startsWith('services')) && (svcAfter || 0) === svcCount, `skipped=${prov2.skipped.join('|')} count=${svcAfter}`)

    // ================= P1b — SALES PIPELINE (deal → proposal → close) =================
    // Real gap flagged by W4/leader: this sim previously went prospect→tenant→quote→
    // booking directly, never touching `deals` — the actual pipeline layer W1 mapped
    // (src/lib/pipeline.ts + /api/deals/*, migrations/2026_07_03_sales_pipeline_unify.sql
    // + quote_deal_link.sql). Covers the exact two bug classes already found+fixed
    // there: an invalid deals.stage enum value (handleCreateDeal's 'active' bug) and
    // pipeline grouping fns silently dropping/crashing on a live deal (the /api/pipeline
    // dead-key bug). Stage-transition update shapes mirror POST /api/deals/[id]/stage
    // and the accept route's no-deposit close branch — those live in route handlers,
    // not libs, so this exercises the deals-table/pipeline.ts data contract they rely
    // on, not a live HTTP round-trip through the routes themselves.
    const { computeStageTotals, computeForecast, stageMeta: pipelineStageMeta } = await import('../src/lib/pipeline')
    const { data: deal, error: dealErr } = await supabase.from('deals').insert({
      tenant_id: tenant.id, title: `${ind} opportunity ${runId}`, stage: 'new', value_cents: 0, source: 'sim',
    }).select('id, stage, status, mode, probability').single()
    add('pipeline: deal created at stage=new', !!deal && !dealErr, dealErr?.message)
    if (!deal) throw new Error('deal insert failed: ' + dealErr?.message)
    dealId = deal.id
    add('pipeline: deal defaults (status=active, mode=sales)', deal.status === 'active' && deal.mode === 'sales', `status=${deal.status} mode=${deal.mode}`)

    // Pure grouping fns must not drop or crash on a live deal row (dead-key class).
    const dealForForecast = { stage: deal.stage, status: deal.status, value_cents: 0, probability: deal.probability, expected_close_date: null }
    let groupingThrew = false
    let stageTotals: ReturnType<typeof computeStageTotals> | undefined
    try { stageTotals = computeStageTotals([dealForForecast]) } catch { groupingThrew = true }
    add('pipeline: computeStageTotals groups new deal without throwing', !groupingThrew && !!stageTotals?.get('new'), groupingThrew ? 'THREW' : JSON.stringify(stageTotals && [...stageTotals.entries()]))
    let forecastThrew = false
    try { computeForecast([dealForForecast]) } catch { forecastThrew = true }
    add('pipeline: computeForecast tolerates a deal with no close date', !forecastThrew)

    // Stage transitions — mirrors POST /api/deals/[id]/stage's update shape.
    for (const to of ['qualifying', 'quoted'] as const) {
      const meta = pipelineStageMeta(to)
      const { error: stErr } = await supabase.from('deals').update({ stage: to, probability: meta.defaultProbability }).eq('id', deal.id)
      add(`pipeline: deal stage transition → ${to}`, !stErr, stErr?.message)
    }
    const { data: quotedDeal } = await supabase.from('deals').select('stage, probability').eq('id', deal.id).single()
    add('pipeline: deal lands on stage=quoted, probability=50', quotedDeal?.stage === 'quoted' && quotedDeal?.probability === 50, JSON.stringify(quotedDeal))

    // ================= P2 — SALES ENGINE (quote → totals → accept → convert → booking) =================
    const { computeTotals, normalizeLineItems, generateQuoteNumber, generatePublicToken } = await import('../src/lib/quote')
    const { createBookingFromQuote } = await import('../src/lib/sale-to-booking')

    // P2.0 totals math — deterministic known case (independent of DB)
    const known = normalizeLineItems([
      { name: 'A', quantity: 2, unit_price_cents: 5000 },
      { name: 'B', quantity: 1, unit_price_cents: 10000 },
    ])
    const knownTotals = computeTotals(known, 8875, 5000) // 8.875% tax, $50 discount
    add('quote: totals math (subtotal/discount/tax/total)',
      knownTotals.subtotal_cents === 20000 && knownTotals.discount_cents === 5000 && knownTotals.tax_cents === 13313 && knownTotals.total_cents === 28313,
      JSON.stringify(knownTotals))

    // P2.1 build a real quote from THIS tenant's seeded services
    const svcForQuote = (services || []).slice(0, 2)
    const liveLineItems = normalizeLineItems(svcForQuote.map(s => ({
      name: s.name, quantity: Math.max(1, s.default_hourly_rate ? 1 : 1), unit_price_cents: s.price_cents || 0,
    })))
    const liveTotals = computeTotals(liveLineItems, 0, 0)
    add('quote: line items priced from services (no $0)', liveTotals.subtotal_cents > 0, `subtotal=${liveTotals.subtotal_cents}`)

    const quoteNumber = await generateQuoteNumber(tenant.id)
    add('quote: number format Q-YYYYMM-NNNN', /^Q-\d{6}-\d{4}$/.test(quoteNumber), quoteNumber)

    const custEmail = `customer+${runId}@example.com`
    const { data: quote, error: qInsErr } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: null, deal_id: dealId, quote_number: quoteNumber, status: 'draft',
      title: `${ind} job for customer`, contact_name: 'Test Customer', contact_email: custEmail,
      contact_phone: '+15551230000', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
      line_items: liveLineItems, subtotal_cents: liveTotals.subtotal_cents, tax_rate_bps: 0,
      tax_cents: liveTotals.tax_cents, discount_cents: 0, total_cents: liveTotals.total_cents,
      public_token: generatePublicToken(),
    }).select('id, total_cents, quote_number').single()
    add('quote: created', !!quote && !qInsErr, qInsErr?.message)
    if (!quote) throw new Error('quote insert failed: ' + qInsErr?.message)

    // P2.2 accept then convert to a booking (the sell close path)
    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quote.id)
    const conv = await createBookingFromQuote(tenant.id, quote.id)
    add('sell: quote → booking converted', !!conv.booking_id && !conv.already_converted, `booking=${conv.booking_id?.slice(0, 8)}`)

    const { data: booking } = await supabase.from('bookings').select('id, price, client_id, status').eq('id', conv.booking_id).single()
    add('sell: booking price = quote total', !!booking && Math.round((booking.price || 0) * 100) === quote.total_cents, `booking $${booking?.price} vs quote ${quote.total_cents}c`)
    add('sell: client auto-created from quote', !!booking?.client_id)

    const { data: convQuote } = await supabase.from('quotes').select('status, converted_booking_id, deal_id').eq('id', quote.id).single()
    add('sell: quote marked converted', convQuote?.status === 'converted' && convQuote?.converted_booking_id === conv.booking_id)
    add('pipeline: converted quote kept its deal_id link', convQuote?.deal_id === dealId, convQuote?.deal_id)

    // Close the loop — mirrors the no-deposit branch of quotes/public/[token]/accept
    // (this quote has deposit_cents=0, so an accepted quote's deal goes straight to sold).
    const { error: soldErr } = await supabase.from('deals')
      .update({ stage: 'sold', probability: 100, closed_at: new Date().toISOString() }).eq('id', dealId)
    add('pipeline: deal closes to sold on quote acceptance', !soldErr, soldErr?.message)
    const { error: actErr } = await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: dealId, type: 'stage_change',
      description: 'Moved from quoted to sold', metadata: { from: 'quoted', to: 'sold', quote_id: quote.id },
    })
    add('pipeline: deal_activities logs the close', !actErr, actErr?.message)

    // P2.3 idempotent convert — re-running returns same booking, no dupe
    const conv2 = await createBookingFromQuote(tenant.id, quote.id)
    add('sell: convert idempotent', conv2.already_converted && conv2.booking_id === conv.booking_id)

    // ================= P3 — JOBS & SCHEDULING =================
    const { deriveDurationClass } = await import('../src/lib/schedule/duration-class')
    // P3.0 duration-class pure logic
    add('schedule: slot (same-day)', deriveDurationClass({ start_time: '2026-08-01T09:00', end_time: '2026-08-01T13:00' }) === 'slot')
    add('schedule: multiday (3-day span)', deriveDurationClass({ start_time: '2026-08-01T09:00', end_time: '2026-08-04T13:00' }) === 'multiday')
    add('schedule: project (>14 days)', deriveDurationClass({ start_time: '2026-08-01T09:00', end_time: '2026-08-20T13:00' }) === 'project')
    add('schedule: project (project_id wins)', deriveDurationClass({ start_time: '2026-08-01T09:00', end_time: '2026-08-01T10:00', project_id: 'p1' }) === 'project')

    // P3.1 project sale → Job with payment plan + scheduled session
    const { createJobFromQuote } = await import('../src/lib/jobs')
    const q2Num = await generateQuoteNumber(tenant.id)
    const q2Total = liveTotals.subtotal_cents || 20000
    const { data: quote2, error: q2Err } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: null, quote_number: q2Num, status: 'accepted',
      title: `${ind} project`, contact_name: 'Project Customer', contact_email: `proj+${runId}@example.com`,
      contact_phone: '+15551239999', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
      line_items: liveLineItems, subtotal_cents: q2Total, tax_rate_bps: 0, tax_cents: 0, discount_cents: 0,
      total_cents: q2Total, public_token: generatePublicToken(),
    }).select('id, total_cents').single()
    add('job: project quote created', !!quote2 && !q2Err, q2Err?.message)
    if (!quote2) throw new Error('quote2 insert failed: ' + q2Err?.message)

    const deposit = Math.round(q2Total * 0.3)
    const sess = new Date(Date.now() + 5 * 24 * 3600 * 1000); sess.setHours(9, 0, 0, 0)
    const sessEnd = new Date(sess.getTime() + 4 * 3600 * 1000)
    const naive = (d: Date) => d.toISOString().slice(0, 19)
    const jobRes = await createJobFromQuote(tenant.id, quote2.id, {
      payments: [
        { label: 'Deposit', kind: 'deposit', amount_cents: deposit, trigger: 'on_signature' },
        { label: 'Final', kind: 'final', amount_cents: q2Total - deposit, trigger: 'manual' },
      ],
      sessions: [{ start_time: naive(sess), end_time: naive(sessEnd) }],
    })
    add('job: created from quote', !!jobRes.job_id && !jobRes.already_converted)

    const { data: job } = await supabase.from('jobs').select('id, status, total_cents').eq('id', jobRes.job_id).single()
    add('job: status scheduled (has session)', job?.status === 'scheduled', job?.status)
    add('job: total = quote total', job?.total_cents === q2Total)

    const { data: pays } = await supabase.from('job_payments').select('kind, amount_cents, status, trigger').eq('job_id', jobRes.job_id).order('sort_order')
    add('job: payment plan (2 items)', (pays?.length || 0) === 2, `${pays?.length} payments`)
    const depositRow = (pays || []).find(p => p.kind === 'deposit')
    add('job: on_signature deposit released → invoiced', depositRow?.status === 'invoiced', `deposit status=${depositRow?.status}`)

    const { data: jobBookings } = await supabase.from('bookings').select('id, status, job_id').eq('job_id', jobRes.job_id)
    add('job: session → booking under job', (jobBookings?.length || 0) === 1 && jobBookings![0].status === 'confirmed')

    // P3.2 idempotent job convert
    const jobRes2 = await createJobFromQuote(tenant.id, quote2.id)
    add('job: convert idempotent', jobRes2.already_converted && jobRes2.job_id === jobRes.job_id)

    // ================= P4 — FINANCE (billing math + double-entry ledger) =================
    const { clientBilledHours, cleanerPaidHours } = await import('../src/lib/billing-hours')
    // P4.0 two-grace-window rounding: in the 10–15 min gap client bills up, cleaner does not
    add('finance: billing rounding (exact half-hours)', clientBilledHours(120) === 2.0 && cleanerPaidHours(120) === 2.0)
    add('finance: client grace 10 / cleaner grace 15 gap', clientBilledHours(132) === 2.5 && cleanerPaidHours(132) === 2.0, `client=${clientBilledHours(132)} cleaner=${cleanerPaidHours(132)}`)
    add('finance: cleaner rounds up past 15', cleanerPaidHours(136) === 2.5 && cleanerPaidHours(135) === 2.0, `136=${cleanerPaidHours(136)} 135=${cleanerPaidHours(135)}`)

    // P4.1 chart of accounts
    const { ensureChartAccounts, getAccountIdByCode, postJournalEntry, journalEntryExists } = await import('../src/lib/ledger')
    await ensureChartAccounts(tenant.id)
    const { count: coaCount } = await supabase.from('chart_of_accounts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
    add('finance: chart of accounts seeded', (coaCount || 0) >= 30, `${coaCount} accounts`)
    const undeposited = await getAccountIdByCode(tenant.id, '1050')
    const revenue = await getAccountIdByCode(tenant.id, '4000')
    add('finance: account codes resolve (1050/4000)', !!undeposited && !!revenue)

    // P4.2 post a balanced revenue entry (cash in, revenue recognized)
    const amt = liveTotals.subtotal_cents || 15000
    const srcId = randomUUID() // journal_entries.source_id is a uuid column
    let entryId: string | null = null
    if (undeposited && revenue) {
      entryId = await postJournalEntry({
        tenant_id: tenant.id, entry_date: new Date().toISOString().slice(0, 10),
        memo: `sim ${ind} revenue`, source: 'sim-revenue', source_id: srcId,
        lines: [
          { coa_id: undeposited, debit_cents: amt, memo: 'payment received' },
          { coa_id: revenue, credit_cents: amt, memo: 'service revenue' },
        ],
      })
    }
    add('finance: balanced journal entry posted', !!entryId)
    if (entryId) {
      const { data: lines } = await supabase.from('journal_lines').select('debit_cents, credit_cents').eq('entry_id', entryId)
      const dr = (lines || []).reduce((a, l) => a + (l.debit_cents || 0), 0)
      const cr = (lines || []).reduce((a, l) => a + (l.credit_cents || 0), 0)
      add('finance: ledger balances (debits == credits)', (lines?.length || 0) === 2 && dr === cr && dr === amt, `dr=${dr} cr=${cr}`)
    }

    // P4.3 unbalanced entry rejected
    let unbalancedThrew = false
    if (undeposited && revenue) {
      try {
        await postJournalEntry({
          tenant_id: tenant.id, entry_date: new Date().toISOString().slice(0, 10), source: 'sim-bad', source_id: `bad-${runId}`,
          lines: [{ coa_id: undeposited, debit_cents: 1000 }, { coa_id: revenue, credit_cents: 500 }],
        })
      } catch { unbalancedThrew = true }
    }
    add('finance: unbalanced entry rejected', unbalancedThrew)

    // P4.4 idempotency guard by (source, source_id)
    add('finance: journalEntryExists by source', await journalEntryExists(tenant.id, 'sim-revenue', srcId))

    // ================= P5 — HR & TEAM (portal rbac + hire path) =================
    const { normalizePortalRole, isPortalRole, isValidPortalPermission, ALL_PORTAL_PERMISSIONS } = await import('../src/lib/portal-rbac')
    add('team: portal roles valid', isPortalRole('worker') && isPortalRole('lead') && isPortalRole('manager') && !isPortalRole('owner'))
    add('team: unknown role normalizes to worker', normalizePortalRole('bogus') === 'worker' && normalizePortalRole('manager') === 'manager')
    add('team: permission catalog non-empty + valid', ALL_PORTAL_PERMISSIONS.length > 0 && isValidPortalPermission(ALL_PORTAL_PERMISSIONS[0]) && !isValidPortalPermission('not_a_perm'))

    // P5.1 HR defaults
    const { seedHrDefaults } = await import('../src/lib/hr')
    const hr1 = await seedHrDefaults(tenant.id)
    add('hr: document requirements seeded', hr1.requirementsSeeded > 0, `${hr1.requirementsSeeded} reqs`)

    // P5.2 hire a worker via the real approved-applicant path (email suppressed)
    const { provisionApprovedApplicant } = await import('../src/lib/team-provisioning')
    const workerPhone = '212' + String(2000000 + idx * 111 + (Date.now() % 1000)).slice(-7)
    // Email is intentionally disabled in the sim; provisionApprovedApplicant awaits
    // sendEmail which throws with no key. The team_member insert happens BEFORE the
    // email, so we swallow only the post-insert email throw and verify the member.
    let emailThrew = false
    try {
      await provisionApprovedApplicant(tenant.id, {
        id: randomUUID(), name: 'Sim Worker', email: `worker+${runId}@example.com`, phone: workerPhone, address: null,
      })
    } catch (e) {
      emailThrew = /Email not configured|Resend/i.test(e instanceof Error ? e.message : String(e))
      if (!emailThrew) throw e
    }
    const { data: members } = await supabase.from('team_members').select('id, pin, name').eq('tenant_id', tenant.id)
    add('team: worker provisioned as team member', (members?.length || 0) >= 1, `${members?.length} members`)
    const worker = (members || [])[0]
    add('team: worker got 4-digit portal PIN', !!worker?.pin && /^\d{4}$/.test(String(worker.pin)), `pin=${worker?.pin}`)

    // P5.3 re-seed HR → profile backfilled for the new member as 1099
    const hr2 = await seedHrDefaults(tenant.id)
    add('hr: profile backfilled for new hire', hr2.profilesBackfilled >= 1, `backfilled=${hr2.profilesBackfilled}`)
    const { data: prof } = await supabase.from('hr_employee_profiles').select('employment_type').eq('tenant_id', tenant.id).limit(1).maybeSingle()
    add('hr: new hire defaults to contractor_1099', prof?.employment_type === 'contractor_1099', prof?.employment_type)

    // P5.4 double-book guard — same worker, overlapping window → 2nd rejected
    if (worker?.id) {
      const d = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      const at = (h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x.toISOString().slice(0, 19) }
      const { data: bkA, error: aErr } = await supabase.from('bookings').insert({
        tenant_id: tenant.id, team_member_id: worker.id, start_time: at(9), end_time: at(11), status: 'scheduled', service_type: 'overlap-A',
      }).select('id').single()
      add('schedule: first booking accepted', !!bkA && !aErr, aErr?.message)
      const { error: bErr } = await supabase.from('bookings').insert({
        tenant_id: tenant.id, team_member_id: worker.id, start_time: at(10), end_time: at(12), status: 'scheduled', service_type: 'overlap-B',
      })
      add('schedule: overlapping booking for same worker rejected', !!bErr, bErr ? 'rejected ✓' : 'ACCEPTED — no overlap guard')
      if (bkA) await supabase.from('bookings').delete().eq('id', bkA.id)
    }

    // ================= P6 — COMMS (tenant-controlled gating + owner routing to Jeff) =================
    const { normalizePrefs, defaultCommPrefs, isCommEnabled, deriveCapabilities } = await import('../src/lib/comms-prefs')
    const { COMMS, COMMS_BY_KEY, AUDIENCE_ORDER } = await import('../src/lib/comms-registry')

    // P6.0 normalizePrefs — empty → full default, drops unknown keys, merges partial
    const dflt = defaultCommPrefs()
    add('comms: normalizePrefs(empty) → default shape', Object.keys(normalizePrefs(null).comms).length === Object.keys(dflt.comms).length)
    add('comms: normalizePrefs drops unknown keys', !normalizePrefs({ comms: { not_a_real_comm: { email: true } } }).comms['not_a_real_comm'])

    // P6.1 isCommEnabled — locked comm always on (works without the prefs column)
    const lockedComm = COMMS.find(c => c.locked && c.channels.includes('email'))
    if (lockedComm) add('comms: locked comm always enabled', await isCommEnabled(tenant.id, lockedComm.key, 'email'), lockedComm.key)
    // NB: the tenant off/on gate needs tenants.notification_preferences, which is
    // MISSING on prod (see runCommsGateCheck) — tested once globally, not per-trade.

    // P6.2 capabilities — no keys → nothing; telnyx keys → sms
    add('comms: no keys → no email/sms capability', deriveCapabilities({}).email === false && deriveCapabilities({}).sms === false)
    add('comms: telnyx key+phone → sms capable', deriveCapabilities({ telnyx_api_key: 'x', telnyx_phone: '+15551112222' }).sms === true)

    // P6.3 owner routing — owner audience exists and this tenant routes to Jeff
    add('comms: owner audience registered', AUDIENCE_ORDER.includes('owner') && COMMS.some(c => c.audience === 'owner'))
    const { data: ownerRow } = await supabase.from('tenants').select('owner_email').eq('id', tenant.id).single()
    add('comms: owner notifications route to Jeff', ownerRow?.owner_email === OWNER.email, ownerRow?.owner_email || '')

    // ================= P8 — PUBLIC SITE (industry gating: non-cleaning ≠ NYC-Maid site) =================
    const { isCleaningTenant } = await import('../src/lib/messaging/client-sms')
    const { industryProfile } = await import('../src/app/site/template/_lib/seo/industry')
    const isClean = ind === 'cleaning'
    add('site: isCleaningTenant classifies vertical', isCleaningTenant({ industry: ind }) === isClean)
    const siteProf = industryProfile(ind)
    add('site: gate marks cleaning-only pages (isCleaning)', siteProf.isCleaning === isClean, `isCleaning=${siteProf.isCleaning}`)
    add('site: non-cleaning gets non-maid service label', isClean ? siteProf.serviceLabel === 'House Cleaning' : siteProf.serviceLabel !== 'House Cleaning', siteProf.serviceLabel)

    // ================= P9 — RECURRING SERIES + INVOICING =================
    const { createRecurringSeriesFromQuote } = await import('../src/lib/sale-to-recurring')
    // P9.1 recurring sale → recurring_schedules + generated bookings over horizon
    const recNum = await generateQuoteNumber(tenant.id)
    const { data: recQuote } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, quote_number: recNum, status: 'accepted',
      title: `${ind} weekly service`, contact_name: 'Recurring Customer', contact_email: `rec+${runId}@example.com`,
      contact_phone: '+15551237777', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
      line_items: liveLineItems, subtotal_cents: liveTotals.subtotal_cents, tax_rate_bps: 0, tax_cents: 0, discount_cents: 0,
      total_cents: liveTotals.subtotal_cents, public_token: generatePublicToken(),
      recurring_type: 'weekly', recurring_start_date: new Date().toISOString().slice(0, 10),
      recurring_preferred_time: '09:00', recurring_duration_hours: 2,
    }).select('id').single()
    if (recQuote) {
      const series = await createRecurringSeriesFromQuote(tenant.id, recQuote.id)
      const { data: sched } = await supabase.from('recurring_schedules').select('id, status, recurring_type').eq('tenant_id', tenant.id).limit(1).maybeSingle()
      add('recurring: schedule created (active, weekly)', sched?.status === 'active' && sched?.recurring_type === 'weekly', JSON.stringify(series))
      if (sched) {
        const { count: genCount } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('schedule_id', sched.id)
        add('recurring: weekly bookings generated over horizon', (genCount || 0) >= 4, `${genCount} bookings`)
      }
    }

    // P9.2 invoicing — number format + totals from real invoice lib
    const { generateInvoiceNumber, generateInvoicePublicToken, computeTotals: invTotals, normalizeLineItems: invLines } = await import('../src/lib/invoice')
    const invNum = await generateInvoiceNumber(tenant.id)
    add('invoice: number format PREFIX-YYYYMM-NNNN', /^[A-Z]+-\d{6}-\d{4}$/.test(invNum), invNum)
    const iLines = invLines(svcForQuote.map(s => ({ name: s.name, quantity: 1, unit_price_cents: s.price_cents || 0 })))
    const iTot = invTotals(iLines, 8875, 0)
    const { data: defEntity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()
    const { data: invoice, error: invErr2 } = await supabase.from('invoices').insert({
      tenant_id: tenant.id, entity_id: defEntity?.id || null, invoice_number: invNum, status: 'draft',
      title: `${ind} invoice`, contact_name: 'Inv Customer', contact_email: `inv+${runId}@example.com`,
      line_items: iLines, subtotal_cents: iTot.subtotal_cents, tax_rate_bps: 8875, tax_cents: iTot.tax_cents,
      discount_cents: 0, total_cents: iTot.total_cents, due_date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      public_token: generateInvoicePublicToken(),
    }).select('id, total_cents').single()
    add('invoice: created with taxed total', !!invoice && !invErr2 && invoice.total_cents === iTot.total_cents, invErr2?.message || `total=${invoice?.total_cents}`)

    // ================= P11 — EMERGENCY/24-7 DISPATCH (plumbing/HVAC/restoration) =================
    // Only runs for W3's archetype trades. Same-day/after-hours self-booking is the
    // whole business model here — F4's exact bug class (same-day + business-hours
    // gates), already patched in availability.ts; this is the trade group that
    // breaks first if it regresses. Also exercises the emergency_rate/emergency_available
    // selena_config keys the live AI prompt builder reads (selena-legacy.ts).
    // CORRECTION (was wrong in the original P11 commit): a dashboard field for both
    // DOES exist — Settings > Selena tab > Services & Pricing section
    // (src/app/dashboard/settings/page.tsx ~L1420-1439), wired through saveSelenaConfig().
    // No gap there; retracting the earlier "no dashboard field yet" claim.
    const emScenario = EMERGENCY_SCENARIOS[t.category]
    if (emScenario) {
      const { clearSettingsCache } = await import('../src/lib/settings')

      // P11.0 owner turns on 24/7 same-day booking + reuses the on-call tech hired
      // in P5 — a real emergency shop configures this on day one; it's opt-in per
      // settings.ts and defaults OFF, so a tenant that never does this stays a
      // 9-5/no-same-day shop no matter how "emergency" its trade name is.
      const { error: hoursErr } = await supabase.from('tenants')
        .update({ allow_same_day: true, business_hours_start: '0', business_hours_end: '23' }).eq('id', tenant.id)
      add('emergency: owner enables same-day + 24hr business hours', !hoursErr, hoursErr?.message)
      const { data: t365 } = await supabase.from('tenants').select('selena_config').eq('id', tenant.id).single()
      const cfg365 = { ...((t365?.selena_config as Record<string, unknown>) || {}), open_365: true, emergency_available: true, emergency_rate: 195 }
      const { error: cfgErr } = await supabase.from('tenants').update({ selena_config: cfg365 }).eq('id', tenant.id)
      add('emergency: owner sets open_365 + emergency rate in config', !cfgErr, cfgErr?.message)
      if (worker?.id) await supabase.from('team_members').update({ working_days: ['0', '1', '2', '3', '4', '5', '6'] }).eq('id', worker.id)
      clearSettingsCache(tenant.id)

      // P11.1 checkAvailability — the REAL lib fn, TODAY's date. Needs the on-call
      // tech scheduled today or an empty slot list is a false signal (no staff, not
      // a same-day-gate failure).
      const { checkAvailability } = await import('../src/lib/availability')
      const today = new Date().toLocaleDateString('en-CA')
      const availToday = await checkAvailability(tenant.id, today, 2)
      add('emergency: same-day slots open once allow_same_day=true', !availToday.sameDay && (availToday.slots?.length || 0) > 0,
        JSON.stringify({ sameDay: availToday.sameDay, message: availToday.message, slots: availToday.slots?.length }))

      // P11.2 control: same check with same-day OFF must still block — proves the
      // gate is real, not a no-op (regression guard the other direction).
      await supabase.from('tenants').update({ allow_same_day: false }).eq('id', tenant.id)
      clearSettingsCache(tenant.id)
      const availOff = await checkAvailability(tenant.id, today, 2)
      add('emergency: same-day blocked again when owner turns it off', availOff.sameDay === true && (availOff.slots?.length || 0) === 0, JSON.stringify(availOff))
      await supabase.from('tenants').update({ allow_same_day: true }).eq('id', tenant.id)
      clearSettingsCache(tenant.id)

      // P11.3 the trade's actual seeded "emergency-tier" service, priced by the
      // real preset (industry-presets.ts), not a synthetic number. HVAC has no
      // dedicated emergency SKU (Tune-Up/Repair/Install/Duct only) unlike plumbing
      // and all 3 restoration presets — real content gap, so it falls back to a
      // realistic after-hours rush surcharge on the base repair rate, same as a
      // real HVAC dispatcher without a formal emergency line item would quote.
      const emSvc = (services || []).find(s => emScenario.emergencyServiceNames.some(n => s.name.includes(n)))
      add(`emergency: ${ind} has a dedicated emergency/24-7 service preset seeded`, !!emSvc,
        emSvc ? emSvc.name : `no match among: ${(services || []).map(s => s.name).join(', ')}`)
      const baseRepair = (services || []).find(s => /repair|service call/i.test(s.name))
      const emPriceCents = emSvc?.price_cents || Math.round((baseRepair?.price_cents || 15000) * 1.5)

      // P11.4 realistic same-day quote — the actual customer complaint as the line
      // item, priced at the emergency rate, then accepted + converted same-visit
      // (a burst pipe doesn't get a multi-day quote-to-close cycle like a project trade).
      const emQuoteNum = await generateQuoteNumber(tenant.id)
      const emLine = normalizeLineItems([{ name: `${emSvc?.name || 'Emergency service call'} — ${emScenario.complaint}`, quantity: 1, unit_price_cents: emPriceCents }])
      const emTotals = computeTotals(emLine, 0, 0)
      const { data: emQuote, error: emQErr } = await supabase.from('quotes').insert({
        tenant_id: tenant.id, quote_number: emQuoteNum, status: 'draft',
        title: `${t.category} — same-day emergency`, contact_name: 'Emergency Customer', contact_email: `sos+${runId}@example.com`,
        contact_phone: '+15551236666', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
        line_items: emLine, subtotal_cents: emTotals.subtotal_cents, tax_rate_bps: 0, tax_cents: 0,
        discount_cents: 0, total_cents: emTotals.total_cents, public_token: generatePublicToken(),
      }).select('id, total_cents').single()
      add('emergency: same-day quote created at emergency pricing', !!emQuote && !emQErr && emQuote.total_cents === emPriceCents, emQErr?.message || `total=${emQuote?.total_cents} vs expected=${emPriceCents}`)

      if (emQuote) {
        await supabase.from('quotes').update({ status: 'accepted' }).eq('id', emQuote.id)
        const emConv = await createBookingFromQuote(tenant.id, emQuote.id)
        add('emergency: accepted same-day quote converts to a booking', !!emConv.booking_id, `booking=${emConv.booking_id?.slice(0, 8)}`)
        if (emConv.booking_id) {
          const { data: emBooking } = await supabase.from('bookings').select('start_time, status').eq('id', emConv.booking_id).single()
          const bookedDate = emBooking?.start_time ? new Date(emBooking.start_time as string).toLocaleDateString('en-CA') : null
          // Real finding, not fixed here (shared logic, all trades, needs a product
          // call): createBookingFromQuote (src/lib/sale-to-booking.ts ~line 100)
          // unconditionally places every converted booking 3 days out at 9am
          // regardless of urgency — a burst-pipe customer who just accepted a
          // same-day emergency quote still gets a generic "confirm the date"
          // placeholder instead of a booking on today's now-open same-day slots.
          add('emergency: same-day-accepted quote actually books TODAY (not a generic 3-day placeholder)', bookedDate === today,
            `booked=${bookedDate} today=${today} status=${emBooking?.status} — sale-to-booking.ts always offsets +3 days regardless of urgency`)
        }
      }

      // P11.5 intake checklist conveys urgency for THIS trade — checks question text
      // + sms_options, not just a hardcoded field key (only plumbing literally has an
      // "Emergency" sms option; restoration's question says "often ASAP" instead).
      // HVAC is expected to legitimately fail this — its checklist has no
      // emergency/ASAP signal at all despite being a classic 24/7 emergency trade.
      const urgencyField = checklist.find(f => (f as { question?: string }).question && /emergency|asap/i.test((f as { question?: string; sms_options?: string }).question + '|' + ((f as { sms_options?: string }).sms_options || '')))
      add(`emergency: ${ind} intake checklist conveys urgency (emergency/ASAP wording)`, !!urgencyField,
        urgencyField ? (urgencyField as { question?: string }).question : `no urgency signal in: ${checklist.map(f => (f as { key: string }).key).join(', ')}`)

      // P11.6 emergency_rate/emergency_available actually reach the live AI system
      // prompt once an owner sets them (Settings > Selena tab) — proves the
      // read-path works end to end.
      const { buildSystemPromptForPreview } = await import('../src/lib/selena-legacy')
      const prompt = await buildSystemPromptForPreview(tenant.id)
      add('emergency: emergency_rate reaches the live AI system prompt', prompt.includes('195') && /emergency/i.test(prompt), prompt.length > 400 ? `${prompt.length} chars` : prompt)

      // P11.7 real gap: emergency_rate never reaches actual BILLING, only the AI's
      // chat prompt (P11.6). The other real accept path — a customer self-booking
      // through the live client portal (src/app/portal/book/page.tsx ->
      // POST /api/portal/bookings) once allow_same_day is on — computes price as
      // plain default_hourly_rate * default_duration_hours with zero same-day/
      // emergency multiplier anywhere in that route. So the exact scenario this
      // archetype exists for (a burst-pipe customer self-booking a same-day slot)
      // is charged the identical price as a routine booking 3 weeks out; the
      // premium the owner configured only shows up if the AI happens to mention
      // it in conversation. Calls the live route handler directly (not mocked).
      const emSvcId = emSvc?.id || baseRepair?.id
      if (emSvcId) {
        const { data: emClient } = await supabase.from('clients')
          .insert({ tenant_id: tenant.id, name: 'Emergency Portal Customer', phone: '+15551237777', status: 'active' })
          .select('id').single()
        const { data: emSvcFull } = await supabase.from('service_types')
          .select('id, default_hourly_rate, default_duration_hours').eq('id', emSvcId).single()
        if (emClient && emSvcFull?.default_hourly_rate && emSvcFull?.default_duration_hours) {
          const { createToken } = await import('../src/app/api/portal/auth/token')
          const { POST: portalBookingPost } = await import('../src/app/api/portal/bookings/route')
          const portalToken = createToken(emClient.id, tenant.id)
          const req = new Request('http://localhost/api/portal/bookings', {
            method: 'POST',
            headers: { authorization: `Bearer ${portalToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ service_type_id: emSvcFull.id, start_time: `${today}T18:00:00.000Z`, recurring_type: 'none' }),
          })
          const res = await portalBookingPost(req)
          const resBody = await res.json().catch(() => ({} as { booking?: { price?: number } }))
          const chargedPrice = resBody?.booking?.price
          const flatRate = emSvcFull.default_hourly_rate * emSvcFull.default_duration_hours * 100
          add('emergency: self-service same-day portal booking is charged an emergency premium (not the flat rate)',
            res.status === 201 && chargedPrice != null && chargedPrice !== flatRate,
            `status=${res.status} charged=${chargedPrice} flatRate=${flatRate} — POST /api/portal/bookings applies no same-day/emergency multiplier; emergency_rate never reaches actual billing, only the AI's chat prompt`)
        }
      }

      // P11.8 second real gap, same root cause as P11.7 but a DIFFERENT
      // surface: the public marketing-site self-book form (POST
      // /api/client/book, src/app/api/client/book/route.ts) is the OTHER
      // live "burst-pipe customer books themselves" entry point — for a
      // brand-new lead, not an existing portal client. Can't invoke it live
      // in this harness: it resolves tenant context via next/headers()'s
      // headers() (middleware-signed x-tenant-id/x-tenant-sig), which throws
      // outside an actual Next request-handling scope, unlike the portal
      // route's plain Bearer-token auth read off the Request object. So this
      // check verifies by reading the route source instead of calling it:
      // the isNycMaid(tenant.id) branch has explicit bkIsEmergency/isSameDay
      // logic (an $89/hr override), but that's hardcoded to exactly ONE
      // tenant. Every other tenant on the platform — which is 100% of this
      // archetype, since plumbing/HVAC/restoration test tenants are never
      // the NYC Maid tenant — falls into the generic `else` branch, which
      // prices purely off configuredRate (service_types.default_hourly_rate)
      // with zero same-day/emergency keyword or multiplier anywhere in it.
      // So this archetype's second self-book surface has the same gap as
      // P11.7, except worse: NYC Maid (a cleaning tenant, outside this
      // archetype entirely) is the ONLY tenant on the whole platform where a
      // same-day self-book through this route is actually charged more.
      const bookRouteSrc = readFileSync(resolve(process.cwd(), 'src/app/api/client/book/route.ts'), 'utf8')
      const nycMaidBranch = bookRouteSrc.split('if (isNycMaid(tenant.id)) {')[1] || ''
      const branchParts = nycMaidBranch.split(/\n\s*\} else \{\n/)
      const nycMaidPricingLogic = branchParts[0] || ''
      const genericBranch = (branchParts[1] || '').split('// Resolve property')[0]
      const nycMaidHasEmergencyLogic = /bkIsEmergency|isSameDay/.test(nycMaidPricingLogic)
      const genericHasEmergencyLogic = /emergency|same.?day|sameDay/i.test(genericBranch)
      add('emergency: public self-book form (/api/client/book) applies emergency/same-day pricing for non-NYC-Maid tenants (this archetype)',
        !!genericBranch && genericHasEmergencyLogic,
        genericBranch
          ? `generic-tenant pricing branch (${genericBranch.trim().length} chars) has no same-day/emergency logic; only the hardcoded NYC Maid branch does (nycMaidBranchHasLogic=${nycMaidHasEmergencyLogic}) — same root gap as P11.7 on a second self-book surface`
          : 'could not locate the generic (non-NYC-Maid) pricing branch in route source — route.ts shape changed, re-verify this check manually')

      // P11.9 UX-FRICTION finding (3rd dimension: not a bug, not a missing feature —
      // a real owner's flow is needlessly clunky). Not fixed here (product/design
      // call), flagging with a concrete "X would flow better if Y" fix. Verified by
      // reading the actual Settings-page dropdown option lists, not assumed: P11.0
      // above reached same-day-open-24hr state by writing business_hours_start/end
      // straight to the tenants row via Supabase — that exact state is UNREACHABLE
      // through the Settings UI a real owner uses.
      const settingsSrc = readFileSync(resolve(process.cwd(), 'src/app/dashboard/settings/page.tsx'), 'utf8')
      const startOptsSrc = settingsSrc.split('const BUSINESS_HOURS_START_OPTIONS = [')[1]?.split(']')[0] || ''
      const endOptsSrc = settingsSrc.split('const BUSINESS_HOURS_END_OPTIONS = [')[1]?.split(']')[0] || ''
      const startValues = startOptsSrc.match(/value: '(\d{2}:\d{2})'/g) || []
      const endValues = endOptsSrc.match(/value: '(\d{2}:\d{2})'/g) || []
      const earliestStart = startValues[0]?.match(/'([\d:]+)'/)?.[1]
      const latestEnd = endValues.slice(-1)[0]?.match(/'([\d:]+)'/)?.[1]
      const canExpressTrue24_7 = /value: '00:00'/.test(startOptsSrc) && /value: '23:30'|value: '24:00'/.test(endOptsSrc)
      add('UX-friction: owner can configure genuine 24/7 hours through the Scheduling tab UI (no direct-DB shortcut)',
        canExpressTrue24_7,
        `dropdowns only run ${earliestStart}–${latestEnd} (BUSINESS_HOURS_START_OPTIONS/END_OPTIONS, settings/page.tsx) — a real emergency dispatcher (this archetype's entire business model) has no UI path to the always-open hours they'd actually advertise; this sim only reached that state by updating tenants.business_hours_start/end directly. Compounding friction: even within that capped range, the hours control lives on the Scheduling tab while the emergency_rate/emergency_available premium meant to pair with it lives on the unrelated Selena tab's Services & Pricing section (page.tsx ~L1420), with no link, hint, or shared "Emergency Service" concept connecting them — an owner has to already know both settings exist and both need touching. Would flow better if: the Scheduling tab's hour dropdowns extended to a true 00:00–23:30/24:00 range (or grew a one-click "24/7" shortcut), and a single "Emergency / 24-7 Service" toggle set hours + surfaced the rate field inline, instead of two disconnected settings across two tabs.`)

      // P11.10 real gap, worse than P11.7/P11.8: the EXISTING-CLIENT portal
      // self-book route (POST /api/portal/bookings — the same route P11.7
      // calls live) sends the owner NO notification of any kind — not even
      // the generic one /api/client/book sends. Verified by reading the
      // full route source (only 106 lines, no notify()/email/SMS call
      // anywhere in the POST handler). A same-day emergency booking through
      // this surface is completely silent; the owner finds out only by
      // manually checking the dashboard/schedule.
      const portalBookingsSrc = readFileSync(resolve(process.cwd(), 'src/app/api/portal/bookings/route.ts'), 'utf8')
      const portalPostBody = portalBookingsSrc.split('export async function POST')[1] || ''
      const portalNotifiesOwner = /notify\s*\(/.test(portalPostBody)
      add('emergency: portal self-book route (POST /api/portal/bookings) notifies the owner when a client books',
        portalNotifiesOwner,
        portalNotifiesOwner ? 'notify() call found' : `POST handler (${portalPostBody.trim().length} chars) has zero notify()/SMS/email call anywhere — an existing client can self-book a same-day emergency slot through this exact route (same one P11.7 exercises live) and the owner gets NO signal at all: no push, no SMS, no email, nothing in the notification center. The only way to find out is to manually check the dashboard/schedule.`)

      // P11.11 real gap, same hardcoded-single-tenant pattern as P11.8 but
      // for owner ALERTING instead of pricing: the public self-book form's
      // urgent SMS path (nmSmsAdmins, "🚨 EMERGENCY... Assign a cleaner
      // ASAP") only fires inside `if (isNycMaid(tenant.id) && bkIsEmergency)`.
      // Verified by counting nmSmsAdmins( call sites in route.ts (exactly 1,
      // gated by that exact condition). Every other tenant on the platform —
      // 100% of this archetype — gets the same generic 'New Booking Request'
      // notify() for a genuine same-day emergency as for a routine booking
      // 3 weeks out, so an owner triaging notifications can't tell them apart
      // without opening each one.
      const nmSmsAdminsCalls = (bookRouteSrc.match(/nmSmsAdmins\(/g) || []).length
      const emergencyAlertIsNycMaidOnly = bookRouteSrc.includes('isNycMaid(tenant.id) && bkIsEmergency') && nmSmsAdminsCalls === 1
      add("emergency: owner gets an urgent/priority alert (not just the generic notify) for a same-day booking on this archetype's tenants",
        !emergencyAlertIsNycMaidOnly,
        `nmSmsAdmins() urgent-SMS alert appears ${nmSmsAdminsCalls}x in client/book/route.ts, only inside 'if (isNycMaid(tenant.id) && bkIsEmergency)' — same hardcoded-single-tenant pattern as P11.8's pricing gap, different feature. Every other tenant (100% of this archetype) gets the identical generic 'New Booking Request' notify() for a genuine same-day emergency as for a routine booking weeks out; the owner has no way to triage urgency from the alert itself.`)

      // P11.12 gap layered on top of the already-flagged +3-day placeholder
      // bug (P11.4 comment above): even once that date bug is fixed,
      // createBookingFromQuote (sale-to-booking.ts) never sets
      // team_member_id on the bookings insert at all — verified by reading
      // the exact insert({...}) object literal. The on-call tech
      // checkAvailability found in P11.1 is never carried through to the
      // created booking; dispatch stays 100% manual for the one scenario
      // (burst pipe, same-day) where speed matters most.
      const saleToBookingSrc = readFileSync(resolve(process.cwd(), 'src/lib/sale-to-booking.ts'), 'utf8')
      const bookingsInsertBlock = (saleToBookingSrc.split(".from('bookings')")[1] || '').split('.insert({')[1]?.split('})')[0] || ''
      const assignsWorkerOnConvert = /team_member_id/.test(bookingsInsertBlock)
      add('emergency: same-day-accepted quote auto-assigns the on-call worker found in P11.1 (not left unassigned)',
        assignsWorkerOnConvert,
        `createBookingFromQuote's bookings insert (sale-to-booking.ts) never references team_member_id (insert body: ${bookingsInsertBlock.trim().replace(/\s+/g, ' ')}) — even once the known +3-day placeholder-date bug is fixed, the resulting booking lands with nobody dispatched; the on-call tech this archetype specifically schedules for same-day coverage (P11.0/P11.1) is never attached to the booking it was found for.`)

      // P11.13 real gap, compounds P11.10/P11.12 with a third independent
      // angle: the auto-converted booking (status 'pending', per
      // sale-to-booking.ts line ~111 above; team_member_id null per P11.12)
      // is also invisible to the ONE other dispatch path that doesn't need
      // the owner at all — the team-portal "open jobs" self-claim pool a
      // field tech proactively checks (GET /api/team-portal/jobs?available=
      // true). Verified by reading that route: its query only returns
      // bookings with status IN ('scheduled','confirmed') — 'pending' isn't
      // one of them, so a tech looking for work never sees it either. Worse,
      // the codebase already HAS a working, tenant-generic (not NYC-Maid-
      // only) fix for exactly this scenario — POST /api/bookings/broadcast,
      // an SMS/email blast to every active team member — already wired to
      // BookingsAdmin.tsx's manual "Emergency" booking-creation toggle one
      // click away in the operator UI. createBookingFromQuote never calls
      // it. So this archetype's real customer flow (same-day quote-accept,
      // P11.4) produces a booking silent to the owner (P11.10), invisible
      // to the self-claim pool (this check), and never triggers the
      // broadcast dispatch already proven to work for the identical
      // scenario in a different code path.
      const teamPortalJobsSrc = readFileSync(resolve(process.cwd(), 'src/app/api/team-portal/jobs/route.ts'), 'utf8')
      const availablePoolStatusMatch = teamPortalJobsSrc.match(/\.in\('status',\s*(\[[^\]]*\])\)/)
      const availablePoolStatuses = availablePoolStatusMatch ? availablePoolStatusMatch[1] : ''
      const pendingInPool = /'pending'/.test(availablePoolStatuses)
      const callsBroadcast = /bookings\/broadcast/.test(saleToBookingSrc)
      add('emergency: same-day-accepted quote booking is claimable via the self-claim pool OR triggers the existing broadcast dispatch',
        pendingInPool || callsBroadcast,
        `team-portal open-jobs pool filters status IN ${availablePoolStatuses || '(pattern not found — re-verify manually)'} ('pending' included=${pendingInPool}); createBookingFromQuote calls /api/bookings/broadcast=${callsBroadcast}. The broadcast route (src/app/api/bookings/broadcast/route.ts) already exists, is tenant-generic, and is already wired to BookingsAdmin.tsx's manual "Emergency" toggle — createBookingFromQuote never calls it, so this archetype's real same-day quote-accept path gets none of the 3 dispatch signals (owner notify, self-claim pool, broadcast) that already exist elsewhere in the codebase.`)

      // P11.14 a DIFFERENT angle from P11.5-P11.13 (all of which check whether
      // the SYSTEM/owner side behaves differently for an emergency): this
      // checks whether the CUSTOMER who just declared an emergency is told
      // anything different by the automated confirmation they actually
      // receive. /api/client/book (the same public self-book route P11.8/
      // P11.11 exercise) sends the customer a "booking received" email + SMS
      // via bookingReceivedEmail() (src/lib/email-templates.ts) and
      // smsBookingReceived() (src/lib/sms-templates.ts) unconditionally on
      // every booking — verified these are urgency-blind BY CONSTRUCTION, not
      // just by this test's inputs: neither function's signature accepts an
      // urgency/emergency parameter at all (email data shape: {clientName,
      // serviceName, dateTime}; SMS: {start_time} only), so there is no code
      // path by which either could ever render differently for a same-day
      // emergency vs a routine booking 3 weeks out. Calls both live (not
      // mocked, not grepped) to confirm the actual rendered copy has zero
      // urgency acknowledgment.
      const { bookingReceivedEmail } = await import('../src/lib/email-templates')
      const { smsBookingReceived } = await import('../src/lib/sms-templates')
      const emEmailHtml = bookingReceivedEmail({
        tenantName: t.category, clientName: 'Emergency Customer',
        serviceName: emSvc?.name || 'Emergency service call', dateTime: `${today} ASAP`,
      })
      const emSmsBody = smsBookingReceived(t.category, { start_time: new Date().toISOString() })
      const urgencyWords = /emergency|urgent|priority|asap|same.?day|right away|as soon as possible/i
      const emailAcknowledgesUrgency = urgencyWords.test(emEmailHtml)
      const smsAcknowledgesUrgency = urgencyWords.test(emSmsBody)
      add('emergency: customer-facing booking-received confirmation (email+SMS) acknowledges the urgency the customer just reported',
        emailAcknowledgesUrgency || smsAcknowledgesUrgency,
        `bookingReceivedEmail() and smsBookingReceived() take no urgency/emergency parameter at all (email data shape: {clientName, serviceName, dateTime}; SMS: {start_time} only) — both confirmations are urgency-blind by construction, not just by this test's inputs. Actual rendered SMS: "${emSmsBody}"; email body includes the fixed line "We're reviewing your request and will confirm shortly" — identical wording a routine booking 3 weeks out would receive. A customer who just reported a burst pipe / no heat / storm damage gets zero reassurance that the emergency itself was noticed, only that "a request" was received.`)

      // P11.15 completes the "does the owner's configured emergency_rate ever
      // reach real billing" trilogy alongside P11.7 (existing-client portal
      // self-book) and P11.8 (public self-book, hardcoded to NYC Maid only):
      // the operator's OWN manual booking-creation panel
      // (src/app/dashboard/bookings/BookingsAdmin.tsx) — this archetype's
      // real "owner takes the emergency call and books it themselves" path,
      // and the exact surface P11.13 already found has a working Emergency-
      // toggle for DISPATCH (broadcast) — has the same gap for PRICE. A
      // client component; can't invoke it live in this harness (no DOM), so
      // verified by reading the source directly, same as P11.8-P11.13.
      // Selecting "Emergency / Same-Day" from the Service dropdown only ever
      // sets is_emergency/cleaner_id in state (see the onChange handler
      // below) — it never reads tenant.selena_config.emergency_rate (the
      // exact number P11.6 proved reaches the AI's chat prompt) into
      // createForm.hourly_rate. hourly_rate's only sources are its hardcoded
      // initial-state default (69 — the SAME default for every service,
      // emergency or not; see the useState calls above) and whatever the
      // operator manually retypes into the plain, unlabeled "Rate" $/hr box.
      // So all THREE live paths that could apply the owner's configured
      // emergency_rate — portal self-book (P11.7), public self-book (P11.8),
      // and the operator's own manual creation panel (this check) — ignore
      // it; only the AI chat prompt (P11.6) ever surfaces the number, and
      // even there only if the AI happens to mention it in conversation.
      const bookingsAdminSrc = readFileSync(resolve(process.cwd(), 'src/app/dashboard/bookings/BookingsAdmin.tsx'), 'utf8')
      const serviceDropdownOnChangeMatch = bookingsAdminSrc.match(/const isEmergency = e\.target\.value === 'Emergency \/ Same-Day'\n\s*setCreateForm\(\{[^}]*\}\)/)
      const serviceDropdownOnChange = serviceDropdownOnChangeMatch?.[0] || ''
      const emergencyTogglePrefillsRate = /emergency_rate|selena_config/.test(serviceDropdownOnChange)
      const hourlyRateDefaultMatches = [...bookingsAdminSrc.matchAll(/hourly_rate:\s*(\d+)/g)].map((m) => m[1])
      const allDefaultsIdentical = new Set(hourlyRateDefaultMatches.filter((_, i) => i < 5)).size === 1
      add("emergency: operator's manual booking-creation panel prefills the emergency_rate the owner configured (Settings > Selena) when Emergency/Same-Day is selected",
        emergencyTogglePrefillsRate,
        emergencyTogglePrefillsRate
          ? 'prefill logic found'
          : `BookingsAdmin.tsx's Emergency/Same-Day onChange handler (found: ${!!serviceDropdownOnChangeMatch}, ${serviceDropdownOnChange.length} chars) never references emergency_rate/selena_config — it only sets is_emergency/cleaner_id. hourly_rate's initial-state default is hardcoded to 69 everywhere it's declared (same value regardless of service type, emergency or not — ${allDefaultsIdentical ? 'confirmed identical across the form\'s useState calls' : 'defaults vary across forms, re-verify manually'}). Completes the trilogy with P11.7/P11.8: portal self-book, public self-book, AND the operator's own manual creation panel all ignore the configured emergency_rate; only the AI chat prompt (P11.6) ever surfaces it.`)

      // P11.16 a fourth, more exposed surface in the same "does the owner's
      // configured emergency_rate ever reach real billing" chain, on the ONE
      // channel this archetype's whole business model runs through: the
      // fully-automated SMS/AI booking flow itself (selena-legacy.ts, the
      // generic non-NYC-Maid implementation this archetype's tenants use).
      // P11.6 already proved emergency_rate/emergency_available reach the
      // live system prompt as TEXT the AI can read and mention — but reading
      // the prompt and ENFORCING the number are different things. The
      // create_booking tool's own schema (below) requires the LLM to supply
      // hourly_rate as a bare number argument, and handleCreateBooking
      // (source extracted below) computes price: hourlyRate * estimatedHours
      // * 100 straight from whatever the LLM passed — with ZERO server-side
      // reference to selena_config's emergency_rate/emergency_available,
      // even though selena-legacy-core.ts's own intent classifier has a
      // dedicated 'emergency' intent (readNextStep/getAllowedTools ~L385)
      // that explicitly permits this exact tool for that intent. So the one
      // promise this archetype's whole after-hours/same-day product exists
      // to keep — an emergency call gets priced at the owner's configured
      // premium — is left entirely to the LLM correctly re-deriving "195"
      // from its own system prompt and typing it into a tool argument, with
      // no guardrail if it doesn't. This is the most exposed of the four
      // surfaces this trilogy now covers (portal self-book P11.7, public
      // self-book P11.8, operator manual panel P11.15, and this one) — it's
      // the only one with zero human review before the booking (and its
      // price) is created. Verified by reading the source directly (client
      // component / live-LLM-round-trip surfaces aren't invokable in this
      // harness, same constraint as P11.8-P11.15).
      const selenaLegacySrc = readFileSync(resolve(process.cwd(), 'src/lib/selena-legacy.ts'), 'utf8')
      const handleCreateBookingBody = (selenaLegacySrc.split('async function handleCreateBooking')[1] || '').split('\n\nasync function ')[0]
      const createBookingToolSchema = (selenaLegacySrc.split("name: 'create_booking'")[1] || '').split('},\n  {')[0]
      const enforcesEmergencyRateServerSide = /emergency_rate|selena_config|emergency_available/.test(handleCreateBookingBody)
      add("emergency: the AI/SMS create_booking tool enforces the owner's configured emergency_rate server-side (not just relies on the LLM re-typing the prompt number)",
        enforcesEmergencyRateServerSide,
        `handleCreateBooking (selena-legacy.ts, ${handleCreateBookingBody.trim().length} chars) computes price purely as hourlyRate * estimatedHours * 100 from input.hourly_rate — a bare number the create_booking tool schema requires the LLM to supply (schema: ${createBookingToolSchema.replace(/\s+/g, ' ').trim()}) — with no reference to emergency_rate/selena_config/emergency_available anywhere in the handler. selena-legacy-core.ts's own intent classifier has a dedicated 'emergency' intent that explicitly allows this tool, yet nothing server-side ties its price to the owner's configured premium; correctness depends entirely on the LLM re-deriving the number from its own prompt (P11.6) and typing it into the tool call. Fourth and most exposed surface in the P11.7/P11.8/P11.15 trilogy — the only one with no human review before the priced booking is created.`)

      // P11.17 a second, independent gap in the SAME handleCreateBooking
      // insert P11.16 just extracted — not price this time, but the
      // is_emergency FLAG itself. /api/client/book (P11.8/P11.11/P11.14's
      // route) derives bkIsEmergency and threads it through: into the
      // bookings row (p_is_emergency on its RPC), into smsBookingReceived()
      // (P11.14's fix branches on booking.is_emergency for the "URGENT
      // request received... treating this as a priority" wording), and into
      // client-email.ts's isEmergency flag. handleCreateBooking's own insert
      // (extracted above for P11.16) sets tenant_id/client_id/start_time/
      // end_time/status/notes/price — is_emergency is absent from the object
      // entirely, and nothing after the insert (the sms_conversations update,
      // updateChecklist) ever sets it either. So even a tenant whose LLM gets
      // P11.16's price exactly right still produces a booking row that is
      // BY CONSTRUCTION indistinguishable from a routine one to every
      // downstream consumer that branches on is_emergency: the P11.14 fix's
      // urgency-acknowledgment SMS can never fire for a booking created
      // through this channel (is_emergency reads as falsy), and any future
      // admin/team-portal UI that badges emergency jobs by that column stays
      // blind to them here too. Unlike P11.16 this isn't about the LLM's
      // arithmetic — it is a field the tool schema never even asks the LLM
      // for, so no amount of LLM correctness can fix it without a code
      // change. Verified by reading the source directly, same as P11.16.
      const createBookingInsertBlock = (handleCreateBookingBody.split("from('bookings').insert({")[1] || '').split('}).select')[0]
      const setsIsEmergencyFlag = /is_emergency/.test(createBookingInsertBlock)
      add("emergency: the AI/SMS create_booking tool sets is_emergency on the booking row it inserts (not just the price)",
        setsIsEmergencyFlag,
        `handleCreateBooking's bookings insert (selena-legacy.ts, insert body: ${createBookingInsertBlock.trim().replace(/\s+/g, ' ')}) has no is_emergency field at all — nothing after the insert sets it either. /api/client/book (P11.8/P11.11/P11.14's route) derives and threads bkIsEmergency into the row, into smsBookingReceived()'s urgency wording (the P11.14 fix), and into client-email.ts's isEmergency flag; this channel's insert carries none of that. Even once P11.16's price gap is fixed, a booking created here is BY CONSTRUCTION indistinguishable from a routine one to every consumer that reads is_emergency — the P11.14 fix can never fire for it, and no future is_emergency-driven UI badge would either. The tool schema never asks the LLM for this field at all, so unlike P11.16 this can't be closed by the LLM getting something right; it needs a code change.`)

      // P11.18 a distinct gap from P11.10/P11.11 (which are about the OWNER
      // never getting an urgency-aware alert) — this is about the TECHS.
      // P11.12 already found a same-day-accepted quote's booking lands with
      // team_member_id null (nobody dispatched); P11.13 found the fallback
      // is the self-claim pool (GET /team-portal/jobs?available=true) — a
      // PULL model where techs have to open the app and check for new
      // unclaimed jobs themselves. Checking whether ANYTHING proactively
      // pages a tech when an unassigned job (emergency or not) appears:
      // /api/team-portal/jobs/claim/route.ts (the claim endpoint itself)
      // has no notify call at all — it only processes an already-initiated
      // claim, it doesn't announce new availability. The one system-wide
      // sweep that even looks for unassigned bookings is the schedule-
      // monitor cron (14-day lookahead) — it finds them (type:'unassigned')
      // but only ever at severity:'warning' (same tier as 'stuck_pending'/
      // 'payment_overdue'), and writes the row to schedule_issues for the
      // OWNER's dashboard to display later — itself a pull surface, and
      // still nothing tech-facing. So a same-day emergency booking with no
      // assigned tech (the exact state P11.12 proved this archetype's
      // automated create path produces) has no push/SMS to ANY tech telling
      // them a job is open to claim; the only way a tech finds out is
      // periodically refreshing the claim-pool screen on their own
      // initiative. For a genuinely urgent same-day dispatch (burst pipe,
      // no AC with a newborn in the house) this is a real response-time
      // risk on top of the P11.10-13 chain, not a duplicate of it. Verified
      // by reading both source files directly.
      const claimRouteSrc = readFileSync(resolve(process.cwd(), 'src/app/api/team-portal/jobs/claim/route.ts'), 'utf8')
      const scheduleMonitorSrc = readFileSync(resolve(process.cwd(), 'src/app/api/cron/schedule-monitor/route.ts'), 'utf8')
      const claimRouteNotifiesTeam = /notifyTeamMember|notifyTeam\(|\bsms\(|sendSms/.test(claimRouteSrc)
      const monitorNotifiesAnyone = /notifyTeamMember|notifyTeam\(|\bsms\(|sendSms|await notify\(/.test(scheduleMonitorSrc)
      const unassignedIsCritical = /type:\s*'unassigned',\s*severity:\s*'critical'/.test(scheduleMonitorSrc)
      add('emergency: an unassigned same-day job proactively pages a tech (not pull-only claim-pool + a warning-tier dashboard row)',
        claimRouteNotifiesTeam || monitorNotifiesAnyone || unassignedIsCritical,
        `claim route (/api/team-portal/jobs/claim, ${claimRouteSrc.length} chars) has zero notify/SMS calls — it only processes a claim already initiated by a tech, never announces new availability. schedule-monitor cron (the only sweep that finds unassigned bookings at all) also has zero notify/SMS calls anywhere in the file and files the 'unassigned' finding at severity:'warning' (same tier as stuck_pending/payment_overdue), into schedule_issues for the owner's dashboard — itself pull-based. Net effect: a same-day emergency booking that lands with team_member_id null (P11.12) has no push path to ANY tech; the only route to pickup is a tech voluntarily refreshing the open-jobs screen.`)
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message
      : (err && typeof err === 'object') ? JSON.stringify(err)
      : String(err)
    add('FATAL', false, msg)
  } finally {
    if (!PERSIST) {
      // Deleting the tenant CASCADEs to all children (bookings/clients/etc all
      // reference tenants ON DELETE CASCADE). Explicit child deletes are a
      // best-effort fast path; the tenant delete is the real guarantee. Only a
      // surviving TENANT row is a true leftover — retry it through timeouts.
      if (tenantId) {
        for (const tbl of ['territory_claims', 'journal_lines', 'journal_entries', 'chart_of_accounts', 'hr_employee_profiles', 'hr_document_requirements', 'invoice_activity', 'invoices', 'deal_activities', 'deals', 'quote_activity', 'quotes', 'job_events', 'job_payments', 'bookings', 'recurring_schedules', 'jobs', 'team_members', 'clients', 'service_types', 'entities', 'tenant_invites']) {
          await supabase.from(tbl).delete().eq('tenant_id', tenantId) // best-effort, ignore errors
        }
        let delOk = false
        for (let i = 0; i < 4 && !delOk; i++) {
          const { error } = await supabase.from('tenants').delete().eq('id', tenantId)
          if (!error) delOk = true
          else if (i === 3) leftovers.push(`tenants(${tenantId.slice(0, 8)}): ${error.message}`)
        }
      }
      if (prospectId) {
        for (let i = 0; i < 4; i++) { const { error } = await supabase.from('prospects').delete().eq('id', prospectId); if (!error) break; if (i === 3) leftovers.push(`prospects: ${error.message}`) }
      }
    } else if (tenantId) {
      leftovers.push(`PERSISTED tenant ${tenantId}`)
    }
  }

  const passed = checks.filter(c => c.pass).length
  const failed = checks.filter(c => !c.pass).length
  const failures = checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  return { category: t.category, industry: ind, model: t.model, passed, failed, failures, ms: Date.now() - t0, leftovers }
}

// ================= P7 — TERRITORY EXCLUSIVITY (global, one tenant per category/territory) =================
// Standalone + safe: claims an AVAILABLE (territory, category) pair with no tenant,
// proves a 2nd claim conflicts, then RELEASES it. Never touches a live claim.
async function runTerritoryPhase(): Promise<{ passed: number; failed: number; failures: string[] }> {
  const checks: Check[] = []
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail })
  const { getTerritories, getClaimsForCategory, claimTerritory, releaseTerritory } = await import('../src/lib/territories/data')

  const { data: cats } = await supabase.from('service_categories').select('id, name').limit(1)
  const categoryId = cats?.[0]?.id as string | undefined
  add('territory: service_categories present', !!categoryId, cats?.[0]?.name)
  const territories = await getTerritories()
  add('territory: territories present', territories.length > 0, `${territories.length}`)

  if (categoryId && territories.length) {
    const claimed = new Set((await getClaimsForCategory(categoryId)).map(c => c.territory_id))
    const free = territories.find(t => !claimed.has(t.id))
    add('territory: an available territory exists', !!free, free?.name)
    if (free) {
      try {
        const r1 = await claimTerritory({ territoryId: free.id, categoryId, tenantId: null, status: 'claimed', notes: 'SIM — auto-released' })
        add('territory: claim succeeds', r1.ok === true)
        const r2 = await claimTerritory({ territoryId: free.id, categoryId, tenantId: null, status: 'claimed' })
        add('territory: duplicate claim rejected (unique lock)', r2.ok === false && (r2 as { conflict?: boolean }).conflict === true, JSON.stringify(r2))
        const rel = await releaseTerritory(free.id, categoryId)
        add('territory: release succeeds', rel.ok === true)
        const stillClaimed = (await getClaimsForCategory(categoryId)).some(c => c.territory_id === free.id)
        add('territory: released territory is available again', !stillClaimed)
      } finally {
        // guarantee no leftover claim regardless of assertion outcome
        await releaseTerritory(free.id, categoryId)
      }
    }
  }
  const passed = checks.filter(c => c.pass).length
  const failed = checks.filter(c => !c.pass).length
  const failures = checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  console.log(`\n[P7 territory] ${passed} pass${failed ? ` / ${failed} FAIL` : ''}`)
  failures.forEach(f => console.log(`      ✗ ${f}`))
  return { passed, failed, failures }
}

// ================= P6b — COMMS GATE (global) — real off/on toggle, needs prod column =================
async function runCommsGateCheck(): Promise<{ passed: number; failed: number; failures: string[] }> {
  const checks: Check[] = []
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail })
  // Column probe first — the whole tenant-controlled gate depends on it.
  const { error: colErr } = await supabase.from('tenants').select('notification_preferences').limit(1)
  const colExists = !colErr
  add('comms-gate: tenants.notification_preferences column exists on prod', colExists,
    colExists ? 'present' : 'MISSING — apply migrations/2026_07_08_tenant_notification_preferences.sql')

  if (colExists) {
    const { COMMS } = await import('../src/lib/comms-registry')
    const { isCommEnabled } = await import('../src/lib/comms-prefs')
    const toggle = COMMS.find(c => !c.locked && c.channels.includes('email'))
    const { data: t } = await supabase.from('tenants').insert({ name: 'SIM comms-gate', slug: 'sim-commsgate-' + Date.now().toString(36), industry: 'cleaning', status: 'active', owner_email: OWNER.email, email: OWNER.email }).select('id').single()
    if (t && toggle) {
      await supabase.from('tenants').update({ notification_preferences: { comms: { [toggle.key]: { email: false } } } }).eq('id', t.id)
      const off = await isCommEnabled(t.id, toggle.key, 'email')
      await supabase.from('tenants').update({ notification_preferences: { comms: { [toggle.key]: { email: true } } } }).eq('id', t.id)
      const on = await isCommEnabled(t.id, toggle.key, 'email')
      add('comms-gate: tenant can gate a comm off/on', off === false && on === true, `off=${off} on=${on}`)
      await supabase.from('tenants').delete().eq('id', t.id)
    }
  }
  const passed = checks.filter(c => c.pass).length
  const failed = checks.filter(c => !c.pass).length
  const failures = checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  console.log(`\n[P6b comms-gate] ${passed} pass${failed ? ` / ${failed} FAIL` : ''}`)
  failures.forEach(f => console.log(`      ✗ ${f}`))
  return { passed, failed, failures }
}

async function main() {
  const list = ONLY.length ? TRADES.filter(t => ONLY.some(o => t.category.toLowerCase().includes(o.toLowerCase()) || t.model === o)) : TRADES
  console.log(`\n=== ALL-TRADES SIM — ${list.length} trades (P1-P9, P11 emergency archetype) ${PERSIST ? '(PERSIST)' : '(cleanup)'} ===\n`)
  const results: TradeResult[] = []
  for (let i = 0; i < list.length; i++) {
    process.stdout.write(`[${String(i + 1).padStart(2)}/${list.length}] ${list[i].category.slice(0, 34).padEnd(35)}`)
    const r = await runTrade(list[i], i)
    results.push(r)
    console.log(`${r.failed === 0 ? '✓' : '✗'} ${r.passed} pass${r.failed ? ` / ${r.failed} FAIL` : ''} [${r.industry}/${r.model}] (${r.ms}ms)`)
    r.failures.forEach(f => console.log(`      ✗ ${f}`))
    if (r.leftovers.length) r.leftovers.forEach(l => console.log(`      ⚠ leftover ${l}`))
  }

  // Global phases — run once (skip when running a trade subset)
  const commsGate = ONLY.length ? { passed: 0, failed: 0, failures: [] as string[] } : await runCommsGateCheck()
  const terr = ONLY.length ? { passed: 0, failed: 0, failures: [] as string[] } : await runTerritoryPhase()

  const totPass = results.reduce((a, r) => a + r.passed, 0) + terr.passed + commsGate.passed
  const totFail = results.reduce((a, r) => a + r.failed, 0) + terr.failed + commsGate.failed
  const greenTrades = results.filter(r => r.failed === 0).length
  console.log(`\n=== SUMMARY ===`)
  console.log(`  trades 100%: ${greenTrades}/${results.length}`)
  console.log(`  checks: ${totPass} passed, ${totFail} failed`)
  const failedTrades = results.filter(r => r.failed > 0).map(r => r.category)
  if (failedTrades.length) console.log(`  FAILING: ${failedTrades.join(', ')}`)

  // Trade → vertical map (surfaces which trades fall to 'general' = no trade-specific presets)
  const generalTrades = results.filter(r => r.industry === 'general').map(r => r.category)
  const byVertical: Record<string, number> = {}
  for (const r of results) byVertical[r.industry] = (byVertical[r.industry] || 0) + 1
  console.log(`\n  vertical resolution: ${Object.entries(byVertical).map(([k, v]) => `${k}=${v}`).join('  ')}`)
  console.log(`  trades → 'general' (generic presets, no trade-specific services/checklist): ${generalTrades.length}`)
  if (generalTrades.length) console.log(`    ${generalTrades.join(', ')}`)

  const outDir = resolve(process.cwd(), 'scripts/out')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'sim-all-trades-p1.json'), JSON.stringify(results, null, 2))
  process.exit(totFail > 0 ? 1 : 0)
}

main().catch(err => { console.error('[sim] fatal:', err); process.exit(1) })
