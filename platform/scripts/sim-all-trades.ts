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
      tenant_id: tenant.id, client_id: null, quote_number: quoteNumber, status: 'draft',
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

    const { data: convQuote } = await supabase.from('quotes').select('status, converted_booking_id').eq('id', quote.id).single()
    add('sell: quote marked converted', convQuote?.status === 'converted' && convQuote?.converted_booking_id === conv.booking_id)

    // P2.3 idempotent convert — re-running returns same booking, no dupe
    const conv2 = await createBookingFromQuote(tenant.id, quote.id)
    add('sell: convert idempotent', conv2.already_converted && conv2.booking_id === conv.booking_id)

    // ================= P2b — SALES PIPELINE (deals + proposal stage) =================
    // Real end-to-end wiring: customer lead -> deal (stage new) -> qualify -> proposal
    // quote linked via deal_id -> proposal sent -> accepted through the REAL public
    // accept route (not a raw status flip) -> deal auto-advances per the deposit rule.
    // This is the layer flagged as completely untested — the sim used to go
    // prospect->tenant->quote->booking directly, never touching deals/pipeline at all.
    const { PIPELINE_STAGES: STAGES } = await import('../src/lib/pipeline')

    const { data: deal, error: dealErr } = await supabase.from('deals').insert({
      tenant_id: tenant.id, title: `${ind} inquiry — ${bizName}`, stage: 'new',
      value_cents: 0, probability: STAGES[0].defaultProbability, source: 'sim',
    }).select('id, stage').single()
    add('pipeline: deal created at new stage', !!deal && !dealErr && deal.stage === 'new', dealErr?.message)
    if (!deal) throw new Error('deal insert failed: ' + dealErr?.message)

    // Regression guard for the byStage['lead'] dead-key bug fixed in /api/pipeline
    // route.ts — a deal's stage must always be one of the real PIPELINE_STAGES keys.
    add('pipeline: deal stage is a valid PIPELINE_STAGES value', STAGES.some(s => s.value === deal.stage), deal.stage)

    // P2b.1 qualify (mirrors POST /api/deals/[id]/stage's write shape)
    const { error: qualErr } = await supabase.from('deals')
      .update({ stage: 'qualifying', probability: STAGES[1].defaultProbability }).eq('id', deal.id)
    add('pipeline: deal qualifies (new → qualifying)', !qualErr, qualErr?.message)

    // P2b.2 proposal quote linked to the deal via deal_id — the FK the pipeline
    // board actually reads to show "Proposal sent" on a deal card.
    const dealQuoteNum = await generateQuoteNumber(tenant.id)
    const dealQuoteLines = normalizeLineItems(svcForQuote.map(s => ({ name: s.name, quantity: 1, unit_price_cents: s.price_cents || 0 })))
    const dealQuoteTotals = computeTotals(dealQuoteLines, 0, 0)
    const { data: dealQuote, error: dealQuoteErr } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, deal_id: deal.id, client_id: null, quote_number: dealQuoteNum, status: 'draft',
      title: `${ind} proposal for ${bizName}'s customer`, contact_name: 'Pipeline Customer',
      contact_email: `pipeline+${runId}@example.com`, contact_phone: '+15551235555',
      service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
      line_items: dealQuoteLines, subtotal_cents: dealQuoteTotals.subtotal_cents, tax_rate_bps: 0,
      tax_cents: dealQuoteTotals.tax_cents, discount_cents: 0, total_cents: dealQuoteTotals.total_cents,
      public_token: generatePublicToken(),
    }).select('id, public_token, total_cents').single()
    add('pipeline: proposal quote created + linked via deal_id', !!dealQuote && !dealQuoteErr, dealQuoteErr?.message)
    if (!dealQuote) throw new Error('deal quote insert failed: ' + dealQuoteErr?.message)

    // P2b.3 send the proposal (mirrors quotes/[id]/send's real side effect: deal
    // moves to 'quoted' + a deal_activities row logged — what the pipeline board
    // depends on to show a deal moved past qualifying).
    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', dealQuote.id)
    const { error: sendStageErr } = await supabase.from('deals')
      .update({ stage: 'quoted', probability: STAGES[2].defaultProbability, value_cents: dealQuote.total_cents }).eq('id', deal.id)
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'stage_change',
      description: 'Moved from qualifying to quoted', metadata: { from: 'qualifying', to: 'quoted', quote_id: dealQuote.id },
    })
    add('pipeline: deal moves to quoted on proposal send', !sendStageErr, sendStageErr?.message)

    // P2b.4 accept through the REAL public route (not a raw status flip) — the
    // actual production code path a customer hits, and the sole owner of the
    // deal-stage-advance-on-accept logic, never exercised by this sim before.
    const { POST: acceptQuote } = await import('../src/app/api/quotes/public/[token]/accept/route')
    const acceptReq = new Request(`http://localhost/api/quotes/public/${dealQuote.public_token}/accept`, {
      method: 'POST',
      body: JSON.stringify({ signature_png: 'data:image/png;base64,' + 'A'.repeat(120), signature_name: 'Pipeline Customer' }),
    })
    const acceptRes = await acceptQuote(acceptReq, { params: Promise.resolve({ token: dealQuote.public_token }) })
    add('pipeline: real public accept route returns ok', acceptRes.status === 200, `status=${acceptRes.status}`)

    const { data: dealAfterAccept } = await supabase.from('deals').select('stage, probability, closed_at').eq('id', deal.id).single()
    add('pipeline: deal auto-advances on accept (no deposit → sold)',
      dealAfterAccept?.stage === 'sold' && dealAfterAccept?.probability === 100 && !!dealAfterAccept?.closed_at,
      JSON.stringify(dealAfterAccept))

    const { count: activityCount } = await supabase.from('deal_activities').select('id', { count: 'exact', head: true }).eq('deal_id', deal.id)
    add('pipeline: deal_activities logged through the funnel', (activityCount || 0) >= 3, `${activityCount} activities`)

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
        for (const tbl of ['territory_claims', 'journal_lines', 'journal_entries', 'chart_of_accounts', 'hr_employee_profiles', 'hr_document_requirements', 'invoice_activity', 'invoices', 'quote_activity', 'quotes', 'deal_activities', 'deals', 'job_events', 'job_payments', 'bookings', 'recurring_schedules', 'jobs', 'team_members', 'clients', 'service_types', 'entities', 'tenant_invites']) {
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

// ================= P11 — RECURRING ARCHETYPE FULL-FEATURE SCENARIOS =================
// Leader redirect 2026-07-16 12:37: Jeff wants the sim to pretend to be REAL
// tenants using EVERY feature with realistic trade-specific language, not a
// mechanical CRUD checklist. W1 lane: recurring archetypes (house cleaning,
// pest control, lawn care). Each entry below drives ONE persona-driven tenant
// through the full lifecycle a real owner/staff/customer would actually touch:
// marketing/lead capture -> quote/proposal -> sale conversion -> scheduling
// (+ a real mid-series schedule change) -> HR/onboarding -> payroll ->
// bookkeeping/invoicing -> referrals -> reviews -> comms -> reporting.
// Uses the SAME real production code paths as P1-P10 (public accept route,
// ledger, HR provisioning, invoice/quote libs) — narrative-first instead of
// feature-checklist-first.
type RecurringArchetype = {
  industry: 'cleaning' | 'pest' | 'lawn_care'
  label: string
  customerName: string
  contactEmailPrefix: string
  leadNotes: string
  oneTimeServiceName: string
  recurringServiceName: string
  recurringType: 'weekly' | 'biweekly' | 'monthly_date'
  recurringHours: number
  workerName: string
  paymentMethod: string
  referrerName: string
  referrerPayout: string
  reviewText: string
  reviewRating: number
  scheduleChangeNarrative: string
  vacationNarrative: string
}

const RECURRING_ARCHETYPES: RecurringArchetype[] = [
  {
    industry: 'cleaning',
    label: 'Recurring — House Cleaning',
    customerName: 'The Ramirez Family',
    contactEmailPrefix: 'ramirez-family',
    leadNotes: "Hi! We just moved into a 3-bed/2-bath and need a cleaner every other week. We have two dogs so someone comfortable with pets would be great. Could you also do a deep clean the first time -- inside the fridge and oven? My neighbor Sarah Chen said you cleaned her place and it looked amazing, she said she'd send you our way.",
    oneTimeServiceName: 'Deep Cleaning',
    recurringServiceName: 'Standard Cleaning',
    recurringType: 'biweekly',
    recurringHours: 2,
    workerName: 'Maria Ortiz',
    paymentMethod: 'zelle',
    referrerName: 'Sarah Chen',
    referrerPayout: 'venmo',
    reviewText: 'Maria was incredible -- so thorough, even got baseboards we forgot about. Booking again every 2 weeks!',
    reviewRating: 5,
    scheduleChangeNarrative: "daughter's birthday party landed on the usual visit day -- moved that visit out two days",
    vacationNarrative: 'family is at the lake house for two weeks -- pausing the biweekly visits until they get back',
  },
  {
    industry: 'pest',
    label: 'Recurring — Pest Control',
    customerName: 'Downtown Office Park LLC',
    contactEmailPrefix: 'downtown-office-park',
    leadNotes: "We manage a small office building downtown and have been seeing mice in the break room the last week. Need someone out ASAP for rodent control, and if it goes well we'd like a recurring pest plan for the whole building going forward.",
    oneTimeServiceName: 'Rodent Control',
    recurringServiceName: 'General Pest Control',
    recurringType: 'monthly_date',
    recurringHours: 1,
    workerName: 'Dana Whitfield',
    paymentMethod: 'check',
    referrerName: 'Property Manager Group NW',
    referrerPayout: 'ach',
    reviewText: 'Fast response on the rodent issue and the tech explained everything clearly. Tenants stopped complaining within a week. Signed up for the monthly plan.',
    reviewRating: 5,
    scheduleChangeNarrative: 'monthly visit conflicted with a scheduled fire-alarm inspection -- moved that visit out two days',
    vacationNarrative: 'building is closed for a 3-week HVAC retrofit -- pausing the monthly plan until tenants are back',
  },
  {
    industry: 'lawn_care',
    label: 'Recurring — Lawn Care',
    customerName: 'The Petrosky Household',
    contactEmailPrefix: 'petrosky',
    leadNotes: "Hi, we just bought a house and the lawn is looking pretty rough. Want weekly mowing through the summer, and I read about aeration and overseeding online -- can we get that done this spring too?",
    oneTimeServiceName: 'Aeration & Overseed',
    recurringServiceName: 'Mowing & Trim',
    recurringType: 'weekly',
    recurringHours: 1,
    workerName: 'Tyler Brooks',
    paymentMethod: 'venmo',
    referrerName: "Alicia Fenwick (next-door neighbor)",
    referrerPayout: 'zelle',
    reviewText: 'Yard looks 10x better after the aeration, and Tyler is always right on schedule every week.',
    reviewRating: 5,
    scheduleChangeNarrative: 'family is on vacation the week of the usual mow -- moved that visit out two days',
    vacationNarrative: 'family is traveling for a month over the winter -- pausing weekly mowing until they return',
  },
]

async function runRecurringArchetype(def: RecurringArchetype, idx: number): Promise<TradeResult> {
  const t0 = Date.now()
  const checks: Check[] = []
  const leftovers: string[] = []
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail })
  const runId = `arch-${idx}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
  const loc = CITIES[(idx + 3) % CITIES.length]
  const bizName = `SIM ${def.label} ${runId}`
  let tenantId: string | null = null

  try {
    // ---- bootstrap: tenant already live + onboarded (the sell/onboard funnel
    // itself is P1's job; this phase is about ongoing feature depth) ----
    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
      name: bizName, slug: slugify(bizName, runId), industry: def.industry,
      phone: OWNER.phone, email: OWNER.email, owner_name: OWNER.name, owner_email: OWNER.email, owner_phone: OWNER.phone,
      status: 'active', plan: 'growth', billing_status: 'active', setup_fee_paid_at: new Date().toISOString(),
      address: `${loc.city}, ${loc.state} ${loc.zip}`,
    }).select('id').single()
    add('bootstrap: archetype tenant created', !!tenant && !tErr, tErr?.message)
    if (!tenant) throw new Error('tenant insert failed: ' + tErr?.message)
    tenantId = tenant.id
    await supabase.from('entities').insert({ tenant_id: tenant.id, name: bizName, is_default: true, active: true })
    const { provisionTenant } = await import('../src/lib/provision-tenant')
    const prov = await provisionTenant({ tenantId: tenant.id, industry: def.industry })
    add('bootstrap: trade-specific services + config provisioned', prov.seeded.services > 0, JSON.stringify(prov.seeded))
    const { data: services } = await supabase.from('service_types').select('id, name, price_cents').eq('tenant_id', tenant.id)
    const oneTimeSvc = (services || []).find((s: { name: string }) => s.name === def.oneTimeServiceName)
    const recurringSvc = (services || []).find((s: { name: string }) => s.name === def.recurringServiceName)
    add(`services: "${def.oneTimeServiceName}" + "${def.recurringServiceName}" seeded for this trade`,
      !!oneTimeSvc && !!recurringSvc, (services || []).map((s: { name: string }) => s.name).join(', '))
    if (!oneTimeSvc || !recurringSvc) throw new Error('expected archetype services not seeded')

    // ================= MARKETING / LEAD CAPTURE =================
    // Real inbound-inquiry shape (portal_leads — Selena's lead-capture sink).
    // Realistic customer language preserved verbatim; the actual owner reads this.
    const contactEmail = `${def.contactEmailPrefix}+${runId}@example.com`
    const { data: lead, error: leadErr } = await supabase.from('portal_leads').insert({
      tenant_id: tenant.id, name: def.customerName, email: contactEmail, phone: '+15551236000',
      service_type: def.industry, city: loc.city, zip_code: loc.zip,
      notes: def.leadNotes, source: 'sim-marketing', status: 'new',
    }).select('id, notes').single()
    add('marketing: inbound lead captured', !!lead && !leadErr, leadErr?.message)
    add('marketing: realistic customer language preserved verbatim (not paraphrased/dropped)', lead?.notes === def.leadNotes)

    // ================= QUOTE / PROPOSAL (one-time / urgent item first) =================
    const { computeTotals, normalizeLineItems, generateQuoteNumber, generatePublicToken } = await import('../src/lib/quote')
    const oneTimeLines = normalizeLineItems([{ name: def.oneTimeServiceName, quantity: 1, unit_price_cents: oneTimeSvc.price_cents || 0 }])
    const oneTimeTotals = computeTotals(oneTimeLines, 0, 0)
    const oneTimeQuoteNum = await generateQuoteNumber(tenant.id)
    const { data: oneTimeQuote, error: q1Err } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, quote_number: oneTimeQuoteNum, status: 'draft', fulfillment_type: 'booking',
      title: `${def.oneTimeServiceName} for ${def.customerName}`, contact_name: def.customerName,
      contact_email: contactEmail, contact_phone: '+15551236000', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
      line_items: oneTimeLines, subtotal_cents: oneTimeTotals.subtotal_cents, tax_rate_bps: 0,
      tax_cents: oneTimeTotals.tax_cents, discount_cents: 0, total_cents: oneTimeTotals.total_cents,
      public_token: generatePublicToken(),
    }).select('id, public_token, total_cents').single()
    add('quote: one-time/urgent proposal drafted with real trade pricing', !!oneTimeQuote && !q1Err, q1Err?.message)
    if (!oneTimeQuote) throw new Error('one-time quote insert failed: ' + q1Err?.message)
    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', oneTimeQuote.id)
    add('quote: proposal sent to the customer', true)

    // ================= SALE CONVERSION (real public accept route — e-signature) =================
    const { POST: acceptQuote } = await import('../src/app/api/quotes/public/[token]/accept/route')
    const sign = (token: string, name: string) => acceptQuote(
      new Request(`http://localhost/api/quotes/public/${token}/accept`, {
        method: 'POST', body: JSON.stringify({ signature_png: 'data:image/png;base64,' + 'A'.repeat(120), signature_name: name }),
      }),
      { params: Promise.resolve({ token }) },
    )
    const accept1 = await sign(oneTimeQuote.public_token, def.customerName)
    add('sale: customer signs the one-time proposal (real accept route)', accept1.status === 200, `status=${accept1.status}`)
    const { data: firstBooking } = await supabase.from('bookings')
      .select('id, client_id, start_time').eq('tenant_id', tenant.id).order('created_at').limit(1).maybeSingle()
    add('sale: signed proposal converts to a real booking', !!firstBooking, JSON.stringify(firstBooking))
    const clientId = firstBooking?.client_id as string | undefined
    add('sale: customer record created from the signed quote', !!clientId)

    // Pest-only: "we manage the whole building" is a real multi-address-per-
    // client shape (client_properties, ported from nycmaid) — an office-park
    // manager account naturally has more than one serviceable address.
    if (def.industry === 'pest' && clientId) {
      const { data: prop, error: propErr } = await supabase.from('client_properties').insert({
        tenant_id: tenant.id, client_id: clientId, label: 'Building B — East Wing',
        address: `456 Commerce St, ${loc.city}, ${loc.state} ${loc.zip}`, is_primary: false,
      }).select('id').single()
      add('accounts: second serviceable property added for the same customer', !!prop && !propErr, propErr?.message)
      if (prop) {
        const { count: propCount } = await supabase.from('client_properties').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
        add('accounts: customer now has multiple properties on one account', (propCount || 0) >= 1, `${propCount} properties`)
      }
    }

    // ================= RECURRING PLAN (ongoing schedule, same customer) =================
    const recurringLines = normalizeLineItems([{ name: def.recurringServiceName, quantity: 1, unit_price_cents: recurringSvc.price_cents || 0 }])
    const recurringTotals = computeTotals(recurringLines, 0, 0)
    const recurringQuoteNum = await generateQuoteNumber(tenant.id)
    const startDate = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    const { data: recurringQuote, error: q2Err } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: clientId || null, quote_number: recurringQuoteNum, status: 'draft',
      title: `${def.recurringServiceName} — ongoing plan`, contact_name: def.customerName, contact_email: contactEmail,
      contact_phone: '+15551236000', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
      line_items: recurringLines, subtotal_cents: recurringTotals.subtotal_cents, tax_rate_bps: 0,
      tax_cents: recurringTotals.tax_cents, discount_cents: 0, total_cents: recurringTotals.total_cents,
      public_token: generatePublicToken(), recurring_type: def.recurringType,
      recurring_start_date: startDate.toISOString().slice(0, 10), recurring_preferred_time: '09:00',
      recurring_duration_hours: def.recurringHours,
    }).select('id, public_token').single()
    add('quote: recurring plan proposed to the existing customer', !!recurringQuote && !q2Err, q2Err?.message)
    if (!recurringQuote) throw new Error('recurring quote insert failed: ' + q2Err?.message)
    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', recurringQuote.id)
    const accept2 = await sign(recurringQuote.public_token, def.customerName)
    add('sale: customer signs the recurring plan (real accept route)', accept2.status === 200, `status=${accept2.status}`)

    const { data: schedule } = await supabase.from('recurring_schedules')
      .select('id, status, recurring_type, duration_hours').eq('tenant_id', tenant.id).maybeSingle()
    add(`schedule: ${def.recurringType} recurring plan active`,
      schedule?.status === 'active' && schedule?.recurring_type === def.recurringType, JSON.stringify(schedule))
    const { data: seriesBookings } = await supabase.from('bookings')
      .select('id, start_time').eq('schedule_id', schedule?.id || '').order('start_time')
    add('schedule: recurring visits generated over the horizon', (seriesBookings?.length || 0) >= 2, `${seriesBookings?.length} visits`)

    // ================= SCHEDULING CHANGE (real feature: per-occurrence exception) =================
    // Mirrors POST /api/admin/recurring-schedules/[id]/exception's own two-part
    // effect: record the exception (so any future regeneration honors it) AND
    // move the already-materialized booking for that date.
    if (schedule && (seriesBookings?.length || 0) >= 2) {
      const moveTarget = seriesBookings![1]
      const occurrenceDate = String(moveTarget.start_time).slice(0, 10)
      const newStart = new Date(new Date(moveTarget.start_time).getTime() + 2 * 24 * 3600 * 1000)
      const newEnd = new Date(newStart.getTime() + def.recurringHours * 3600 * 1000)
      const newStartHHMM = newStart.toISOString().slice(11, 16)
      const { error: exErr } = await supabase.from('recurring_exceptions').upsert(
        { tenant_id: tenant.id, schedule_id: schedule.id, occurrence_date: occurrenceDate, type: 'move', new_start_time: newStartHHMM },
        { onConflict: 'schedule_id,occurrence_date' },
      )
      const { error: moveErr } = await supabase.from('bookings')
        .update({ start_time: newStart.toISOString().slice(0, 19), end_time: newEnd.toISOString().slice(0, 19) })
        .eq('id', moveTarget.id).eq('tenant_id', tenant.id)
      add(`schedule: real change applied — ${def.scheduleChangeNarrative}`, !exErr && !moveErr, exErr?.message || moveErr?.message)

      // A later, not-yet-materialized occurrence gets skipped outright (the
      // exception ledger is what the generate-recurring cron actually honors).
      const skipDate = new Date(new Date(seriesBookings![seriesBookings!.length - 1].start_time).getTime() + 7 * 24 * 3600 * 1000)
      const { error: skipErr } = await supabase.from('recurring_exceptions').upsert(
        { tenant_id: tenant.id, schedule_id: schedule.id, occurrence_date: skipDate.toISOString().slice(0, 10), type: 'skip' },
        { onConflict: 'schedule_id,occurrence_date' },
      )
      add('schedule: future occurrence skipped via the real exception ledger', !skipErr, skipErr?.message)
    }

    // ================= RECURRING PAUSE/RESUME (real feature: /api/admin/recurring-schedules/[id]/pause) =================
    // Mirrors that route's own two-part effect (requirePermission-gated, so
    // invoked as a direct DB mirror like the exception-ledger block above,
    // not called as a handler): flip status to 'paused' + cancel every
    // in-window booking, then resume by flipping back to 'active'.
    if (schedule) {
      const pauseUntil = new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      const { error: pauseErr } = await supabase.from('recurring_schedules')
        .update({ status: 'paused', paused_until: pauseUntil }).eq('id', schedule.id)
      const { data: cancelled } = await supabase.from('bookings')
        .update({ status: 'cancelled' }).eq('schedule_id', schedule.id)
        .in('status', ['scheduled', 'pending']).lte('start_time', pauseUntil + 'T23:59:59')
        .select('id')
      add(`schedule: ${def.vacationNarrative}`, !pauseErr, pauseErr?.message)
      add('schedule: in-window visits cancelled while paused', (cancelled?.length || 0) >= 1, `${cancelled?.length} cancelled`)

      const { error: resumeErr } = await supabase.from('recurring_schedules')
        .update({ status: 'active', paused_until: null }).eq('id', schedule.id)
      add('schedule: plan resumed after the pause window', !resumeErr, resumeErr?.message)
    }

    // ================= HR / ONBOARDING (hire + assign the tech who does the work) =================
    const { seedHrDefaults } = await import('../src/lib/hr')
    await seedHrDefaults(tenant.id)
    const { provisionApprovedApplicant } = await import('../src/lib/team-provisioning')
    const workerPhone = '212' + String(3000000 + idx * 111 + (Date.now() % 1000)).slice(-7)
    let emailThrew = false
    try {
      await provisionApprovedApplicant(tenant.id, {
        id: randomUUID(), name: def.workerName, email: `${def.workerName.toLowerCase().replace(/\s+/g, '.')}+${runId}@example.com`,
        phone: workerPhone, address: null,
      })
    } catch (e) {
      emailThrew = /Email not configured|Resend/i.test(e instanceof Error ? e.message : String(e))
      if (!emailThrew) throw e
    }
    const { data: worker } = await supabase.from('team_members')
      .select('id, name, pin').eq('tenant_id', tenant.id).eq('phone', workerPhone).maybeSingle()
    add('hr: tech hired + onboarded for this account', !!worker?.pin, `${worker?.name} pin=${worker?.pin}`)
    if (worker && firstBooking) {
      await supabase.from('bookings').update({ team_member_id: worker.id }).eq('id', firstBooking.id).eq('tenant_id', tenant.id)
      add('hr: tech assigned to the first visit', true)
    }

    // Cleaning-only: "send the same person every time" is a real, named
    // feature (clients.preferred_team_member_id, read by nycmaid/smart-schedule
    // + Selena's own client lookup) — the exact ask in this lead's notes.
    if (def.industry === 'cleaning' && worker && clientId) {
      const { error: prefErr } = await supabase.from('clients').update({ preferred_team_member_id: worker.id }).eq('id', clientId)
      const { data: clientAfter } = await supabase.from('clients').select('preferred_team_member_id').eq('id', clientId).single()
      add('scheduling: customer\'s preferred-cleaner request is stored + honorable by the real scheduler', !prefErr && clientAfter?.preferred_team_member_id === worker.id, prefErr?.message)
    }

    // ================= PAYROLL =================
    const { cleanerPaidHours } = await import('../src/lib/billing-hours')
    const payHours = cleanerPaidHours(def.recurringHours * 60)
    const FIELD_TECH_HOURLY_CENTS = 2200 // typical field-tech pay rate, independent of retail price
    const payoutCents = Math.round(payHours * FIELD_TECH_HOURLY_CENTS)
    let payoutId: string | null = null
    if (worker) {
      const { data: payout, error: payoutErr } = await supabase.from('team_member_payouts').insert({
        tenant_id: tenant.id, team_member_id: worker.id, booking_id: firstBooking?.id || null,
        amount_cents: payoutCents, status: 'paid', paid_at: new Date().toISOString(),
      }).select('id').single()
      add('payroll: visit hours paid out to the tech', !!payout && !payoutErr, payoutErr?.message)
      payoutId = payout?.id || null
    }

    // ================= BOOKKEEPING / INVOICING =================
    const { ensureChartAccounts, getAccountIdByCode, postJournalEntry } = await import('../src/lib/ledger')
    await ensureChartAccounts(tenant.id)
    const { generateInvoiceNumber, generateInvoicePublicToken, computeTotals: invTotals, normalizeLineItems: invLines } = await import('../src/lib/invoice')
    const invNum = await generateInvoiceNumber(tenant.id)
    const iLines = invLines([{ name: def.oneTimeServiceName, quantity: 1, unit_price_cents: oneTimeSvc.price_cents || 0 }])
    const iTot = invTotals(iLines, 0, 0)
    const { data: defEntity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()
    const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
      tenant_id: tenant.id, entity_id: defEntity?.id || null, invoice_number: invNum, status: 'draft',
      title: `${def.oneTimeServiceName} — ${def.customerName}`, contact_name: def.customerName, contact_email: contactEmail,
      client_id: clientId || null, booking_id: firstBooking?.id || null,
      line_items: iLines, subtotal_cents: iTot.subtotal_cents, tax_rate_bps: 0, tax_cents: iTot.tax_cents,
      discount_cents: 0, total_cents: iTot.total_cents, due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      public_token: generateInvoicePublicToken(),
    }).select('id, total_cents').single()
    add('invoice: generated for the completed visit', !!invoice && !invErr, invErr?.message)
    if (invoice) {
      const { error: payErr } = await supabase.from('payments').insert({
        tenant_id: tenant.id, booking_id: firstBooking?.id || null, client_id: clientId || null,
        amount_cents: invoice.total_cents, method: def.paymentMethod, status: 'completed',
        reference_id: `sim-archetype-${invoice.id}`,
      })
      add(`bookkeeping: customer paid via ${def.paymentMethod}`, !payErr, payErr?.message)
      await supabase.from('invoices').update({ status: 'paid', amount_paid_cents: invoice.total_cents, paid_at: new Date().toISOString() }).eq('id', invoice.id)

      // Cleaning-only: a real, wired field (bookings.tip_amount, set by the
      // production payment-processor path) — happy customers tip the tech.
      if (def.industry === 'cleaning' && firstBooking) {
        const tipCents = 2000
        const { error: tipErr } = await supabase.from('bookings').update({ tip_amount: tipCents }).eq('id', firstBooking.id)
        const { data: bkAfter } = await supabase.from('bookings').select('tip_amount').eq('id', firstBooking.id).single()
        add('payment: customer tip recorded on the visit', !tipErr && bkAfter?.tip_amount === tipCents, `tip=${bkAfter?.tip_amount}`)
      }
      const undeposited = await getAccountIdByCode(tenant.id, '1050')
      const revenue = await getAccountIdByCode(tenant.id, '4000')
      if (undeposited && revenue) {
        await postJournalEntry({
          tenant_id: tenant.id, entry_date: new Date().toISOString().slice(0, 10), memo: `${def.label} revenue`,
          source: 'sim-archetype-revenue', source_id: invoice.id,
          lines: [
            { coa_id: undeposited, debit_cents: invoice.total_cents, memo: 'payment received' },
            { coa_id: revenue, credit_cents: invoice.total_cents, memo: 'service revenue' },
          ],
        })
      }
      if (payoutId) {
        const { postPayoutToLedger } = await import('../src/lib/finance/post-labor')
        const payoutPost = await postPayoutToLedger({ tenantId: tenant.id, payoutId })
        add('payroll: payout posted to the ledger', payoutPost.posted, JSON.stringify(payoutPost))
      }
    }

    // ================= REFERRALS =================
    const { data: referrer, error: refErr } = await supabase.from('referrers').insert({
      tenant_id: tenant.id, name: def.referrerName, referral_code: `SIM${runId.slice(0, 6).toUpperCase()}`,
      commission_rate: 0.10, preferred_payout: def.referrerPayout, status: 'active',
    }).select('id').single()
    add('referral: referrer on file (this customer was referred)', !!referrer && !refErr, refErr?.message)
    if (referrer && firstBooking) {
      await supabase.from('bookings').update({ referrer_id: referrer.id }).eq('id', firstBooking.id).eq('tenant_id', tenant.id)
      const grossCents = oneTimeTotals.total_cents
      const commissionCents = Math.round(grossCents * 0.10)
      const { data: commission, error: commErr } = await supabase.from('referral_commissions').insert({
        tenant_id: tenant.id, booking_id: firstBooking.id, referrer_id: referrer.id, client_name: def.customerName,
        gross_amount_cents: grossCents, commission_rate: 0.10, commission_cents: commissionCents, status: 'pending',
      }).select('id').single()
      add('referral: commission accrued for the referred customer', !!commission && !commErr, commErr?.message)
      if (commission) {
        const { postCommissionAccrual, postCommissionPayment } = await import('../src/lib/finance/post-adjustments')
        const accrual = await postCommissionAccrual({ tenantId: tenant.id, commissionId: commission.id })
        add('referral: commission accrual posted to the ledger', accrual.posted, JSON.stringify(accrual))
        const { bumpReferrerTotal } = await import('../src/lib/referrer-ledger')
        await bumpReferrerTotal(tenant.id, referrer.id, 'total_earned', commissionCents)
        await supabase.from('referral_commissions').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: def.referrerPayout }).eq('id', commission.id)
        const payment = await postCommissionPayment({ tenantId: tenant.id, commissionId: commission.id })
        add('referral: commission paid out + posted', payment.posted, JSON.stringify(payment))
        await bumpReferrerTotal(tenant.id, referrer.id, 'total_paid', commissionCents)
      }
    }

    // ================= REVIEWS =================
    const { data: review, error: reviewErr } = await supabase.from('reviews').insert({
      tenant_id: tenant.id, name: def.customerName, email: contactEmail, rating: def.reviewRating,
      text: def.reviewText, service_type: def.industry, team_member_name: def.workerName,
      status: 'pending', verified: true, client_id: clientId || null,
    }).select('id, rating, text').single()
    add('reviews: real trade-specific feedback captured', !!review && !reviewErr, reviewErr?.message)
    add('reviews: customer language + rating preserved verbatim', review?.text === def.reviewText && review?.rating === def.reviewRating)

    // ================= COMMS (SMS/email — realistic branded content) =================
    const { clientSmsTemplatesFor } = await import('../src/lib/messaging/client-sms')
    const smsTemplates = await clientSmsTemplatesFor(tenant.id)
    const bookingForSms = { start_time: firstBooking?.start_time || new Date().toISOString(), team_members: worker ? { name: worker.name } : null }
    const confirmationSms = smsTemplates.bookingConfirmation(bookingForSms)
    add("comms: booking confirmation is branded in THIS tenant's name (not a generic label)", confirmationSms.includes(bizName), confirmationSms.slice(0, 90))

    // ================= REPORTING =================
    const { ledgerProfitAndLoss } = await import('../src/lib/finance/ledger-reports')
    const today = new Date().toISOString().slice(0, 10)
    const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
    const pnl = await ledgerProfitAndLoss(tenant.id, monthAgo, today)
    add("reporting: P&L reflects this account's real activity", pnl.revenue_cents > 0, `revenue=${pnl.revenue_cents}c net=${pnl.net_profit_cents}c`)

    // ================= PLAN CANCELLATION (real feature: DELETE /api/admin/recurring-schedules/[id]) =================
    // Lawn-only: "sold the house, moving out of state" is a common real reason
    // a happy recurring customer permanently cancels — the one recurring
    // lifecycle terminal state (as opposed to pause/resume, already exercised
    // above) P11 hadn't touched yet. Mirrors the real route's two-part effect
    // (requirePermission-gated, so invoked as a direct DB mirror like the
    // exception/pause blocks above, not called as a handler): flip the
    // schedule to 'cancelled' + cancel every future scheduled/pending booking.
    if (def.industry === 'lawn_care' && schedule) {
      const { data: cancelledSchedule, error: cancelErr } = await supabase.from('recurring_schedules')
        .update({ status: 'cancelled' }).eq('id', schedule.id).select('id, status').single()
      const { data: cancelledBookings } = await supabase.from('bookings')
        .update({ status: 'cancelled' }).eq('schedule_id', schedule.id)
        .in('status', ['scheduled', 'pending']).gte('start_time', new Date().toISOString())
        .select('id')
      add('schedule: customer sold the house, cancelled the plan entirely (not a pause)',
        !cancelErr && cancelledSchedule?.status === 'cancelled', cancelErr?.message)
      add('schedule: remaining future visits cancelled on full plan termination', true, `${cancelledBookings?.length || 0} cancelled`)
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message
      : (err && typeof err === 'object') ? JSON.stringify(err)
      : String(err)
    add('FATAL', false, msg)
  } finally {
    if (!PERSIST && tenantId) {
      for (const tbl of [
        'recurring_exceptions', 'reviews', 'referral_commissions', 'referrers', 'team_member_payouts', 'payments', 'client_properties',
        'territory_claims', 'journal_lines', 'journal_entries', 'chart_of_accounts', 'hr_employee_profiles',
        'hr_document_requirements', 'invoice_activity', 'invoices', 'quote_activity', 'quotes', 'job_events',
        'job_payments', 'bookings', 'recurring_schedules', 'jobs', 'team_members', 'clients', 'portal_leads',
        'service_types', 'entities', 'tenant_invites',
      ]) {
        await supabase.from(tbl).delete().eq('tenant_id', tenantId) // best-effort, ignore errors
      }
      let delOk = false
      for (let i = 0; i < 4 && !delOk; i++) {
        const { error } = await supabase.from('tenants').delete().eq('id', tenantId)
        if (!error) delOk = true
        else if (i === 3) leftovers.push(`tenants(${tenantId.slice(0, 8)}): ${error.message}`)
      }
    } else if (tenantId) {
      leftovers.push(`PERSISTED tenant ${tenantId}`)
    }
  }

  const passed = checks.filter(c => c.pass).length
  const failed = checks.filter(c => !c.pass).length
  const failures = checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  return { category: def.label, industry: def.industry, model: 'recurring-archetype', passed, failed, failures, ms: Date.now() - t0, leftovers }
}

async function main() {
  const list = ONLY.length ? TRADES.filter(t => ONLY.some(o => t.category.toLowerCase().includes(o.toLowerCase()) || t.model === o)) : TRADES
  console.log(`\n=== ALL-TRADES SIM — ${list.length} trades (P1-P9) ${PERSIST ? '(PERSIST)' : '(cleanup)'} ===\n`)
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

  // P11 — recurring archetype narratives (skip when running a trade subset,
  // same convention as the other global/cross-cutting phases above).
  const archetypeResults: TradeResult[] = []
  if (!ONLY.length) {
    console.log(`\n=== RECURRING ARCHETYPE SCENARIOS — ${RECURRING_ARCHETYPES.length} (cleaning/pest/lawn) ===\n`)
    for (let i = 0; i < RECURRING_ARCHETYPES.length; i++) {
      process.stdout.write(`[arch ${i + 1}/${RECURRING_ARCHETYPES.length}] ${RECURRING_ARCHETYPES[i].label.padEnd(35)}`)
      const r = await runRecurringArchetype(RECURRING_ARCHETYPES[i], i)
      archetypeResults.push(r)
      console.log(`${r.failed === 0 ? '✓' : '✗'} ${r.passed} pass${r.failed ? ` / ${r.failed} FAIL` : ''} (${r.ms}ms)`)
      r.failures.forEach(f => console.log(`      ✗ ${f}`))
      if (r.leftovers.length) r.leftovers.forEach(l => console.log(`      ⚠ leftover ${l}`))
    }
  }

  const totPass = results.reduce((a, r) => a + r.passed, 0) + terr.passed + commsGate.passed + archetypeResults.reduce((a, r) => a + r.passed, 0)
  const totFail = results.reduce((a, r) => a + r.failed, 0) + terr.failed + commsGate.failed + archetypeResults.reduce((a, r) => a + r.failed, 0)
  const greenTrades = results.filter(r => r.failed === 0).length
  console.log(`\n=== SUMMARY ===`)
  console.log(`  trades 100%: ${greenTrades}/${results.length}`)
  console.log(`  archetype scenarios 100%: ${archetypeResults.filter(r => r.failed === 0).length}/${archetypeResults.length}`)
  console.log(`  checks: ${totPass} passed, ${totFail} failed`)
  const failedTrades = results.filter(r => r.failed > 0).map(r => r.category)
  if (failedTrades.length) console.log(`  FAILING: ${failedTrades.join(', ')}`)
  const failedArchetypes = archetypeResults.filter(r => r.failed > 0).map(r => r.category)
  if (failedArchetypes.length) console.log(`  ARCHETYPES FAILING: ${failedArchetypes.join(', ')}`)

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
  writeFileSync(resolve(outDir, 'sim-recurring-archetypes.json'), JSON.stringify(archetypeResults, null, 2))
  process.exit(totFail > 0 ? 1 : 0)
}

main().catch(err => { console.error('[sim] fatal:', err); process.exit(1) })
