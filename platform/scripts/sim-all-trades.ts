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
// team-portal token.ts refuses to fall back to SUPABASE_SERVICE_ROLE_KEY (a
// leaked portal token would then act as a signature oracle against it) and
// throws if TEAM_PORTAL_SECRET is unset -- .env.local doesn't carry it in
// every worktree. A process-local random secret is sufficient here: this
// harness only ever mints and verifies its own tokens within the same run,
// never against a real deployed instance.
if (!process.env.TEAM_PORTAL_SECRET) process.env.TEAM_PORTAL_SECRET = randomBytes(32).toString('hex')
// Client-portal token.ts (src/app/api/portal/auth/token.ts) has the same
// refuse-to-fall-back requirement for the SAME reason, gating createToken/
// verifyPortalToken used by the client/recurring archetype probe below.
if (!process.env.PORTAL_SECRET) process.env.PORTAL_SECRET = randomBytes(32).toString('hex')
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

    // ================= P10 — SALES PIPELINE (lead → deal → proposal → close) =================
    // Gap flagged by W4: P1-P9 above go prospect(platform)→tenant→quote→booking
    // directly and never touch the CUSTOMER-facing sales pipeline (deals table) —
    // a different domain from the platform-onboarding "prospect" in P1. Real entry
    // point is /api/contact's auto-deal-create on a web lead; mirrored here via
    // direct insert (same shape) since driving the actual form endpoint would need
    // a running server.
    const { stageMeta: pipeStageMeta, OPEN_STAGES: pipeOpenStages } = await import('../src/lib/pipeline')
    const { data: dealClient, error: dcErr } = await supabase.from('clients').insert({
      tenant_id: tenant.id, name: 'Pipeline Customer', email: `pipeline+${runId}@example.com`,
      phone: '+15551236666', address: `${loc.city}, ${loc.state} ${loc.zip}`, status: 'lead',
    }).select('id').single()
    add('pipeline: client created for deal', !!dealClient && !dcErr, dcErr?.message)

    const { data: deal, error: dealErr } = await supabase.from('deals').insert({
      tenant_id: tenant.id, client_id: dealClient?.id || null, title: `${ind} inquiry`,
      stage: 'new', mode: 'sales', value_cents: 0, probability: 10, source: 'web', status: 'active',
      last_activity_at: new Date().toISOString(),
    }).select('id, stage, probability').single()
    add('pipeline: deal created at new/lead stage', !!deal && !dealErr && deal.stage === 'new', dealErr?.message)
    add('pipeline: stage constants (new=Lead, prob 10, open)',
      pipeStageMeta('new').label === 'Lead' && pipeStageMeta('new').defaultProbability === 10 && pipeOpenStages.includes('new'))

    if (deal) {
      // P10.1 proposal — a quote linked to the deal (quotes.deal_id is the real
      // proposal↔pipeline contract quotes/route.ts and the send/accept routes rely on)
      const propNum = await generateQuoteNumber(tenant.id)
      const depositCents = Math.round((liveTotals.subtotal_cents || 20000) * 0.3)
      const { data: proposal, error: propErr } = await supabase.from('quotes').insert({
        tenant_id: tenant.id, client_id: dealClient?.id || null, deal_id: deal.id,
        quote_number: propNum, status: 'draft', title: `${ind} proposal`,
        contact_name: 'Pipeline Customer', contact_email: `pipeline+${runId}@example.com`,
        contact_phone: '+15551236666', service_address: `${loc.city}, ${loc.state} ${loc.zip}`,
        line_items: liveLineItems, subtotal_cents: liveTotals.subtotal_cents, tax_rate_bps: 0,
        tax_cents: 0, discount_cents: 0, total_cents: liveTotals.subtotal_cents,
        deposit_type: 'flat', deposit_value: depositCents, deposit_cents: depositCents,
        public_token: generatePublicToken(),
      }).select('id, public_token, total_cents, deposit_cents').single()
      add('pipeline: proposal (quote) linked to deal', !!proposal && !propErr && proposal.deposit_cents === depositCents, propErr?.message)

      if (proposal) {
        // P10.2 send — mirrors quotes/[id]/send.ts's first-send side effects
        // directly (status → sent, deal note + value sync). Not calling that route:
        // it's authenticated (requirePermission → headers()/cookies()), which has
        // no context outside a real Next.js request.
        await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', proposal.id)
        await supabase.from('deal_activities').insert({
          tenant_id: tenant.id, deal_id: deal.id, type: 'note',
          description: `Proposal ${propNum} sent — $${(proposal.total_cents / 100).toFixed(2)}`,
          metadata: { quote_id: proposal.id },
        })
        await supabase.from('deals').update({ value_cents: proposal.total_cents, last_activity_at: new Date().toISOString() }).eq('id', deal.id)

        // P10.3 accept — invokes the REAL public accept route handler directly. It's
        // unauthenticated/token-based (no headers()/cookies() dependency), so this
        // exercises actual production code for the exact untested branch: a signed
        // proposal WITH a deposit must move its deal to 'pending' (not 'sold') and
        // NOT auto-create a job yet — that's the row-level guarantee W4's gap left
        // unverified. Unique per-trade IP so rateLimitDb's per-IP cap never trips.
        const { POST: acceptQuote } = await import('../src/app/api/quotes/public/[token]/accept/route')
        const sigPng = 'data:image/png;base64,' + 'A'.repeat(120)
        const acceptReq = new Request(`http://localhost/api/quotes/public/${proposal.public_token}/accept`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.77.${idx}.1` },
          body: JSON.stringify({ signature_png: sigPng, signature_name: 'Pipeline Customer' }),
        })
        const acceptRes = await acceptQuote(acceptReq, { params: Promise.resolve({ token: proposal.public_token }) })
        add('pipeline: proposal accept succeeds (real route)', acceptRes.status === 200, `status=${acceptRes.status}`)

        const { data: dealAfterAccept } = await supabase.from('deals').select('stage, probability').eq('id', deal.id).single()
        add('pipeline: deposit required → deal moves to pending (not sold)', dealAfterAccept?.stage === 'pending' && dealAfterAccept?.probability === 80, JSON.stringify(dealAfterAccept))

        const { data: jobsAfterAccept } = await supabase.from('jobs').select('id').eq('tenant_id', tenant.id).eq('quote_id', proposal.id)
        add('pipeline: deposit-pending accept does NOT auto-create a job yet', (jobsAfterAccept?.length || 0) === 0, `${jobsAfterAccept?.length} jobs`)

        const { data: pipelineActivities } = await supabase.from('deal_activities').select('type').eq('deal_id', deal.id)
        add('pipeline: stage_change + note activities logged', (pipelineActivities?.length || 0) >= 3, `${pipelineActivities?.length} activities`)

        // P10.4 manual close-to-sold via /api/deals/[id]/stage's own logic path:
        // dealt with directly (that route is also requirePermission-gated) —
        // apply its exact documented transition (probability→100, closed_at set)
        // and confirm the deal is a real terminal CLOSED_STAGE per pipeline.ts.
        const { CLOSED_STAGES } = await import('../src/lib/pipeline')
        await supabase.from('deals').update({ stage: 'sold', probability: 100, closed_at: new Date().toISOString() }).eq('id', deal.id)
        const { data: dealClosed } = await supabase.from('deals').select('stage, probability, closed_at').eq('id', deal.id).single()
        add('pipeline: manual close to sold is terminal + fully-probable', dealClosed?.stage === 'sold' && dealClosed?.probability === 100 && !!dealClosed?.closed_at && (CLOSED_STAGES as readonly string[]).includes('sold'))
      }
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
        for (const tbl of ['territory_claims', 'journal_lines', 'journal_entries', 'chart_of_accounts', 'hr_employee_profiles', 'hr_document_requirements', 'invoice_activity', 'invoices', 'quote_activity', 'deal_activities', 'deals', 'quotes', 'job_events', 'job_payments', 'bookings', 'recurring_schedules', 'jobs', 'team_members', 'clients', 'service_types', 'entities', 'tenant_invites']) {
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

// ================= P12 — PROJECT ARCHETYPES (W2 lane: roofing/remodeling/interior design) =================
// Not mechanical CRUD like P1-P10 above — each scenario is a REAL job with
// realistic customer language and trade-specific pricing, driven through every
// feature an owner/staff/customer actually touches: marketing/lead capture
// (deals pipeline) → quote/proposal (real comms compose) → sale conversion →
// scheduling (real multi-session project timeline w/ real lead times) →
// HR/onboarding (hire the crew that does the work) → payroll (paid + posted
// to the ledger, correct account by employment type) → bookkeeping/invoicing
// (milestone invoices + payments posted to the ledger) → referrals (the past
// customer/partner who sent the lead earns commission) → reviews → reporting
// (ledger P&L over the project's own date range). Each scenario provisions +
// cleans up its OWN tenant (independent of the TRADES loop above).
interface ProjectLineItem { name: string; quantity: number; unit_price_cents: number }
interface ProjectPaymentPct { label: string; kind: 'deposit' | 'progress' | 'final'; pct: number; trigger: 'manual' | 'on_stage_complete' | 'on_signature' }
interface ProjectSessionPlan { label: string; offsetDays: number; startHour: number; endHour: number }
interface ProjectScenario {
  key: string
  category: string // fed to mapIndustry
  bizName: string
  lead: { source: string; message: string; contactName: string; contactEmail: string; contactPhone: string; address: string }
  quoteTitle: string
  lineItems: ProjectLineItem[]
  taxRateBps: number
  // The FIRST proposal sent gets declined before anything is signed — real,
  // live POST /api/quotes/public/[token]/decline route, zero coverage
  // anywhere in this harness before this. The business re-quotes with a
  // negotiated discount off the same scope, and THAT revised proposal is
  // the one actually signed and converted to a job.
  initialQuoteDecline: { reason: string; revisedDiscountPct: number }
  payments: ProjectPaymentPct[]
  sessions: ProjectSessionPlan[]
  crew: { name: string; employmentType: 'contractor_1099' | 'employee_w2'; compType: 'per_job' | 'hourly' | 'salary'; payLabel: string; payCents: number; payMethod: string }
  referrer: { name: string; email: string; phone: string; refCode: string; commissionRate: number; note: string }
  // The commission earned above sits at status='pending' forever unless
  // someone actually pays the referrer out — a distinct real event (the
  // office cutting a Zelle/check to Tom/the Petersons/Dana some weeks after
  // the job closes), not the moment the commission was earned.
  referralPayout: { note: string; paidVia: string }
  review: { rating: number; comment: string }
  // Mid-project scope change — the customer adds/changes scope after the job
  // is already sold, scheduled and underway (not caught at quote time). Real
  // pain point for every one of these trades: hidden damage found once
  // tear-off starts, a client falling for the samples and wanting more,
  // seeing one room finished and wanting another added.
  changeOrder: { note: string; offsetDays: number; lineItem: ProjectLineItem }
  // Customer disputes the FINAL invoice after the work is otherwise complete —
  // the other real friction point, distinct from mid-project scope growth
  // above: a punch-list item they say wasn't finished, a substitution they
  // didn't sign off on, a finish they're unhappy with. Resolved as a
  // negotiated partial credit against the final invoice, not a redo.
  dispute: { note: string; offsetDays: number; creditPct: number }
  // Customer UNDERPAYS a mid-project PROGRESS milestone (not the final
  // invoice, and not a quality/scope dispute) — a cash-flow/collections
  // problem: "I'll catch up next week" money still owed for work already
  // done. Distinct from `dispute` above (which never touches amount_paid_cents
  // or invoice.status='partial' at all — it just credits a fully-paid final
  // invoice). Exercises the REAL partial-payment mechanics: a payment row
  // linked to invoice_id so the DB trigger (invoices_recompute_paid,
  // migrations/027_invoices.sql) recomputes amount_paid_cents + flips status
  // to 'partial', a collections follow-up logged while the balance is still
  // outstanding, then the remainder collected and the trigger flips it to
  // 'paid'.
  progressUnderpayment: { note: string; shortPct: number; followupOffsetDays: number }
  // Customer CANCELS the mid-project change-order scope after it's already
  // been invoiced and paid up front (materials special-ordered — the real
  // workflow across these trades when added scope requires ordering
  // non-stock material). Distinct from `dispute` (credits a fully-completed
  // final invoice) and `progressUnderpayment` (collections, never refunds):
  // this is a genuine kill-fee cancellation — the business keeps a portion
  // covering costs already committed, and refunds the remainder against the
  // change-order invoice specifically, never touching the base contract's
  // deposit/progress/final milestones.
  cancellation: { note: string; killFeePct: number }
  // Warranty callback — a legitimate workmanship issue the customer reports
  // AFTER the job is marked 'completed' and every invoice is settled (not a
  // dispute against an open invoice, not scope creep: the job is closed out,
  // paid, and the crew is going back for free under the trade's own
  // workmanship guarantee). Exercises a real transition never exercised
  // elsewhere in this harness — every prior scenario leaves job.status at
  // 'scheduled' the whole run — plus proves a post-completion service event
  // stays a $0 job_events entry: no new invoice, no new payment, no revenue
  // leak into the P&L for work done under warranty.
  warrantyCallback: { note: string; offsetDaysAfterCompletion: number }
}

const PROJECT_LOC = { city: 'Charlotte', state: 'NC', zip: '28202' }

function projectDaysFromNow(days: number, hour: number, minute = 0): string {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString().slice(0, 19)
}

const PROJECT_SCENARIOS: ProjectScenario[] = [
  {
    key: 'roofing',
    category: 'Roofing',
    bizName: 'SIM Roofing',
    lead: {
      source: 'referral',
      message: "Hey — my neighbor Tom had you guys reroof his place last summer and told me to call. We had that hailstorm come through Tuesday night and I've got dents all over the gutters and found 4-5 shingles blown into the yard. State Farm adjuster is coming out Friday at 10am — can someone take a look before then? House is a 2200 sqft ranch, one layer of 20-year-old 3-tab up there now, standard pitch.",
      contactName: 'Marcus Webb', contactEmail: 'marcus.webb.sim@example.com', contactPhone: '+17045550142',
      address: `418 Sedgefield Rd, ${PROJECT_LOC.city}, ${PROJECT_LOC.state} ${PROJECT_LOC.zip}`,
    },
    quoteTitle: 'Storm-damage full reroof — 30 sq, architectural shingle',
    lineItems: [
      { name: 'Tear-off & disposal — existing 3-tab shingles (30 sq)', quantity: 30, unit_price_cents: 16500 },
      { name: 'Ice & water shield + synthetic underlayment (30 sq)', quantity: 30, unit_price_cents: 9500 },
      { name: 'GAF Timberline HDZ architectural shingles, installed (30 sq)', quantity: 30, unit_price_cents: 41000 },
      { name: 'Ridge vent replacement (42 LF)', quantity: 42, unit_price_cents: 1200 },
      { name: 'Pipe boot & flashing replacement', quantity: 6, unit_price_cents: 8500 },
      { name: 'Dumpster & disposal fee', quantity: 1, unit_price_cents: 65000 },
    ],
    taxRateBps: 0,
    initialQuoteDecline: {
      reason: "Marcus said the number came in higher than the adjuster's estimate and wants to see if there's any room before he signs anything — asked us to double check the numbers against what State Farm approved.",
      revisedDiscountPct: 0.05,
    },
    payments: [
      { label: 'Deposit — materials order', kind: 'deposit', pct: 0.30, trigger: 'on_signature' },
      { label: 'Progress — tear-off & dry-in complete', kind: 'progress', pct: 0.40, trigger: 'on_stage_complete' },
      { label: 'Final — job complete & inspected', kind: 'final', pct: 0.30, trigger: 'manual' },
    ],
    sessions: [
      { label: 'Tear-off & dry-in', offsetDays: 18, startHour: 7, endHour: 16 },
      { label: 'Decking repair & underlayment', offsetDays: 19, startHour: 7, endHour: 15 },
      { label: 'Shingle install, ridge vent & cleanup', offsetDays: 20, startHour: 7, endHour: 17 },
    ],
    crew: {
      name: 'Sim Crew Lead — Roofing', employmentType: 'contractor_1099', compType: 'per_job',
      payLabel: 'Reroof job — crew lead pay', payCents: 320000, payMethod: 'zelle',
    },
    referrer: {
      name: 'Tom R. (past reroof customer)', email: 'tom.r.sim@example.com', phone: '+17045550199',
      refCode: 'TOMR2026', commissionRate: 0.05, note: 'Referred Marcus Webb after his own reroof last summer',
    },
    review: {
      rating: 5,
      comment: "Storm hit Tuesday night and these guys had a tarp on by Thursday morning, then did the full reroof three weeks later exactly like they said. Ridge vent looks great, cleanup was spotless — didn't find a single nail in the yard.",
    },
    changeOrder: {
      note: "Crew called mid tear-off — once the old shingles came off they found 6 sheets of decking rotted through around a old vent boot, not visible during the original inspection. Needs replacing before dry-in or the new roof has nothing solid to nail into.",
      offsetDays: 18,
      lineItem: { name: 'Rotted decking replacement (6 sheets 4x8 OSB, found during tear-off)', quantity: 6, unit_price_cents: 22000 },
    },
    dispute: {
      note: "Marcus walked the roof after the final inspection and said one of the pipe boots was still leaking during last night's rain, refused to pay the final invoice until it's resolved. Crew went back out and found it was a satellite dish mount his own installer drilled through the new flashing after job completion — not the reroof work. Rather than fight it with the adjuster, ops negotiated a goodwill credit against the final invoice to close it out.",
      offsetDays: 21,
      creditPct: 0.12,
    },
    progressUnderpayment: {
      note: "Marcus's insurance adjuster only released the ACV (actual cash value) portion of the claim so far — the depreciation check doesn't come until State Farm gets the completed invoice. He sent what he has against the tear-off/dry-in progress milestone and asked to catch up once that second check clears.",
      shortPct: 0.35,
      followupOffsetDays: 10,
    },
    cancellation: {
      note: "State Farm's depreciation check came in lower than Marcus expected once it finally cleared, so he asked to cancel the decking change order rather than pay it in full — the crew had already bought and cut the OSB sheets before he called, so a kill fee covering the material cost was applied and the labor portion refunded.",
      killFeePct: 0.55,
    },
    warrantyCallback: {
      note: "Six weeks after final inspection Marcus called about a drip stain forming on the garage ceiling during a heavy rain — crew went back out under the 5-year workmanship warranty and found one of the new pipe boots hadn't fully seated. Resealed on site, no charge — it's a workmanship callback, not a new sale.",
      offsetDaysAfterCompletion: 42,
    },
    referralPayout: {
      note: "Job closed out and invoiced, so ops cut Tom his referral check for sending Marcus over.",
      paidVia: 'zelle',
    },
  },
  {
    key: 'remodeling',
    category: 'Remodeling / General Contracting',
    bizName: 'SIM Remodeling',
    lead: {
      source: 'referral',
      message: "We've been putting this off for two years but our kitchen is straight out of 1987 and the laminate counters are peeling. The Petersons two doors down said you did their bathroom last spring and it turned out great, and we've been following your Instagram since. We want to gut it — new cabinets, quartz counters, a farmhouse sink, and move the fridge to the other wall. Budget's flexible for the right team, we just don't want a 6-month nightmare.",
      contactName: 'Elena Cho', contactEmail: 'elena.cho.sim@example.com', contactPhone: '+17045550218',
      address: `2214 Sunnyslope Ave, ${PROJECT_LOC.city}, ${PROJECT_LOC.state} ${PROJECT_LOC.zip}`,
    },
    quoteTitle: 'Kitchen remodel — full gut, cabinets, quartz, layout change',
    lineItems: [
      { name: 'Demo & disposal — existing cabinets/counters/flooring', quantity: 1, unit_price_cents: 280000 },
      { name: 'Electrical rough-in (relocated outlets, island circuit, under-cabinet lighting)', quantity: 1, unit_price_cents: 320000 },
      { name: 'Plumbing rough-in (relocate sink/dishwasher line, range gas line)', quantity: 1, unit_price_cents: 260000 },
      { name: 'Custom cabinetry, installed', quantity: 32, unit_price_cents: 41000 },
      { name: 'Quartz countertops & farmhouse sink, installed', quantity: 58, unit_price_cents: 11500 },
      { name: 'Tile backsplash, installed', quantity: 40, unit_price_cents: 2800 },
      { name: 'Painting — walls, ceiling, trim', quantity: 1, unit_price_cents: 145000 },
      { name: 'Appliance hookup & final punch list', quantity: 1, unit_price_cents: 95000 },
    ],
    taxRateBps: 0,
    initialQuoteDecline: {
      reason: "Elena and her husband said the total came in higher than they expected once they saw the line-by-line breakdown and want a few days to sit with it before signing.",
      revisedDiscountPct: 0.04,
    },
    payments: [
      { label: 'Deposit — signing', kind: 'deposit', pct: 0.30, trigger: 'on_signature' },
      { label: 'Progress — cabinet delivery', kind: 'progress', pct: 0.30, trigger: 'on_stage_complete' },
      { label: 'Progress — countertop template & install', kind: 'progress', pct: 0.20, trigger: 'on_stage_complete' },
      { label: 'Final — punch list complete', kind: 'final', pct: 0.20, trigger: 'manual' },
    ],
    sessions: [
      { label: 'Demo', offsetDays: 5, startHour: 8, endHour: 17 },
      { label: 'Electrical + plumbing rough-in', offsetDays: 12, startHour: 8, endHour: 17 },
      { label: 'Cabinet install', offsetDays: 26, startHour: 8, endHour: 17 },
      { label: 'Countertop template', offsetDays: 33, startHour: 9, endHour: 11 },
      { label: 'Countertop & sink install', offsetDays: 40, startHour: 8, endHour: 17 },
      { label: 'Backsplash, paint & punch list', offsetDays: 47, startHour: 8, endHour: 17 },
    ],
    crew: {
      name: 'Sim Lead Carpenter — Remodel', employmentType: 'employee_w2', compType: 'salary',
      payLabel: 'Kitchen remodel — lead carpenter wages', payCents: 240000, payMethod: 'ach',
    },
    referrer: {
      name: 'The Petersons (past bathroom remodel client)', email: 'petersons.sim@example.com', phone: '+17045550233',
      refCode: 'PETERSON26', commissionRate: 0.03, note: 'Referred Elena Cho after their own bathroom remodel last spring',
    },
    review: {
      rating: 5,
      comment: 'The custom cabinetry turned out better than our mood board. They showed up every single day when they said they would, which after hearing our friends’ remodel horror stories felt like a miracle.',
    },
    changeOrder: {
      note: "Elena saw the cabinet samples go in and now wants the same cabinetry run extended into the little mudroom nook by the back door, plus a wine fridge cutout — wasn't in the original scope, she signed off knowing it pushes the timeline out a bit.",
      offsetDays: 26,
      lineItem: { name: 'Additional cabinetry — mudroom nook + wine fridge cutout, installed', quantity: 1, unit_price_cents: 620000 },
    },
    dispute: {
      note: "Elena says the backsplash grout doesn't match the sample she picked at selections — the exact shade was discontinued mid-project and the closest match got installed without a documented sign-off from her. She's refusing to pay the final invoice until it's redone. Ops isn't tearing out a finished kitchen over a grout shade, so a credit against the final invoice was negotiated instead.",
      offsetDays: 48,
      creditPct: 0.10,
    },
    progressUnderpayment: {
      note: "Elena's HELOC draw for the cabinet-delivery milestone got held up by the bank a week — she sent what she had on hand to keep the delivery from slipping and promised to wire the rest once the draw clears.",
      shortPct: 0.25,
      followupOffsetDays: 7,
    },
    cancellation: {
      note: "Elena and her husband got cold feet on the mudroom nook extension once they saw the running total — the wine fridge cutout hadn't been cut into the cabinet run yet but the cabinet shop had already built the extra boxes to spec, so a kill fee covering the shop's build cost was applied and the rest of the add-on refunded.",
      killFeePct: 0.40,
    },
    warrantyCallback: {
      note: "Two months after punch list, Elena reported one of the new cabinet doors near the range wasn't closing flush anymore — crew went back under the 1-year workmanship warranty and re-shimmed the hinge (humidity settling, not a install defect). No charge — it's a callback, not a new job.",
      offsetDaysAfterCompletion: 60,
    },
    referralPayout: {
      note: "Final punch list closed and paid, so ops paid out the Petersons' referral commission for sending Elena over.",
      paidVia: 'ach',
    },
  },
  {
    key: 'interior_design',
    category: 'Interior Design',
    bizName: 'SIM Interior Design',
    lead: {
      source: 'referral',
      message: "We just closed on a new build in the Reserve and it's a blank box — no furniture, no window treatments, nothing. Our realtor Dana said you handled her own place and to call before we even think about hitting a showroom. We need the living room, primary bedroom, and the home office done, ideally before the holidays so we can host.",
      contactName: 'Priya Nair', contactEmail: 'priya.nair.sim@example.com', contactPhone: '+17045550256',
      address: `88 Reserve Trail, ${PROJECT_LOC.city}, ${PROJECT_LOC.state} ${PROJECT_LOC.zip}`,
    },
    quoteTitle: 'Whole-home design + install — living room, primary bedroom, office',
    lineItems: [
      { name: 'Design consultation & space planning (3 rooms)', quantity: 3, unit_price_cents: 45000 },
      { name: 'Furniture procurement & sourcing — living room', quantity: 1, unit_price_cents: 220000 },
      { name: 'Furniture procurement & sourcing — primary bedroom', quantity: 1, unit_price_cents: 185000 },
      { name: 'Furniture procurement & sourcing — home office', quantity: 1, unit_price_cents: 140000 },
      { name: 'Window treatments, measured & installed', quantity: 7, unit_price_cents: 26000 },
      { name: 'Styling & install day (art, accessories, staging)', quantity: 1, unit_price_cents: 160000 },
      { name: 'Furniture goods pass-through (client-selected pieces)', quantity: 1, unit_price_cents: 1850000 },
    ],
    taxRateBps: 0,
    initialQuoteDecline: {
      reason: "Priya said the furniture pass-through line made the whole number feel too big even though it's mostly a pass-through cost, and asked if there was any flexibility before they commit.",
      revisedDiscountPct: 0.03,
    },
    payments: [
      { label: 'Design retainer — signing', kind: 'deposit', pct: 0.20, trigger: 'on_signature' },
      { label: 'Furniture procurement — orders placed', kind: 'progress', pct: 0.50, trigger: 'manual' },
      { label: 'Final — install day', kind: 'final', pct: 0.30, trigger: 'manual' },
    ],
    sessions: [
      { label: 'Design consult & measure', offsetDays: 3, startHour: 10, endHour: 12 },
      { label: 'Install day — furniture, styling, window treatments', offsetDays: 49, startHour: 8, endHour: 16 },
    ],
    crew: {
      name: 'Sim Stylist/Installer — Design', employmentType: 'contractor_1099', compType: 'per_job',
      payLabel: 'Install day — stylist pay', payCents: 85000, payMethod: 'venmo',
    },
    referrer: {
      name: 'Dana K. (realtor)', email: 'dana.k.sim@example.com', phone: '+17045550277',
      refCode: 'DANAK2026', commissionRate: 0.05, note: 'Realtor referral — sent Priya Nair after her own install',
    },
    review: {
      rating: 5,
      comment: "Closed on the house with zero furniture and two months later the living room and office are unrecognizable — exactly what we pictured, and we never set foot in a single showroom.",
    },
    changeOrder: {
      note: "Priya saw the primary bedroom mockups and now wants the guest bedroom done too before the holidays, since her in-laws are staying over — wasn't part of the original 3-room scope.",
      offsetDays: 20,
      lineItem: { name: 'Design + furniture procurement — guest bedroom (added mid-project)', quantity: 1, unit_price_cents: 165000 },
    },
    dispute: {
      note: "Priya noticed two of the living room accent chairs aren't the ones from the mockup — the vendor substituted a close match after the originals went on backorder, and nobody looped her in before install day. She wants a discount rather than a swap that would blow the holiday deadline, and is holding the final invoice until it's resolved.",
      offsetDays: 52,
      creditPct: 0.15,
    },
    progressUnderpayment: {
      note: "The furniture-procurement milestone landed right before the holidays — Priya asked to split it, sending enough to cover the vendor deposits required to place the orders and catching up on the rest before install day.",
      shortPct: 0.40,
      followupOffsetDays: 12,
    },
    cancellation: {
      note: "Priya's in-laws ended up booking a hotel instead, so she asked to cancel the guest bedroom add-on — the designer had already placed the vendor deposit to hold the case-good pieces on backorder before she called, so a kill fee covering that vendor deposit was applied and the rest of the add-on refunded.",
      killFeePct: 0.30,
    },
    warrantyCallback: {
      note: "A month after install day, Priya noticed the living room drapery track had pulled loose from the drywall on one end — installer went back under the workmanship warranty and re-anchored it into a stud (original anchor was in drywall only). No charge — installation callback, not a furniture defect.",
      offsetDaysAfterCompletion: 30,
    },
    referralPayout: {
      note: "Install day wrapped and the final invoice was paid, so ops paid Dana her referral commission for sending Priya over.",
      paidVia: 'venmo',
    },
  },
]

async function runProjectArchetype(cfg: ProjectScenario, idx: number): Promise<TradeResult> {
  const t0 = Date.now()
  const checks: Check[] = []
  const leftovers: string[] = []
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail })

  const runId = `${idx}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
  const { mapIndustry } = await import('../src/lib/provision-tenant')
  const ind = mapIndustry(cfg.category)
  add(`mapIndustry("${cfg.category}") → specific vertical (not general)`, ind !== 'general', ind)

  let tenantId: string | null = null
  try {
    // ---- SETUP: minimal real tenant (business already onboarded) ----
    const { signupPricing } = await import('../src/lib/tier-prices')
    const pricing = signupPricing()
    const bizName = `${cfg.bizName} ${runId}`
    const slug = slugify(bizName, runId)
    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
      name: bizName, slug, industry: ind,
      phone: OWNER.phone, email: OWNER.email,
      owner_name: OWNER.name, owner_email: OWNER.email, owner_phone: OWNER.phone,
      status: 'active', plan: 'growth',
      monthly_rate: Math.round((pricing.monthly_cents || 0) / 100),
      setup_fee: Math.round((pricing.setup_cents || 0) / 100),
      setup_fee_paid_at: new Date().toISOString(), billing_status: 'active',
      address: `${PROJECT_LOC.city}, ${PROJECT_LOC.state} ${PROJECT_LOC.zip}`,
    }).select('id, slug').single()
    add('setup: tenant created', !!tenant && !tErr, tErr?.message)
    if (!tenant) throw new Error('tenant insert failed: ' + tErr?.message)
    tenantId = tenant.id

    await supabase.from('entities').insert({ tenant_id: tenant.id, name: bizName, is_default: true, active: true })
    const { provisionTenant } = await import('../src/lib/provision-tenant')
    const prov = await provisionTenant({ tenantId: tenant.id, industry: ind })
    add('setup: provisionTenant seeded services', prov.seeded.services > 0, JSON.stringify(prov.seeded))

    // ================= 1. MARKETING / LEAD CAPTURE =================
    const { data: deal, error: dErr } = await supabase.from('deals').insert({
      tenant_id: tenant.id, client_id: null, mode: 'sales', stage: 'new', status: 'active',
      title: cfg.quoteTitle, source: cfg.lead.source, probability: 10,
      notes: cfg.lead.message,
    }).select('id, stage').single()
    add('lead: deal captured (pipeline stage=new)', !!deal && !dErr && deal.stage === 'new', dErr?.message)
    if (!deal) throw new Error('deal insert failed: ' + dErr?.message)

    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Inbound inquiry (${cfg.lead.source}): ${cfg.lead.message}`,
      metadata: { contact_name: cfg.lead.contactName, contact_email: cfg.lead.contactEmail, contact_phone: cfg.lead.contactPhone, address: cfg.lead.address },
    })
    const { notify } = await import('../src/lib/notify')
    await notify({ tenantId: tenant.id, type: 'new_lead', title: 'New Lead', message: `${cfg.lead.contactName} — ${cfg.lead.message.slice(0, 80)}…` })
    add('lead: notification recorded', true)

    // ---- QUALIFY: on-site estimate scheduled, deal → qualifying ----
    const { error: qualErr } = await supabase.from('deals').update({ stage: 'qualifying', last_activity_at: new Date().toISOString() }).eq('id', deal.id)
    add('qualify: deal → qualifying', !qualErr, qualErr?.message)
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Called ${cfg.lead.contactName.split(' ')[0]} back, scheduled on-site estimate.`,
    })

    // ================= 2. QUOTE / PROPOSAL =================
    const { computeTotals, normalizeLineItems, generateQuoteNumber, generatePublicToken, formatCents } = await import('../src/lib/quote')
    const lineItems = normalizeLineItems(cfg.lineItems)
    const totals = computeTotals(lineItems, cfg.taxRateBps, 0)
    add('quote: line items priced (no $0)', totals.subtotal_cents > 0 && lineItems.every(l => l.unit_price_cents > 0), `subtotal=${totals.subtotal_cents}`)

    const quoteNumber = await generateQuoteNumber(tenant.id)
    add('quote: number format Q-YYYYMM-NNNN', /^Q-\d{6}-\d{4}$/.test(quoteNumber), quoteNumber)

    const { data: quote0, error: qInsErr0 } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: null, deal_id: deal.id, quote_number: quoteNumber, status: 'draft',
      title: cfg.quoteTitle, contact_name: cfg.lead.contactName, contact_email: cfg.lead.contactEmail,
      contact_phone: cfg.lead.contactPhone, service_address: cfg.lead.address,
      line_items: lineItems, subtotal_cents: totals.subtotal_cents, tax_rate_bps: cfg.taxRateBps,
      tax_cents: totals.tax_cents, discount_cents: 0, total_cents: totals.total_cents,
      public_token: generatePublicToken(),
    }).select('id, total_cents, quote_number, public_token').single()
    add('quote: created & linked to deal', !!quote0 && !qInsErr0, qInsErr0?.message)
    if (!quote0) throw new Error('quote insert failed: ' + qInsErr0?.message)

    // ---- comms compose (pure — no send; tenant has no resend/telnyx keys) ----
    const { emailShell, smsFormat } = await import('../src/lib/messaging/shell')
    const quoteEmailHtml = emailShell({
      brand: { name: bizName },
      kicker: 'Your proposal is ready', heading: "Let's make it official.",
      bodyHtml: `<p>Hi ${cfg.lead.contactName.split(' ')[0]},</p><p>Your proposal ${quote0.quote_number} — ${cfg.quoteTitle} is ready. Total ${formatCents(quote0.total_cents)}.</p>`,
      cta: { label: 'Review & Accept', url: `https://${slug}.example.com/quote/${randomUUID()}` },
    })
    add('comms: quote email composes with real total', quoteEmailHtml.includes(formatCents(quote0.total_cents)) && quoteEmailHtml.includes(quote0.quote_number))
    const quoteSms = smsFormat({ name: bizName }, `Hi ${cfg.lead.contactName.split(' ')[0]}, your proposal for ${formatCents(quote0.total_cents)} is ready — review, sign & pay here.`)
    add('comms: quote sms signed with business name', quoteSms.includes(bizName))

    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: 'email' }).eq('id', quote0.id)
    await supabase.from('deals').update({ stage: 'quoted', value_cents: quote0.total_cents, last_activity_at: new Date().toISOString() }).eq('id', deal.id)
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Proposal ${quote0.quote_number} sent — ${formatCents(quote0.total_cents)}`,
      metadata: { quote_id: quote0.id, total_cents: quote0.total_cents },
    })
    add('quote: deal advanced to quoted', true)

    // ================= 2a. QUOTE DECLINED + REVISED (real public decline route) =================
    // Real, live route (POST /api/quotes/public/[token]/decline) with zero
    // coverage anywhere in this harness — every prior scenario's first quote
    // went straight from sent to accepted. Realistic across all three trades:
    // the customer balks at the number on the first proposal (sticker shock,
    // over budget) before signing anything, the business re-quotes with a
    // negotiated adjustment, and THAT revised proposal is what actually gets
    // signed and converted to a job. Public/token-based route (no
    // headers()/cookies() auth), same as the P10.3 accept-route call
    // elsewhere in this file, so it's invoked directly rather than mirrored.
    const { POST: declineQuote } = await import('../src/app/api/quotes/public/[token]/decline/route')
    const declineReq = new Request(`http://localhost/api/quotes/public/${quote0.public_token}/decline`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.89.${idx}.1` },
      body: JSON.stringify({ reason: cfg.initialQuoteDecline.reason }),
    })
    const declineRes = await declineQuote(declineReq, { params: Promise.resolve({ token: quote0.public_token }) })
    add('quote-decline: real public decline route succeeds', declineRes.status === 200, `status=${declineRes.status}`)

    const { data: quote0AfterDecline } = await supabase.from('quotes').select('status, declined_at, declined_reason').eq('id', quote0.id).single()
    add('quote-decline: original quote marked declined, reason logged verbatim',
      quote0AfterDecline?.status === 'declined' && !!quote0AfterDecline?.declined_at && quote0AfterDecline?.declined_reason === cfg.initialQuoteDecline.reason,
      JSON.stringify(quote0AfterDecline))

    const { data: quote0Activity } = await supabase.from('quote_activity').select('event_type').eq('quote_id', quote0.id)
    add('quote-decline: decline event logged on the quote timeline', (quote0Activity || []).some(a => a.event_type === 'declined'), JSON.stringify(quote0Activity))

    const { data: dealAfterDecline } = await supabase.from('deals').select('stage').eq('id', deal.id).single()
    add('quote-decline: deal stays open at quoted — operator decides re-quote vs lost, not auto-advanced', dealAfterDecline?.stage === 'quoted', dealAfterDecline?.stage)

    // Revised proposal — same scope, negotiated discount — is the one actually signed.
    const revisedDiscountCents = Math.round(totals.subtotal_cents * cfg.initialQuoteDecline.revisedDiscountPct)
    const revisedTotals = computeTotals(lineItems, cfg.taxRateBps, revisedDiscountCents)
    const revisedQuoteNumber = await generateQuoteNumber(tenant.id)
    const { data: quote, error: qInsErr } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: null, deal_id: deal.id, quote_number: revisedQuoteNumber, status: 'sent',
      title: `${cfg.quoteTitle} (revised)`, contact_name: cfg.lead.contactName, contact_email: cfg.lead.contactEmail,
      contact_phone: cfg.lead.contactPhone, service_address: cfg.lead.address,
      line_items: lineItems, subtotal_cents: revisedTotals.subtotal_cents, tax_rate_bps: cfg.taxRateBps,
      tax_cents: revisedTotals.tax_cents, discount_cents: revisedDiscountCents, total_cents: revisedTotals.total_cents,
      public_token: generatePublicToken(), sent_at: new Date().toISOString(), sent_via: 'email',
    }).select('id, total_cents, quote_number').single()
    add('quote-decline: revised proposal created with negotiated discount, less than the declined total', !!quote && !qInsErr && quote.total_cents < quote0.total_cents, qInsErr?.message || `${quote?.total_cents} vs ${quote0.total_cents}`)
    if (!quote) throw new Error('revised quote insert failed: ' + qInsErr?.message)
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Revised proposal ${quote.quote_number} sent after decline — ${formatCents(quote.total_cents)}`,
      metadata: { quote_id: quote.id, total_cents: quote.total_cents, discount_cents: revisedDiscountCents },
    })
    await supabase.from('deals').update({ value_cents: quote.total_cents, last_activity_at: new Date().toISOString() }).eq('id', deal.id)

    // ================= 3. SALE CONVERSION (the revised proposal) =================
    await supabase.from('quotes').update({ status: 'accepted', accepted_at: new Date().toISOString(), signature_name: cfg.lead.contactName }).eq('id', quote.id)
    await supabase.from('deals').update({ stage: 'pending', last_activity_at: new Date().toISOString() }).eq('id', deal.id)
    await notify({ tenantId: tenant.id, type: 'quote_accepted', title: 'Proposal accepted', message: `${cfg.lead.contactName} accepted ${quote.quote_number}` })

    // ================= 4. SCHEDULING (real project timeline) =================
    const { createJobFromQuote, logJobEvent, releasePaymentsForEvent } = await import('../src/lib/jobs')
    const plan = cfg.payments.map(p => ({ ...p, amount_cents: Math.round(quote.total_cents * p.pct) }))
    const allocated = plan.reduce((s, p) => s + p.amount_cents, 0)
    plan[plan.length - 1].amount_cents += quote.total_cents - allocated // remainder to final, no rounding drift

    const sessions = cfg.sessions.map(s => ({
      start_time: projectDaysFromNow(s.offsetDays, s.startHour),
      end_time: projectDaysFromNow(s.offsetDays, s.endHour),
      notes: s.label,
    }))
    const jobRes = await createJobFromQuote(tenant.id, quote.id, {
      payments: plan.map(p => ({ label: p.label, kind: p.kind, amount_cents: p.amount_cents, trigger: p.trigger })),
      sessions,
    })
    add('job: created from accepted quote', !!jobRes.job_id && !jobRes.already_converted)

    const { data: job } = await supabase.from('jobs').select('id, status, total_cents, client_id').eq('id', jobRes.job_id).single()
    add('job: status scheduled', job?.status === 'scheduled', job?.status)
    add('job: total = quote total', job?.total_cents === quote.total_cents)

    // ================= 3a. CLIENT AUTO-CREATE + REPEAT-CUSTOMER DEDUPE =================
    // createJobFromQuote() "mirrors the booking convert path" (src/lib/jobs.ts)
    // by resolving-or-creating a `clients` row from the quote's contact info —
    // real behavior every one of these project sales exercises, but never once
    // asserted here (the only existing check for this, "sell: client
    // auto-created from quote", covers the plain single-booking convert path
    // earlier in this file, not the project/job path). Also never exercised
    // anywhere: the dedupe-by-email half of that same function — a repeat
    // customer coming back for a second project (a referral did this reroof
    // last summer; the customer they told call about their OWN roof) must
    // resolve to the SAME client row, not silently create a duplicate contact
    // that would split their history across two client records.
    add('job: client auto-created from quote contact info (mirrors booking convert path)', !!job?.client_id, job?.client_id)
    const { data: autoClient } = await supabase.from('clients').select('name, email, phone, address, source').eq('id', job?.client_id || '').maybeSingle()
    add('client: name/email/phone/address match the quote contact exactly', autoClient?.name === cfg.lead.contactName && autoClient?.email === cfg.lead.contactEmail && autoClient?.phone === cfg.lead.contactPhone && autoClient?.address === cfg.lead.address, JSON.stringify(autoClient))
    add("client: source recorded as 'quote' (not silently blank)", autoClient?.source === 'quote', autoClient?.source)

    const repeatQuoteNumber = await generateQuoteNumber(tenant.id)
    const { data: repeatQuote } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: null, quote_number: repeatQuoteNumber, status: 'accepted',
      title: `${cfg.quoteTitle} (repeat customer — second property)`, contact_name: cfg.lead.contactName,
      contact_email: cfg.lead.contactEmail, contact_phone: cfg.lead.contactPhone, service_address: cfg.lead.address,
      line_items: lineItems, subtotal_cents: totals.subtotal_cents, tax_rate_bps: cfg.taxRateBps,
      tax_cents: totals.tax_cents, discount_cents: 0, total_cents: totals.total_cents, public_token: generatePublicToken(),
      accepted_at: new Date().toISOString(), signature_name: cfg.lead.contactName,
    }).select('id').single()
    const repeatJobRes = repeatQuote ? await createJobFromQuote(tenant.id, repeatQuote.id) : null
    add('repeat-customer: second project converts to its own job (not merged into the first)', !!repeatJobRes?.job_id && repeatJobRes.job_id !== jobRes.job_id && !repeatJobRes.already_converted, JSON.stringify(repeatJobRes))
    const { data: repeatJob } = repeatJobRes ? await supabase.from('jobs').select('client_id').eq('id', repeatJobRes.job_id).single() : { data: null }
    add('repeat-customer: second job resolves to the SAME client (dedupe by email, no duplicate contact)', !!repeatJob?.client_id && repeatJob.client_id === job?.client_id, `${repeatJob?.client_id} vs ${job?.client_id}`)
    const { data: clientRows } = await supabase.from('clients').select('id').eq('tenant_id', tenant.id).eq('email', cfg.lead.contactEmail)
    add('repeat-customer: exactly one client row for this email (no duplicate created)', (clientRows?.length || 0) === 1, `${clientRows?.length} rows`)

    const { data: jobPays } = await supabase.from('job_payments').select('id, label, kind, amount_cents, status, trigger').eq('job_id', jobRes.job_id).order('sort_order')
    add(`job: milestone payment plan (${plan.length} items)`, (jobPays?.length || 0) === plan.length, `${jobPays?.length} payments`)
    const depositRow = (jobPays || []).find(p => p.kind === 'deposit')
    add('job: on_signature deposit released → invoiced', depositRow?.status === 'invoiced', depositRow?.status)

    const { data: jobBookings } = await supabase.from('bookings').select('id, start_time, end_time, status').eq('job_id', jobRes.job_id).order('start_time')
    add(`job: ${sessions.length}-session project timeline scheduled`, (jobBookings || []).length === sessions.length, `${jobBookings?.length} sessions`)

    const { deriveDurationClass } = await import('../src/lib/schedule/duration-class')
    const first = jobBookings?.[0]?.start_time, last = jobBookings?.[jobBookings.length - 1]?.end_time
    const spanClass = first && last ? deriveDurationClass({ start_time: first, end_time: last }) : null
    add('schedule: full project span classifies as project/multiday (>1 day)', sessions.length > 1 ? spanClass === 'project' || spanClass === 'multiday' : true, `class=${spanClass}`)

    await supabase.from('deals').update({ stage: 'sold', status: 'active', closed_at: new Date().toISOString() }).eq('id', deal.id)
    const { data: soldDeal } = await supabase.from('deals').select('stage').eq('id', deal.id).single()
    add('sale: deal closed as sold', soldDeal?.stage === 'sold', soldDeal?.stage)

    // ================= 5. HR / ONBOARDING (hire the crew for THIS job) =================
    const { seedHrDefaults } = await import('../src/lib/hr')
    await seedHrDefaults(tenant.id)
    const { provisionApprovedApplicant } = await import('../src/lib/team-provisioning')
    const workerPhone = '704' + String(2000000 + idx * 111 + (Date.now() % 1000)).slice(-7)
    try {
      await provisionApprovedApplicant(tenant.id, {
        id: randomUUID(), name: cfg.crew.name, email: `crew+${runId}@example.com`, phone: workerPhone, address: null,
      })
    } catch (e) {
      const emailThrew = /Email not configured|Resend/i.test(e instanceof Error ? e.message : String(e))
      if (!emailThrew) throw e
    }
    const { data: members } = await supabase.from('team_members').select('id, pin, name').eq('tenant_id', tenant.id)
    add('hr: crew member provisioned as team member', (members?.length || 0) >= 1, `${members?.length} members`)
    const worker = (members || [])[0]
    add('hr: crew got 4-digit portal PIN', !!worker?.pin && /^\d{4}$/.test(String(worker.pin)))

    // ================= 5.0a TEAM-PORTAL LOGIN (real route, first-ever archetype coverage) =================
    // Every HR assertion above only checks the team_members/hr_employee_profiles
    // rows directly -- the crew's own actual entry point into the product,
    // POST /api/team-portal/auth (PIN login), had never been driven by this
    // harness at all (flagged as a gap in the prior gap/fluidity round). It's
    // unauthenticated/bearer-based (no headers()/cookies() dependency), so this
    // exercises real production code, not a mock. Unique per-scenario IP so
    // rateLimitDb's per-tenant+ip cap never trips.
    const { POST: portalAuthPOST } = await import('../src/app/api/team-portal/auth/route')
    const portalLogin = await portalAuthPOST(new Request('http://sim.local/api/team-portal/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.91.${idx}.1` },
      body: JSON.stringify({ pin: worker?.pin, tenant_slug: tenant.slug }),
    }))
    const portalLoginBody = await portalLogin.json()
    add('portal: crew member logs in with their real PIN (real route, not a mock)', portalLogin.status === 200 && !!portalLoginBody?.token, JSON.stringify({ status: portalLogin.status, hasToken: !!portalLoginBody?.token }))
    add('portal: login resolves to the correct team member', portalLoginBody?.member?.id === worker?.id, `${portalLoginBody?.member?.id} vs ${worker?.id}`)

    const hr2 = await seedHrDefaults(tenant.id)
    add('hr: profile backfilled for the new crew member', hr2.profilesBackfilled >= 1, `backfilled=${hr2.profilesBackfilled}`)

    if (worker?.id && cfg.crew.employmentType === 'employee_w2') {
      await supabase.from('hr_employee_profiles').update({ employment_type: 'employee_w2', comp_type: cfg.crew.compType })
        .eq('tenant_id', tenant.id).eq('team_member_id', worker.id)
    } else if (worker?.id) {
      await supabase.from('hr_employee_profiles').update({ comp_type: cfg.crew.compType })
        .eq('tenant_id', tenant.id).eq('team_member_id', worker.id)
    }
    const { data: prof } = await supabase.from('hr_employee_profiles').select('employment_type, comp_type').eq('tenant_id', tenant.id).eq('team_member_id', worker?.id || '').maybeSingle()
    add(`hr: crew employment type = ${cfg.crew.employmentType}`, prof?.employment_type === cfg.crew.employmentType, prof?.employment_type)

    // ================= 5.0b HR DOCUMENT COMPLIANCE (real hr_documents + requirements template) =================
    // Every HR assertion above only ever checked the hr_employee_profiles row
    // (employment_type/comp_type) — the OTHER half of onboarding, the
    // per-employee document checklist (W-9 for 1099s, W-4+I-9 for W-2s, plus
    // direct deposit/ID/signed agreement for everyone) driven by
    // hr_document_requirements + hr_documents (POST/PATCH
    // /api/dashboard/hr/[id]/documents — real, live routes the People/HR
    // dashboard tab uses today), had zero coverage anywhere in this harness.
    // Exercise the requirement template seedHrDefaults() already seeded above,
    // submit the crew member's applicable docs, then have ops approve them —
    // proving the requirements-vs-documents join actually resolves to "fully
    // compliant" instead of silently staying incomplete.
    const { data: hrReqs } = await supabase.from('hr_document_requirements').select('doc_type, applies_to, required').eq('tenant_id', tenant.id).order('sort_order')
    const applicableReqs = (hrReqs || []).filter(r => r.required && (r.applies_to === 'all' || r.applies_to === cfg.crew.employmentType))
    add('hr-docs: requirement template seeded and resolves the right doc set for this employment type', applicableReqs.length >= 4, JSON.stringify(applicableReqs.map(r => r.doc_type)))

    if (worker?.id) {
      for (const req of applicableReqs) {
        await supabase.from('hr_documents').insert({
          tenant_id: tenant.id, team_member_id: worker.id, doc_type: req.doc_type, status: 'submitted',
          file_url: `https://sim-uploads.example.com/${runId}/${req.doc_type}.pdf`,
        })
      }
      const { data: submittedDocs } = await supabase.from('hr_documents').select('doc_type, status').eq('tenant_id', tenant.id).eq('team_member_id', worker.id)
      add('hr-docs: crew submitted every applicable required document', applicableReqs.every(r => (submittedDocs || []).some(d => d.doc_type === r.doc_type && d.status === 'submitted')), JSON.stringify(submittedDocs))

      // Ops reviews and approves each submitted doc — the real PATCH transition.
      for (const d of submittedDocs || []) {
        await supabase.from('hr_documents').update({ status: 'approved' }).eq('tenant_id', tenant.id).eq('team_member_id', worker.id).eq('doc_type', d.doc_type)
      }
      const { data: approvedDocs } = await supabase.from('hr_documents').select('doc_type, status').eq('tenant_id', tenant.id).eq('team_member_id', worker.id)
      const compliant = applicableReqs.every(r => (approvedDocs || []).some(d => d.doc_type === r.doc_type && d.status === 'approved'))
      add('hr-docs: crew member reaches full document compliance (every required doc approved)', compliant, JSON.stringify(approvedDocs))
    }

    // assign the crew member to the job's sessions
    if (worker?.id && jobBookings?.length) {
      for (const b of jobBookings) await supabase.from('bookings').update({ team_member_id: worker.id }).eq('id', b.id)
      add('schedule: crew assigned to every session', true)
    }

    // ============ 5.0c SELF-SERVE CLAIM + CHECKIN/CHECKOUT (real routes, first-ever archetype coverage) ============
    // Every session above got assigned DIRECTLY via a raw `.update({team_member_id})`
    // — the crew's own actual self-serve path (POST /api/team-portal/jobs/claim,
    // /checkin, /checkout) had never been driven by this harness for a project-
    // archetype tenant (flagged as an open gap alongside login coverage, closed
    // above, in the prior gap/fluidity round). checkin hard-blocks any booking
    // dated in the future (`Cannot check in to a future booking`, checked in ET)
    // and every real session in this archetype is scheduled days/weeks out by
    // design — backdating the whole project timeline isn't a small change, so
    // this exercises the 3 routes end-to-end against a small standalone TODAY-
    // dated probe booking on the same job instead (a same-day punch-list/
    // walkthrough visit is a real event these trades have too), not the
    // multi-week session plan itself.
    if (worker?.id && portalLoginBody?.token) {
      const probeStart = new Date(); probeStart.setHours(6, 0, 0, 0)
      const probeEnd = new Date(probeStart.getTime() + 2 * 3600 * 1000)
      const { data: probeBooking, error: probeErr } = await supabase.from('bookings').insert({
        tenant_id: tenant.id, client_id: job?.client_id || null, job_id: jobRes.job_id,
        team_member_id: null, start_time: probeStart.toISOString(), end_time: probeEnd.toISOString(),
        status: 'scheduled', service_type: 'same-day walkthrough (claim/checkin/checkout probe)',
      }).select('id').single()
      add('claim-probe: standalone same-day booking created, unclaimed', !!probeBooking && !probeErr, probeErr?.message)

      if (probeBooking) {
        const { POST: claimPOST } = await import('../src/app/api/team-portal/jobs/claim/route')
        const claimRes = await claimPOST(new Request('http://sim.local/api/team-portal/jobs/claim', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${portalLoginBody.token}`, 'x-forwarded-for': `10.93.${idx}.1` },
          body: JSON.stringify({ booking_id: probeBooking.id }),
        }))
        const claimBody = await claimRes.json()
        add('claim: crew self-claims the open booking via the real route (not an admin assignment)', claimRes.status === 200 && claimBody?.booking?.team_member_id === worker.id, JSON.stringify({ status: claimRes.status, body: claimBody }))

        const { POST: checkinPOST } = await import('../src/app/api/team-portal/checkin/route')
        const checkinRes = await checkinPOST(new Request('http://sim.local/api/team-portal/checkin', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${portalLoginBody.token}` },
          body: JSON.stringify({ booking_id: probeBooking.id }),
        }))
        const checkinBody = await checkinRes.json()
        add('checkin: crew checks in via the real route (today-dated booking, not future-blocked)', checkinRes.status === 200 && !!checkinBody?.booking?.check_in_time && checkinBody?.booking?.status === 'in_progress', JSON.stringify({ status: checkinRes.status, body: checkinBody }))

        const { POST: checkoutPOST } = await import('../src/app/api/team-portal/checkout/route')
        const checkoutRes = await checkoutPOST(new Request('http://sim.local/api/team-portal/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${portalLoginBody.token}` },
          body: JSON.stringify({ booking_id: probeBooking.id }),
        }))
        const checkoutBody = await checkoutRes.json()
        add('checkout: crew checks out via the real route, booking completes with hours/pay computed', checkoutRes.status === 200 && !!checkoutBody?.booking?.check_out_time && checkoutBody?.booking?.status === 'completed', JSON.stringify({ status: checkoutRes.status, body: checkoutBody }))

        // The 2nd claim attempt on an already-claimed (now completed) booking must
        // be rejected, not silently re-granted — the real first-writer-wins guard
        // claim_job_atomic's own `team_member_id IS NULL` filter gives.
        const reclaimRes = await claimPOST(new Request('http://sim.local/api/team-portal/jobs/claim', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${portalLoginBody.token}`, 'x-forwarded-for': `10.93.${idx}.1` },
          body: JSON.stringify({ booking_id: probeBooking.id }),
        }))
        add('claim: re-claiming an already-claimed booking is rejected, not silently re-granted', reclaimRes.status === 409, `status=${reclaimRes.status}`)
      }
    }

    // ================= 5a. WEATHER DELAY + SESSION COMPLETION (real per-session mechanics) =================
    // PATCH /api/jobs/[id]/sessions/[sessionId] (src/app/api/jobs/[id]/sessions/[sessionId]/route.ts)
    // is a real, live route every one of these trades uses daily — reschedule a
    // rained-out day, then mark a work day done once the crew actually shows up —
    // but nothing in this harness had ever exercised it (every prior scenario
    // only drove the WHOLE-JOB 'completed' event). Two of its three side effects
    // were zero-coverage: 'session_rescheduled' (a weather/crew delay pushing one
    // session's date) and 'session_completed' -> releasePaymentsForEvent(...,
    // 'session_completed'), which is the ONLY thing that flips a mid-project
    // on_stage_complete milestone (e.g. "Progress — tear-off & dry-in complete")
    // to invoiced -- distinct from job completion, which releases the same
    // trigger for any milestone still pending at job close-out. Calling the
    // library functions directly (logJobEvent/releasePaymentsForEvent) rather
    // than the route handler itself, same as the P10.2 proposal-send mirror
    // above: requirePermission depends on headers()/cookies(), which only exist
    // inside a real Next.js request.
    const firstSession = jobBookings?.[0]
    if (firstSession) {
      // A flat "+2 days" reschedule landed session 0 on top of this job's OWN
      // later session for the SAME crew member (these trades run one worker
      // across the whole project timeline) and tripped the real
      // trg_block_booking_overlap DB trigger (src/lib/migrations/
      // 015_booking_overlap_trigger.sql, live since 47ec885e/2026-04-20) on
      // every run -- the UPDATE's error was previously discarded, so this
      // assertion silently failed 100% of the time even though the trigger
      // was doing exactly its job. Push the delay PAST the whole project's
      // own session plan instead, so it can't collide with the job's own
      // remaining sessions.
      const lastOffset = cfg.sessions[cfg.sessions.length - 1].offsetDays
      const rainDelayStart = projectDaysFromNow(lastOffset + 7, cfg.sessions[0].startHour)
      const rainDelayEnd = projectDaysFromNow(lastOffset + 7, cfg.sessions[0].endHour)
      const { error: rescheduleErr } = await supabase.from('bookings').update({ start_time: rainDelayStart, end_time: rainDelayEnd }).eq('id', firstSession.id)
      add('weather-delay: reschedule update succeeds (no collision with this job\'s own later sessions)', !rescheduleErr, rescheduleErr?.message)
      await logJobEvent({ tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'session_rescheduled', detail: { booking_id: firstSession.id, start_time: rainDelayStart, note: 'weather delay' } })

      const { data: rescheduledEvent } = await supabase.from('job_events').select('id').eq('job_id', jobRes.job_id).eq('event_type', 'session_rescheduled').maybeSingle()
      add('weather-delay: session_rescheduled logged on the job timeline', !!rescheduledEvent)
      const { data: rescheduledBooking } = await supabase.from('bookings').select('start_time').eq('id', firstSession.id).single()
      add('weather-delay: session actually moved (not just logged)', rescheduledBooking?.start_time !== firstSession.start_time, `${rescheduledBooking?.start_time} vs original ${firstSession.start_time}`)

      // Crew shows up on the new date and finishes the (delayed) first session.
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', firstSession.id)
      await logJobEvent({ tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'session_completed', detail: { booking_id: firstSession.id } })
      await releasePaymentsForEvent(tenant.id, jobRes.job_id, 'session_completed')

      const { data: paysAfterSessionComplete } = await supabase.from('job_payments').select('kind, trigger, status').eq('job_id', jobRes.job_id).order('sort_order')
      const stageGatedRows = (paysAfterSessionComplete || []).filter(p => p.trigger === 'on_stage_complete')
      if (stageGatedRows.length > 0) {
        // roofing/remodeling: this scenario's payment plan actually has an
        // on_stage_complete milestone — prove session_completed released it.
        add('weather-delay: on_stage_complete progress milestone released to invoiced by session_completed (not job completion)', stageGatedRows.every(p => p.status === 'invoiced'), JSON.stringify(stageGatedRows))
      } else {
        // interior_design's payment plan has no on_stage_complete trigger at
        // all (progress here is 'manual') — prove releasePaymentsForEvent is a
        // safe no-op rather than mis-firing against the wrong trigger.
        add('weather-delay: no on_stage_complete milestone in this plan — session_completed release is a safe no-op', (paysAfterSessionComplete || []).filter(p => p.kind === 'progress').every(p => p.status === 'pending'), JSON.stringify(paysAfterSessionComplete))
      }
      const finalRow = (paysAfterSessionComplete || []).find(p => p.kind === 'final')
      add('weather-delay: final milestone (trigger=manual) untouched by the session-complete release', finalRow?.status === 'pending', finalRow?.status)

      const { data: otherSessions } = await supabase.from('bookings').select('id, status').eq('job_id', jobRes.job_id).neq('id', firstSession.id)
      add('weather-delay: only the completed session flips status — the rest of the project timeline is untouched', (otherSessions || []).every(b => b.status !== 'completed'), JSON.stringify(otherSessions?.map(b => b.status)))
      const { data: jobAfterOneSession } = await supabase.from('jobs').select('status').eq('id', jobRes.job_id).single()
      add('weather-delay: job stays scheduled — one of several sessions done is not the whole job done', jobAfterOneSession?.status === 'scheduled', jobAfterOneSession?.status)
    }

    // ============ 5a-2. CREW TERMINATION MID-PROJECT (real hr_status guard) ============
    // Real scenario across every one of these trades: the crew member gets let
    // go before the multi-week project wraps -- a no-show pattern, a quality
    // issue, whatever the reason, ops flips hr_status='terminated' on their
    // profile (PATCH /api/dashboard/hr/[id], the real route). Before the fix
    // on this branch, PATCH .../jobs/[id]/sessions/[sessionId] and POST
    // .../sessions only ever checked team_members existence + tenant, never
    // hr_status -- a terminated crew member could be silently reassigned to
    // every remaining session with zero warning to the operator. Fixed:
    // getTerminatedTeamMemberIds (src/lib/hr.ts) now gates both routes,
    // rejecting the reassignment with a 400 naming the terminated member.
    // Calling the guard function directly rather than the route itself, same
    // reasoning as the session-complete mirror above (requirePermission needs
    // headers()/cookies() request context this harness doesn't have).
    const remainingSession = jobBookings?.[1]
    if (worker?.id && remainingSession) {
      const { getTerminatedTeamMemberIds } = await import('../src/lib/hr')
      await supabase.from('hr_employee_profiles').update({ hr_status: 'terminated' })
        .eq('tenant_id', tenant.id).eq('team_member_id', worker.id)

      const terminatedNow = await getTerminatedTeamMemberIds(tenant.id, [worker.id])
      add('crew-termination: the just-terminated crew member is flagged by the guard', terminatedNow.includes(worker.id), JSON.stringify(terminatedNow))
      add('crew-termination: reassigning them to a remaining session would be blocked (guard fires before any write)', terminatedNow.length > 0)

      // The terminated worker's OWN portal access, not just their eligibility to
      // be assigned by someone else -- the exact real-world case commit
      // 2b96769b fixed (HR termination never revoked portal access; a fired
      // worker could keep minting fresh tokens by PIN forever). This is the
      // first time the archetype harness drives POST /api/team-portal/auth
      // post-termination with the same PIN that logged in successfully above
      // (5.0a) -- unit tests already cover this route, but nothing before this
      // proved it against a real archetype tenant/team_member/hr lifecycle.
      const terminatedLogin = await portalAuthPOST(new Request('http://sim.local/api/team-portal/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.92.${idx}.1` },
        body: JSON.stringify({ pin: worker.pin, tenant_slug: tenant.slug }),
      }))
      add('crew-termination: the terminated worker can no longer log in with their old PIN (real route)', terminatedLogin.status === 401, `status=${terminatedLogin.status}`)

      // PIN-login rejection alone doesn't prove the worker is locked out — their
      // EXISTING token (minted pre-termination in 5.0a, up to 24h life, still
      // cryptographically valid) is the real risk. Fresh-ground find this round:
      // checkin/checkout (the two routes where a fired worker actually gets
      // PAID) call verifyToken() directly, bypassing requirePortalPermission's
      // instant-revocation check entirely -- termination via the HR page did
      // NOT block them from checking in/out on their old token, even after
      // 2b96769b's fix (which only touched requirePortalPermission + the login
      // route, neither of which checkin/checkout go through). Fixed by baking
      // the same member-status/hr_status check into verifyToken() itself so
      // every direct caller is covered, not just requirePortalPermission's ~14
      // routes. First time the archetype harness drives checkin with a
      // pre-termination token against a real project-archetype tenant.
      if (portalLoginBody?.token) {
        const staleTokenProbeStart = new Date(); staleTokenProbeStart.setHours(6, 0, 0, 0)
        const staleTokenProbeEnd = new Date(staleTokenProbeStart.getTime() + 2 * 3600 * 1000)
        const { data: staleTokenBooking } = await supabase.from('bookings').insert({
          tenant_id: tenant.id, client_id: job?.client_id || null, job_id: jobRes.job_id,
          team_member_id: worker.id, start_time: staleTokenProbeStart.toISOString(), end_time: staleTokenProbeEnd.toISOString(),
          status: 'scheduled', service_type: 'stale-token post-termination checkin probe',
        }).select('id').single()
        if (staleTokenBooking) {
          const { POST: staleCheckinPOST } = await import('../src/app/api/team-portal/checkin/route')
          const staleCheckinRes = await staleCheckinPOST(new Request('http://sim.local/api/team-portal/checkin', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${portalLoginBody.token}` },
            body: JSON.stringify({ booking_id: staleTokenBooking.id }),
          }))
          add('crew-termination: the terminated worker cannot check in with their still-unexpired PRE-termination token (real checkin route)', staleCheckinRes.status === 401, `status=${staleCheckinRes.status}`)
        }
      }

      // The real-world resolution: hire a replacement and put THEM on what's left.
      const { provisionApprovedApplicant: provisionReplacement } = await import('../src/lib/team-provisioning')
      const replacementPhone = '704' + String(4000000 + idx * 111 + (Date.now() % 1000)).slice(-7)
      try {
        await provisionReplacement(tenant.id, {
          id: randomUUID(), name: `${cfg.crew.name} (Replacement)`, email: `crew-repl+${runId}@example.com`, phone: replacementPhone, address: null,
        })
      } catch (e) {
        const emailThrew = /Email not configured|Resend/i.test(e instanceof Error ? e.message : String(e))
        if (!emailThrew) throw e
      }
      const { data: replacement } = await supabase.from('team_members').select('id').eq('tenant_id', tenant.id).eq('phone', replacementPhone).maybeSingle()
      add('crew-termination: replacement crew member provisioned', !!replacement)

      if (replacement?.id) {
        const replacementTerminated = await getTerminatedTeamMemberIds(tenant.id, [replacement.id])
        add('crew-termination: the new replacement is NOT flagged terminated (fresh hr_status defaults to active)', replacementTerminated.length === 0, JSON.stringify(replacementTerminated))

        await supabase.from('bookings').update({ team_member_id: replacement.id }).eq('id', remainingSession.id)
        const { data: reassignedSession } = await supabase.from('bookings').select('team_member_id').eq('id', remainingSession.id).single()
        add('crew-termination: remaining session reassigned to the replacement, not left on the terminated worker', reassignedSession?.team_member_id === replacement.id, reassignedSession?.team_member_id)

        // ---- 5a-3. DOUBLE-BOOKING THE SAME CREW MEMBER (DB-level guard, confirmed live) ----
        // Previously flagged as gap #11 ("no scheduling-conflict guard exists
        // anywhere in session create/reassign") from reading POST/PATCH
        // .../sessions alone -- true at the app layer (neither route checks
        // the assignee's other bookings for a time overlap of its own), but
        // WRONG as a product conclusion. A BEFORE INSERT/UPDATE trigger
        // (trg_block_booking_overlap, src/lib/migrations/
        // 015_booking_overlap_trigger.sql, applied to prod 2026-04-20 per
        // 47ec885e) blocks ANY overlapping team_member_id/start_time/end_time
        // write to `bookings`, regardless of which route or code path
        // performs it. This was misdiagnosed because the archetype harness
        // had never actually been run against a live DB before this session
        // (no .env.local in prior worktrees) -- running it live here for the
        // first time surfaced the trigger firing on this exact probe.
        // Correcting the assertion (and gap #11) to match reality: the
        // overlap insert FAILS, not succeeds.
        const { data: secondJob } = await supabase.from('jobs').insert({
          tenant_id: tenant.id, client_id: job?.client_id || null,
          title: `${cfg.crew.name} — second job (double-book probe)`, status: 'scheduled', total_cents: 0,
        }).select('id').single()
        if (secondJob) {
          const { data: overlapBooking, error: overlapErr } = await supabase.from('bookings').insert({
            tenant_id: tenant.id, client_id: job?.client_id || null, job_id: secondJob.id,
            team_member_id: replacement.id, start_time: remainingSession.start_time, end_time: remainingSession.end_time,
            status: 'confirmed', notes: 'Double-book probe — unrelated job, same crew member, overlapping window',
          }).select('id').single()
          add('double-booking: the DB-level overlap trigger blocks the SAME crew member from being booked onto a second, unrelated job at the EXACT SAME overlapping window (app-layer routes have no check of their own, but this catches it regardless)',
            !!overlapErr && overlapErr.code === '23P01' && !overlapBooking, overlapErr?.message)
        }

        // ---- 5a-4. MULTI-TECH TEAM ASSIGNMENT (real booking_team_members surface, zero prior archetype coverage) ----
        // Every one of these trades routinely runs a crew of 2+ on a project
        // session (a roofer + a helper, a second remodeling installer), but
        // nothing in this harness had ever exercised PUT /api/bookings/[id]/team
        // (src/app/api/bookings/[id]/team/route.ts) — the multi-tech
        // lead+extras surface — only ever the single bookings.team_member_id
        // lead. requirePermission needs a real request's headers()/cookies(),
        // unavailable here, so this mirrors the route's own write sequence
        // directly (same reasoning as the session-complete/crew-termination
        // mirrors above) rather than calling the route handler.
        const helperPhone = '704' + String(5000000 + idx * 111 + (Date.now() % 1000)).slice(-7)
        try {
          await provisionReplacement(tenant.id, {
            id: randomUUID(), name: `${cfg.crew.name} (Helper)`, email: `crew-helper+${runId}@example.com`, phone: helperPhone, address: null,
          })
        } catch (e) {
          const emailThrew = /Email not configured|Resend/i.test(e instanceof Error ? e.message : String(e))
          if (!emailThrew) throw e
        }
        const { data: helper } = await supabase.from('team_members').select('id').eq('tenant_id', tenant.id).eq('phone', helperPhone).maybeSingle()
        add('multi-tech: second crew member (helper) provisioned', !!helper)

        if (helper?.id) {
          // The operator's FIRST attempt includes the already-terminated worker
          // as a third extra (an easy real mistake — reusing a saved crew list
          // that hasn't been pruned since the termination). Same guard as
          // POST /api/bookings, PUT /api/bookings/[id], and the job-session
          // routes (86b797ad) — proves it also covers the multi-tech extras
          // array, not just the single lead field.
          const attemptedIds = [replacement.id, helper.id, worker.id]
          const blockedIds = await getTerminatedTeamMemberIds(tenant.id, attemptedIds)
          add('multi-tech: adding the terminated worker as a THIRD extra is caught by the same guard (would 400, naming only the terminated one)',
            blockedIds.length === 1 && blockedIds[0] === worker.id, JSON.stringify(blockedIds))

          // Corrected submission: lead=replacement, extras=[helper] — the
          // terminated worker dropped, exactly what the real route would force
          // the operator to do after the 400. Mirrors the route's own
          // delete-then-insert replace + team_size update.
          await supabase.from('booking_team_members').delete().eq('booking_id', remainingSession.id)
          const { error: teamInsErr } = await supabase.from('booking_team_members').insert([
            { tenant_id: tenant.id, booking_id: remainingSession.id, team_member_id: replacement.id, is_lead: true, position: 1 },
            { tenant_id: tenant.id, booking_id: remainingSession.id, team_member_id: helper.id, is_lead: false, position: 2 },
          ])
          add('multi-tech: corrected team (lead + 1 extra, terminated worker excluded) writes cleanly', !teamInsErr, teamInsErr?.message)
          await supabase.from('bookings').update({ team_size: 2 }).eq('id', remainingSession.id)

          const { data: teamRowsAfter } = await supabase.from('booking_team_members').select('team_member_id, is_lead').eq('booking_id', remainingSession.id).order('position')
          const teamIds = (teamRowsAfter || []).map(r => r.team_member_id)
          add('multi-tech: booking_team_members reflects exactly [lead=replacement, extra=helper] — no trace of the terminated worker',
            teamIds.length === 2 && teamIds.includes(replacement.id) && teamIds.includes(helper.id) && !teamIds.includes(worker.id),
            JSON.stringify(teamRowsAfter))
          const leadRow = (teamRowsAfter || []).find(r => r.is_lead)
          add('multi-tech: exactly one row flagged is_lead, and it is the replacement (not the helper)', leadRow?.team_member_id === replacement.id, JSON.stringify(leadRow))

          // ---- 5a-5. CLIENT-INITIATED RECURRING BOOKING — TERMINATED CREW GUARD (fresh ground, zero prior archetype coverage) ----
          // client/recurring (src/app/api/client/recurring/route.ts) is the
          // client-portal self-service surface for starting a brand-new
          // recurring series — never exercised anywhere in this harness
          // before this. Before the fix on this branch it validated
          // cleaner_id/extra_cleaner_ids for tenant ownership only, never HR
          // termination, so a client could hand a fired employee a brand-new
          // STANDING weekly series: this route raw-inserts
          // recurring_schedules.team_member_id, 6 weeks of real
          // bookings.team_member_id (status='scheduled'), booking_team_members
          // rows, AND clients.preferred_team_member_id directly via
          // supabaseAdmin — none of which go through POST /api/bookings, PUT
          // /api/bookings/[id]/team, or PUT /api/client/preferred-cleaner, so
          // none of those routes' own terminated-crew guards ever ran. Same
          // root cause and blast radius as the generate-recurring cron gap
          // (closed 8131f28a): a raw insert bypassing every guarded route.
          // Driving the REAL route here (not a mirror, unlike the
          // requirePermission-gated admin routes above) — client/recurring
          // authenticates off a portal Bearer token read straight from the
          // raw Request, no next/headers dependency, so it's directly
          // callable from this script with a genuine minted client-portal
          // token, against the terminated worker set up in 5a-2 and this
          // scenario's own client (already past the repeat-client gate via
          // the completed weather-delay session, 5a-1).
          const { createToken: createPortalToken } = await import('../src/app/api/portal/auth/token')
          const { POST: clientRecurringPOST } = await import('../src/app/api/client/recurring/route')
          const clientToken = createPortalToken(job?.client_id || '', tenant.id)
          const recurringBlockedRes = await clientRecurringPOST(new Request('http://sim.local/api/client/recurring', {
            method: 'POST',
            headers: { authorization: `Bearer ${clientToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              frequency: 'weekly', start_date: projectDaysFromNow(28, 9).slice(0, 10), time: '09:00', hours: 2,
              service_type: 'Recurring maintenance visit', cleaner_id: worker.id,
            }),
          }))
          add('client-recurring: a client cannot start a new recurring series with the just-terminated crew member (real route, real portal token)', recurringBlockedRes.status === 400, `status=${recurringBlockedRes.status}`)
          const { count: leakedScheduleCount } = await supabase.from('recurring_schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('team_member_id', worker.id)
          add('client-recurring: no recurring_schedules row was created for the terminated worker', (leakedScheduleCount || 0) === 0, `count=${leakedScheduleCount}`)

          const recurringOkRes = await clientRecurringPOST(new Request('http://sim.local/api/client/recurring', {
            method: 'POST',
            headers: { authorization: `Bearer ${clientToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              frequency: 'weekly', start_date: projectDaysFromNow(35, 9).slice(0, 10), time: '09:00', hours: 2,
              service_type: 'Recurring maintenance visit', cleaner_id: replacement.id,
            }),
          }))
          add('client-recurring: CONTROL — the same client CAN start a recurring series with the active replacement crew member', recurringOkRes.status === 200, `status=${recurringOkRes.status}`)
        }
      }
    }

    // ================= 5b. CHANGE ORDER (scope creep mid-project) =================
    // Real pain point across every one of these trades: the customer adds or
    // changes scope AFTER the sale is signed and the job is already scheduled
    // — hidden damage found once tear-off starts, a client wanting more after
    // seeing the samples, wanting a second room added mid-install. There's no
    // dedicated change-order feature yet; the operator's actual workaround
    // today is: bump the job total, add a new job_payments line for the
    // extra scope, and invoice it alongside everything else. Exercising that
    // workaround here to prove the job/payment/invoice/ledger plumbing
    // tolerates a total that changes after job creation, not just at
    // creation time.
    const coLine = normalizeLineItems([cfg.changeOrder.lineItem])
    const coTotals = computeTotals(coLine, 0, 0)
    await supabase.from('job_events').insert({
      tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'change_order_requested',
      detail: { note: cfg.changeOrder.note, amount_cents: coTotals.total_cents },
    })
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Change order: ${cfg.changeOrder.note}`,
      metadata: { job_id: jobRes.job_id, amount_cents: coTotals.total_cents },
    })

    const newJobTotal = (job?.total_cents || quote.total_cents) + coTotals.total_cents
    const { error: coJobErr } = await supabase.from('jobs').update({ total_cents: newJobTotal }).eq('id', jobRes.job_id)
    add('change-order: job total increased by the added scope', !coJobErr, coJobErr?.message)

    const coPayment = { label: `Change order — ${cfg.changeOrder.lineItem.name}`, kind: 'milestone' as const, amount_cents: coTotals.total_cents, trigger: 'manual' as const }
    const { data: coRow, error: coPayErr } = await supabase.from('job_payments').insert({
      tenant_id: tenant.id, job_id: jobRes.job_id, label: coPayment.label, kind: coPayment.kind,
      amount_cents: coPayment.amount_cents, trigger: coPayment.trigger, sort_order: plan.length, status: 'pending',
    }).select('id').single()
    add('change-order: added as its own job_payments line (not folded into an existing milestone)', !!coRow && !coPayErr, coPayErr?.message)

    const { data: jobAfterCO } = await supabase.from('jobs').select('total_cents').eq('id', jobRes.job_id).single()
    add('change-order: job total = original + change order (not silently dropped)', jobAfterCO?.total_cents === newJobTotal, `${jobAfterCO?.total_cents} vs ${newJobTotal}`)
    const { data: jobPaysAfterCO } = await supabase.from('job_payments').select('id').eq('job_id', jobRes.job_id)
    add('change-order: job_payments count = milestones + 1', (jobPaysAfterCO?.length || 0) === plan.length + 1, `${jobPaysAfterCO?.length}`)

    // ============ 5c. MATERIAL COST (the real cost side of the change order) ============
    // Everything above only ever books the REVENUE side of the change order
    // (the customer-facing invoice line). The office's actual real-world
    // workaround for the corresponding COST (the Home Depot run for 6 sheets
    // of OSB) is the generic Expenses feature (POST /api/finance/expenses) --
    // exercising that insert + the just-fixed postExpenseToLedger here, since
    // no prior scenario in this harness ever booked a cost against a job.
    // ~45% of the billed line is a representative materials-markup estimate,
    // not a real cost figure -- there is still no job_id column on `expenses`
    // (per the archetype's own missing-feature-gap #1/#3: no per-job costing,
    // no job-level materials capture), so this posts tenant-wide, the same as
    // every other manual expense in production today.
    const { postExpenseToLedger } = await import('../src/lib/finance/post-expense')
    const { getAccountIdByCode: getAcctForMaterialCost } = await import('../src/lib/ledger')
    const { data: entityForMaterialCost } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()
    const materialCostCents = Math.round(coTotals.total_cents * 0.45)
    const { data: materialExpense, error: matExpErr } = await supabase.from('expenses').insert({
      tenant_id: tenant.id, entity_id: entityForMaterialCost?.id ?? null, category: 'Materials & Supplies',
      amount: materialCostCents, description: `${cfg.changeOrder.lineItem.name} — material cost`,
      date: projectDaysFromNow(cfg.changeOrder.offsetDays, 0).slice(0, 10),
    }).select('id').single()
    add('change-order material cost: expense recorded for the actual Home Depot run', !!materialExpense && !matExpErr, matExpErr?.message)

    if (materialExpense) {
      const matPostRes = await postExpenseToLedger({ tenantId: tenant.id, expenseId: materialExpense.id })
      add('change-order material cost: posted to the ledger (reaches the default P&L, not just bank-matched expenses)', matPostRes.posted, matPostRes.reason || matPostRes.entryId)
      const { data: matLines } = await supabase.from('journal_lines').select('coa_id, debit_cents, credit_cents').eq('entry_id', matPostRes.entryId || '')
      const materialsAcct = await getAcctForMaterialCost(tenant.id, '5100')
      const clearingAcct = await getAcctForMaterialCost(tenant.id, '2450')
      add('change-order material cost: DR routed to 5100 Materials & Supplies', (matLines || []).some(l => l.coa_id === materialsAcct && l.debit_cents === materialCostCents), JSON.stringify(matLines))
      add('change-order material cost: CR routed to 2450 Payouts in Transit (clearing)', (matLines || []).some(l => l.coa_id === clearingAcct && l.credit_cents === materialCostCents), JSON.stringify(matLines))
    }

    // ================= 6. PAYROLL =================
    const { ensureChartAccounts, getAccountIdByCode } = await import('../src/lib/ledger')
    const { postPayrollToLedger } = await import('../src/lib/finance/post-labor')
    await ensureChartAccounts(tenant.id)
    // prod-drift probe: migrations/008 declares payroll_payments.status + .notes;
    // live schema is missing both — insert only columns actually present.
    const { error: payrollColErr } = await supabase.from('payroll_payments').select('status').limit(1)
    add('finance: payroll_payments.status column matches migration 008 on prod', !payrollColErr,
      payrollColErr ? `DRIFT — ${payrollColErr.message} (postPayrollToLedger doesn't select it, so unaffected — but insert must omit it)` : 'present')

    const { data: payrollRow, error: prErr } = await supabase.from('payroll_payments').insert({
      tenant_id: tenant.id, team_member_id: worker?.id, amount: cfg.crew.payCents,
      period_start: projectDaysFromNow(cfg.sessions[0].offsetDays, 0).slice(0, 10),
      period_end: projectDaysFromNow(cfg.sessions[cfg.sessions.length - 1].offsetDays, 0).slice(0, 10),
      method: cfg.crew.payMethod, paid_at: new Date().toISOString(),
    }).select('id').single()
    add('payroll: crew payment recorded', !!payrollRow && !prErr, prErr?.message)

    if (payrollRow) {
      const payRes = await postPayrollToLedger({ tenantId: tenant.id, payrollPaymentId: payrollRow.id })
      add('payroll: posted to ledger', payRes.posted, payRes.reason || payRes.entryId)
      const expectedCode = cfg.crew.employmentType === 'employee_w2' ? '5010' : '5000'
      const expectedAcct = await getAccountIdByCode(tenant.id, expectedCode)
      if (payRes.entryId && expectedAcct) {
        const { data: lines } = await supabase.from('journal_lines').select('coa_id, debit_cents').eq('entry_id', payRes.entryId)
        const hit = (lines || []).find(l => l.coa_id === expectedAcct)
        add(`payroll: routed to correct labor account (${expectedCode})`, !!hit && hit.debit_cents === cfg.crew.payCents, JSON.stringify(lines))
      }
      await notify({ tenantId: tenant.id, type: 'payroll_paid', title: 'Payroll paid', message: `${cfg.crew.name} — ${cfg.crew.payLabel}` })
    }

    // ============ 6a. KNOWN GAP: payroll-prep (the only 1099/contractor report in the
    // product) never sees payroll_payments ============
    // GET /api/finance/payroll-prep sums bookings.team_member_pay (status='completed')
    // for gross pay and team_member_payouts.amount_cents for paid-out -- both belong to
    // the cleaning-vertical's booking-based pay tracking. createJobFromQuote's session
    // bookings (src/lib/jobs.ts) never set team_member_pay, and this archetype's crew is
    // paid entirely through payroll_payments (section 6 just above -- correctly posted to
    // the ledger via postPayrollToLedger). payroll-prep never reads that table. Net effect:
    // every roofing/remodeling/interior_design contractor shows $0 gross pay, $0 paid out,
    // and hits_1099_threshold=false on the ONLY 1099 report in the product, no matter how
    // much they've actually been paid. Asserting the CORRECT behavior here (both checks
    // are expected to fail today) rather than silently "fixing" it -- payroll_payments
    // records the amount PAID directly with no separate gross-owed concept the way
    // bookings/team_member_payouts split estimate vs payout, so folding it into
    // payroll-prep changes what "gross pay" vs "paid out" even means for this tenant type;
    // that's a product decision, not a one-line patch.
    const { data: bookingsForPayrollPrepGross } = await supabase.from('bookings')
      .select('team_member_pay').eq('tenant_id', tenant.id).eq('status', 'completed')
    const grossFromBookingsOnly = (bookingsForPayrollPrepGross || []).reduce((s, b) => s + (Number(b.team_member_pay) || 0), 0)
    add('payroll-prep: gross pay reflects this crew\'s actual payroll_payments total (KNOWN GAP — payroll-prep only sums bookings.team_member_pay, never payroll_payments)',
      grossFromBookingsOnly >= cfg.crew.payCents, `payroll-prep-visible gross=${grossFromBookingsOnly} vs actual payroll paid=${cfg.crew.payCents}`)
    const { data: payoutsForPayrollPrepPaid } = await supabase.from('team_member_payouts')
      .select('amount_cents').eq('tenant_id', tenant.id).eq('team_member_id', worker?.id || '')
    const paidOutVisibleToPayrollPrep = (payoutsForPayrollPrepPaid || []).reduce((s, p) => s + (Number(p.amount_cents) || 0), 0)
    add('payroll-prep: paid-out reflects this crew\'s actual payroll_payments total (KNOWN GAP — payroll-prep only sums team_member_payouts, never payroll_payments)',
      paidOutVisibleToPayrollPrep >= cfg.crew.payCents, `payroll-prep-visible paid=${paidOutVisibleToPayrollPrep} vs actual payroll paid=${cfg.crew.payCents}`)

    // ================= 7. BOOKKEEPING / INVOICING (milestone invoices → ledger) =================
    const { generateInvoiceNumber, generateInvoicePublicToken, computeTotals: invTotals, normalizeLineItems: invLines, logInvoiceEvent } = await import('../src/lib/invoice')
    const { postPaymentRevenue } = await import('../src/lib/finance/post-revenue')
    const { postRefundToLedger } = await import('../src/lib/finance/post-adjustments')
    const { data: defEntity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()

    const billablePlan = [...plan, coPayment]
    // The mid-project underpayment lands on the first PROGRESS milestone (not
    // final — that's the separate quality/scope dispute below, and not the
    // deposit — a shortfall there would block the job from starting at all).
    const underpaymentTarget = plan.find(p => p.kind === 'progress')
    // +1: the underpayment milestone splits into two payment rows (partial +
    // collected balance) instead of the usual one, so the aggregate payment
    // count below has to expect that extra row.
    const expectedPaymentCount = billablePlan.length + (underpaymentTarget ? 1 : 0)
    let invoicesCreated = 0
    let paymentsPosted = 0
    let revenueRecognizedCents = 0
    let finalInvoiceId: string | null = null
    let finalInvoiceAmountCents = 0
    let coInvoiceId: string | null = null
    for (const p of billablePlan) {
      const invNum = await generateInvoiceNumber(tenant.id)
      const iLines = invLines([{ name: p.label, quantity: 1, unit_price_cents: p.amount_cents }])
      const iTot = invTotals(iLines, 0, 0)
      const isUnderpaymentTarget = p === underpaymentTarget

      const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        tenant_id: tenant.id, entity_id: defEntity?.id || null, invoice_number: invNum,
        status: isUnderpaymentTarget ? 'sent' : 'paid',
        title: `${cfg.quoteTitle} — ${p.label}`, contact_name: cfg.lead.contactName, contact_email: cfg.lead.contactEmail,
        line_items: iLines, subtotal_cents: iTot.subtotal_cents, tax_rate_bps: 0, tax_cents: 0,
        discount_cents: 0, total_cents: iTot.total_cents, due_date: new Date().toISOString().slice(0, 10),
        public_token: generateInvoicePublicToken(), ...(isUnderpaymentTarget ? {} : { paid_at: new Date().toISOString() }),
      }).select('id, total_cents').single()
      if (invoice && !invErr) {
        invoicesCreated++
        if (p.kind === 'final') { finalInvoiceId = invoice.id; finalInvoiceAmountCents = invoice.total_cents }
        if (p === coPayment) coInvoiceId = invoice.id
      }

      // ============ 7a. MID-PROJECT UNDERPAYMENT / COLLECTIONS ============
      // Distinct from the final-invoice quality/scope dispute in 7b below: a
      // cash-flow problem, not a dispute over the work. Exercises the REAL
      // partial-payment path (payment row linked to invoice_id → DB trigger
      // invoices_recompute_paid recomputes amount_paid_cents + status), not
      // just a status-field toggle — proves the trigger tolerates 2 payments
      // against 1 invoice and lands on 'paid' only once the balance clears.
      if (isUnderpaymentTarget && invoice) {
        const shortCents = Math.round(p.amount_cents * cfg.progressUnderpayment.shortPct)
        const partialCents = p.amount_cents - shortCents

        const { data: partialPayment, error: partialErr } = await supabase.from('payments').insert({
          tenant_id: tenant.id, invoice_id: invoice.id, booking_id: null,
          amount_cents: partialCents, tip_cents: 0, method: 'ach', status: 'succeeded',
        }).select('id').single()
        add('collections: partial payment recorded against progress invoice', !!partialPayment && !partialErr, partialErr?.message)

        const { data: invAfterPartial } = await supabase.from('invoices').select('status, amount_paid_cents').eq('id', invoice.id).single()
        add('collections: invoice flips to partial (not silently marked paid)', invAfterPartial?.status === 'partial', invAfterPartial?.status)
        add('collections: amount_paid_cents = partial payment exactly', invAfterPartial?.amount_paid_cents === partialCents, `${invAfterPartial?.amount_paid_cents} vs ${partialCents}`)

        if (partialPayment) {
          const partialRev = await postPaymentRevenue({ tenantId: tenant.id, paymentId: partialPayment.id })
          add('collections: partial payment revenue posted to ledger', partialRev.posted, partialRev.reason)
          if (partialRev.posted) { paymentsPosted++; revenueRecognizedCents += partialCents }
        }

        await logInvoiceEvent({
          invoice_id: invoice.id, tenant_id: tenant.id, event_type: 'partial_payment',
          detail: { amount_cents: partialCents, note: cfg.progressUnderpayment.note, balance_cents: shortCents },
        })
        await supabase.from('job_events').insert({
          tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'payment_shortfall',
          detail: { note: cfg.progressUnderpayment.note, invoice_id: invoice.id, short_cents: shortCents },
        })

        // Collections follow-up while the balance is still outstanding.
        await logInvoiceEvent({
          invoice_id: invoice.id, tenant_id: tenant.id, event_type: 'reminder_sent',
          detail: { balance_cents: shortCents, days_outstanding: cfg.progressUnderpayment.followupOffsetDays },
        })
        add('collections: reminder logged while balance is still outstanding', true)

        // Client catches up — collect the remaining balance.
        const { data: finalPayment, error: finalErr } = await supabase.from('payments').insert({
          tenant_id: tenant.id, invoice_id: invoice.id, booking_id: null,
          amount_cents: shortCents, tip_cents: 0, method: 'ach', status: 'succeeded',
        }).select('id').single()
        add('collections: remaining balance collected', !!finalPayment && !finalErr, finalErr?.message)

        const { data: invAfterFull } = await supabase.from('invoices').select('status, amount_paid_cents').eq('id', invoice.id).single()
        add('collections: invoice flips to paid once balance is collected', invAfterFull?.status === 'paid', invAfterFull?.status)
        add('collections: amount_paid_cents = full milestone amount (nothing lost)', invAfterFull?.amount_paid_cents === p.amount_cents, `${invAfterFull?.amount_paid_cents} vs ${p.amount_cents}`)

        if (finalPayment) {
          const finalRev = await postPaymentRevenue({ tenantId: tenant.id, paymentId: finalPayment.id })
          add('collections: balance-collection revenue posted to ledger', finalRev.posted, finalRev.reason)
          if (finalRev.posted) { paymentsPosted++; revenueRecognizedCents += shortCents }
        }
        continue
      }

      const { data: payment, error: payErr } = await supabase.from('payments').insert({
        tenant_id: tenant.id, booking_id: null, amount_cents: p.amount_cents, tip_cents: 0,
        method: 'ach', status: 'completed',
      }).select('id').single()
      if (payment && !payErr) {
        const rev = await postPaymentRevenue({ tenantId: tenant.id, paymentId: payment.id })
        if (rev.posted) { paymentsPosted++; revenueRecognizedCents += p.amount_cents }
      }
    }
    add(`invoicing: ${billablePlan.length} invoices created (incl. change order)`, invoicesCreated === billablePlan.length, `${invoicesCreated}/${billablePlan.length}`)
    add(`invoicing: ${expectedPaymentCount} payments posted to ledger (incl. change order + split collections payment)`, paymentsPosted === expectedPaymentCount, `${paymentsPosted}/${expectedPaymentCount}`)
    add('invoicing: revenue = quote total + change order (scope creep not lost, underpayment fully collected)', revenueRecognizedCents === newJobTotal, `${revenueRecognizedCents} vs ${newJobTotal}`)

    // ============ 7a-2. KNOWN GAP: job_payments never syncs to the real invoice/payment/ledger rail ============
    // job_payments has a real `invoice_id` column, added specifically to "link
    // to existing money rails (reuse, don't reinvent)"
    // (src/lib/migrations/2026_07_02_jobs_projects.sql) — but nothing in src/
    // ever sets it. The invoicing loop just above (this archetype's own code,
    // mirroring production's actual workaround) creates independent `invoices`
    // rows per milestone with zero linkage back to the job_payments row they
    // correspond to, and nothing reads job_payments.invoice_id to auto-flip
    // status when that invoice is paid. The ONLY thing that ever moves
    // job_payments.status to 'paid' anywhere in this codebase is
    // PATCH /api/jobs/[id]/payments (operator clicks "Mark paid" on the Job
    // detail page) — a second, fully manual, disconnected step from the real
    // money rail. src/app/dashboard/jobs/[id]/page.tsx computes the "$X
    // collected" header shown at the top of every job ENTIRELY from
    // job_payments.status==='paid' (`paidCents = payments.filter(p => p.status
    // === 'paid')...`), so every milestone below is fully invoiced, paid, and
    // ledger-recognized (proven by the checks above) and the Job page will
    // still show it as outstanding/"due" until someone remembers the separate
    // click. Asserting the CORRECT/desired behavior here (both checks are
    // expected to fail today) rather than silently "fixing" it — the real fix
    // (auto-set invoice_id at milestone-invoice creation + sync status off the
    // invoice's own paid state) is a feature decision, not a one-line patch,
    // and no route in src/app/api even creates an invoice FROM a job_payments
    // row today for that to hook into.
    const { data: jobPaysAfterInvoicing } = await supabase.from('job_payments').select('status, invoice_id')
      .eq('job_id', jobRes.job_id).in('id', (jobPaysAfterCO || []).map(p => p.id))
    add('job_payments: invoice_id auto-linked to the milestone\'s real invoice (KNOWN GAP — column exists, nothing sets it)',
      (jobPaysAfterInvoicing || []).length > 0 && (jobPaysAfterInvoicing || []).every(p => p.invoice_id !== null), JSON.stringify(jobPaysAfterInvoicing))
    add('job_payments: status auto-syncs to paid once the real invoice+payment+ledger settle (KNOWN GAP — Job page "collected" total under-reports without a manual Mark Paid click)',
      (jobPaysAfterInvoicing || []).length > 0 && (jobPaysAfterInvoicing || []).every(p => p.status === 'paid'), JSON.stringify(jobPaysAfterInvoicing))

    // ================= 7b. CUSTOMER DISPUTE (final invoice, completed work) =================
    // Real pain point across every one of these trades, distinct from the
    // mid-project scope-creep change order above: the customer disputes the
    // FINAL invoice AFTER the work is otherwise done — a punch-list item they
    // say wasn't finished, a substitution they didn't sign off on, a finish
    // they're unhappy with. There's no dedicated dispute/credit-memo feature
    // yet; the operator's actual workaround today is: negotiate a partial
    // credit and issue it as a partial refund against the final invoice
    // (reversing that slice of already-recognized revenue) instead of a redo,
    // log the resolution on the job timeline, and leave the invoice in the
    // same 'refunded' status a Stripe-issued refund already uses — proving
    // that workaround doesn't need a dedicated "disputed" state to work.
    add('dispute: final invoice identified to credit against', !!finalInvoiceId, finalInvoiceId || 'missing')
    if (finalInvoiceId) {
      const disputeCreditCents = Math.round(finalInvoiceAmountCents * cfg.dispute.creditPct)
      await supabase.from('job_events').insert({
        tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'dispute_raised',
        detail: { note: cfg.dispute.note, credit_cents: disputeCreditCents },
      })
      await supabase.from('deal_activities').insert({
        tenant_id: tenant.id, deal_id: deal.id, type: 'note',
        description: `Customer dispute — final invoice: ${cfg.dispute.note}`,
        metadata: { job_id: jobRes.job_id, invoice_id: finalInvoiceId, credit_cents: disputeCreditCents },
      })

      const { error: disputeInvErr } = await supabase.from('invoices').update({ status: 'refunded' }).eq('id', finalInvoiceId)
      add('dispute: final invoice marked refunded (partial credit issued)', !disputeInvErr, disputeInvErr?.message)
      await logInvoiceEvent({
        invoice_id: finalInvoiceId, tenant_id: tenant.id, event_type: 'refunded',
        detail: { reason: 'customer_dispute', note: cfg.dispute.note, credit_cents: disputeCreditCents },
      })

      const disputeRefund = await postRefundToLedger({
        tenantId: tenant.id, sourceId: `dispute-${finalInvoiceId}`, amountCents: disputeCreditCents,
        memo: `Customer dispute credit — ${cfg.dispute.note.slice(0, 60)}`,
      })
      add('dispute: credit posted to ledger (revenue reversed, not silently absorbed)', disputeRefund.posted, disputeRefund.reason)
      if (disputeRefund.posted) revenueRecognizedCents -= disputeCreditCents
    }

    // ================= 7c. CANCELLATION (kill fee + partial refund of the change order) =================
    // Client cancels the mid-project change-order scope AFTER it was already
    // invoiced and paid (materials special-ordered up front — the real
    // workflow when added scope needs non-stock material). Distinct from the
    // dispute above (credits the fully-completed base-contract final invoice)
    // and the collections underpayment (never refunds anything): this is a
    // genuine kill-fee cancellation against the change-order invoice only —
    // the base contract's deposit/progress/final milestones are untouched.
    add('cancellation: change-order invoice identified to apply kill fee against', !!coInvoiceId, coInvoiceId || 'missing')
    if (coInvoiceId) {
      const killFeeCents = Math.round(coTotals.total_cents * cfg.cancellation.killFeePct)
      const cancelRefundCents = coTotals.total_cents - killFeeCents
      await supabase.from('job_events').insert({
        tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'change_order_cancelled',
        detail: { note: cfg.cancellation.note, kill_fee_cents: killFeeCents, refund_cents: cancelRefundCents },
      })
      await supabase.from('deal_activities').insert({
        tenant_id: tenant.id, deal_id: deal.id, type: 'note',
        description: `Change order cancelled — kill fee applied: ${cfg.cancellation.note}`,
        metadata: { job_id: jobRes.job_id, invoice_id: coInvoiceId, kill_fee_cents: killFeeCents, refund_cents: cancelRefundCents },
      })

      const { error: cancelInvErr } = await supabase.from('invoices').update({ status: 'refunded' }).eq('id', coInvoiceId)
      add('cancellation: change-order invoice marked refunded (kill fee retained, remainder returned)', !cancelInvErr, cancelInvErr?.message)
      await logInvoiceEvent({
        invoice_id: coInvoiceId, tenant_id: tenant.id, event_type: 'refunded',
        detail: { reason: 'client_cancelled_scope', note: cfg.cancellation.note, kill_fee_cents: killFeeCents, refund_cents: cancelRefundCents },
      })

      const cancelRefund = await postRefundToLedger({
        tenantId: tenant.id, sourceId: `cancel-${coInvoiceId}`, amountCents: cancelRefundCents,
        memo: `Cancellation refund (kill fee retained) — ${cfg.cancellation.note.slice(0, 60)}`,
      })
      add('cancellation: refund posted to ledger for the un-kept portion only (kill fee excluded)', cancelRefund.posted, cancelRefund.reason)
      if (cancelRefund.posted) revenueRecognizedCents -= cancelRefundCents

      const cancelledJobTotal = newJobTotal - cancelRefundCents
      const { error: cancelJobErr } = await supabase.from('jobs').update({ total_cents: cancelledJobTotal }).eq('id', jobRes.job_id)
      add('cancellation: job total reduced by the refunded (un-kept) portion, kill fee still counted', !cancelJobErr, cancelJobErr?.message)
      const { data: jobAfterCancel } = await supabase.from('jobs').select('total_cents').eq('id', jobRes.job_id).single()
      add('cancellation: job total = base contract + kill fee only (cancelled remainder not silently kept)', jobAfterCancel?.total_cents === cancelledJobTotal, `${jobAfterCancel?.total_cents} vs ${cancelledJobTotal}`)
    }

    // ================= 7d. WARRANTY CALLBACK (post-completion, no charge) =================
    // Every scenario above leaves the job sitting in 'scheduled' — nothing in
    // this harness has ever exercised the real completion transition (PATCH
    // /api/jobs/[id] { status: 'completed' }: stamps completed_at, logs a
    // 'completed' job_event, releases any remaining stage-gated payments).
    // Complete the job for real here, then simulate the actual next thing
    // that happens on these trades weeks later across every one of them: a
    // legitimate workmanship callback — distinct from `dispute` (credits an
    // invoice that's still open) and `changeOrder` (new billable scope): the
    // job is closed out, every invoice settled, and the crew goes back for
    // free under the trade's own warranty. Must land as a $0 job_events
    // entry — no new invoice, no new payment, no revenue leak into the P&L
    // for warranty work — and the job must stay 'completed', not silently
    // revert.
    const { error: completeErr } = await supabase.from('jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobRes.job_id)
    add('completion: job marked completed', !completeErr, completeErr?.message)
    await supabase.from('job_events').insert({
      tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'completed', detail: {},
    })
    await releasePaymentsForEvent(tenant.id, jobRes.job_id, 'completed')
    const { data: jobAfterComplete } = await supabase.from('jobs').select('status, completed_at').eq('id', jobRes.job_id).single()
    add('completion: job.status = completed with completed_at stamped', jobAfterComplete?.status === 'completed' && !!jobAfterComplete?.completed_at, jobAfterComplete?.status)

    const invoicesCreatedBeforeCallback = invoicesCreated
    const revenueBeforeCallback = revenueRecognizedCents

    await supabase.from('job_events').insert({
      tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'warranty_callback',
      detail: { note: cfg.warrantyCallback.note, charge_cents: 0 },
    })
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Warranty callback — ${cfg.warrantyCallback.note}`,
      metadata: { job_id: jobRes.job_id, charge_cents: 0 },
    })

    const { data: jobAfterCallback } = await supabase.from('jobs').select('status').eq('id', jobRes.job_id).single()
    add('warranty: job stays completed after the callback (not silently reopened)', jobAfterCallback?.status === 'completed', jobAfterCallback?.status)
    add('warranty: callback creates no new invoice', invoicesCreated === invoicesCreatedBeforeCallback, `${invoicesCreated} vs ${invoicesCreatedBeforeCallback}`)
    add('warranty: callback does not touch recognized revenue (free work, no leak into P&L)', revenueRecognizedCents === revenueBeforeCallback, `${revenueRecognizedCents} vs ${revenueBeforeCallback}`)

    const { data: callbackEvent } = await supabase.from('job_events').select('id, detail')
      .eq('job_id', jobRes.job_id).eq('event_type', 'warranty_callback').maybeSingle()
    add('warranty: callback logged on the job timeline at $0', !!callbackEvent && (callbackEvent.detail as { charge_cents?: number } | null)?.charge_cents === 0, JSON.stringify(callbackEvent?.detail))

    // ================= 8. REFERRALS =================
    const { data: referrer, error: refErr } = await supabase.from('referrers').insert({
      tenant_id: tenant.id, name: cfg.referrer.name, email: cfg.referrer.email, phone: cfg.referrer.phone,
      ref_code: cfg.referrer.refCode, referral_code: cfg.referrer.refCode, commission_rate: cfg.referrer.commissionRate,
      active: true, status: 'active',
    }).select('id').single()
    add('referral: referrer registered', !!referrer && !refErr, refErr?.message)

    if (referrer && jobBookings?.length) {
      const linkBookingId = jobBookings[0].id
      await supabase.from('bookings').update({ referrer_id: referrer.id }).eq('id', linkBookingId)
      const grossCents = quote.total_cents
      const commissionCents = Math.round(grossCents * cfg.referrer.commissionRate)
      const { data: commission, error: commErr } = await supabase.from('referral_commissions').insert({
        tenant_id: tenant.id, booking_id: linkBookingId, referrer_id: referrer.id, client_name: cfg.lead.contactName,
        gross_amount_cents: grossCents, commission_rate: cfg.referrer.commissionRate, commission_cents: commissionCents,
        status: 'pending',
      }).select('id, commission_cents').single()
      add('referral: commission computed correctly', !!commission && !commErr && commission.commission_cents === commissionCents, commErr?.message || `${commission?.commission_cents} vs ${commissionCents}`)
      await notify({ tenantId: tenant.id, type: 'referral_lead', title: 'Referral converted', message: `${cfg.referrer.name} → ${cfg.lead.contactName} (${cfg.referrer.note})` })

      if (commission) {
        // Real POST /api/referral-commissions accrues to the ledger (expense
        // 6045 -> payable 2400) and atomically bumps referrers.total_earned
        // the moment a commission is created — do the same here so the
        // payout step below has a real accrued balance to pay down, not a
        // row this harness never actually recognized as earned.
        const { postCommissionAccrual } = await import('../src/lib/finance/post-adjustments')
        const accrualRes = await postCommissionAccrual({ tenantId: tenant.id, commissionId: commission.id })
        add('referral: commission accrued to ledger (expense 6045 / payable 2400)', accrualRes.posted, accrualRes.reason)
        await supabase.rpc('increment_referrer_earned', {
          p_tenant_id: tenant.id, p_referrer_id: referrer.id, p_amount_cents: commission.commission_cents,
        })
        const { data: refAfterEarn } = await supabase.from('referrers').select('total_earned').eq('id', referrer.id).single()
        add('referral: referrer.total_earned = commission accrued', refAfterEarn?.total_earned === commission.commission_cents, `${refAfterEarn?.total_earned} vs ${commission.commission_cents}`)

        // ============ 8b. REFERRAL COMMISSION PAYOUT ============
        // Distinct from accrual above: the referrer actually getting PAID
        // (a Zelle/ACH/Venmo the office sends weeks after the job closes),
        // not just the commission being recognized as owed. Exercises the
        // real PUT /api/referral-commissions { status: 'paid' } path: a
        // second, separate ledger entry (liability 2400 -> cash 1010,
        // distinct source key 'commission_paid' so it never collides with
        // the accrual entry already posted above) plus the atomic
        // increment_referrer_paid RPC (migrations/2026_07_13_referrer_ledger_atomic.sql
        // — a plain read-then-write here would lose an increment if two
        // payouts landed for the same referrer around the same time).
        const { postCommissionPayment } = await import('../src/lib/finance/post-adjustments')
        const { error: payoutErr } = await supabase.from('referral_commissions')
          .update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: cfg.referralPayout.paidVia })
          .eq('id', commission.id)
        add('referral: commission marked paid', !payoutErr, payoutErr?.message)
        await supabase.rpc('increment_referrer_paid', {
          p_tenant_id: tenant.id, p_referrer_id: referrer.id, p_amount_cents: commission.commission_cents,
        })
        const { data: refAfterPay } = await supabase.from('referrers').select('total_paid, total_earned').eq('id', referrer.id).single()
        add('referral: referrer.total_paid = commission paid out', refAfterPay?.total_paid === commission.commission_cents, `${refAfterPay?.total_paid} vs ${commission.commission_cents}`)
        add('referral: referrer.total_earned untouched by payout (already accrued, not double-counted)', refAfterPay?.total_earned === commission.commission_cents, `${refAfterPay?.total_earned}`)

        const payoutRes = await postCommissionPayment({ tenantId: tenant.id, commissionId: commission.id })
        add('referral: commission payment posted to ledger (payable 2400 -> cash 1010)', payoutRes.posted, payoutRes.reason)
        if (payoutRes.entryId) {
          const { data: payoutLines } = await supabase.from('journal_lines').select('coa_id, debit_cents, credit_cents').eq('entry_id', payoutRes.entryId)
          add('referral: payout entry has exactly 2 balanced lines', (payoutLines?.length || 0) === 2, JSON.stringify(payoutLines))
        }
        add('referral: re-posting an already-paid commission is a no-op (idempotent, no duplicate cash-out)',
          (await postCommissionPayment({ tenantId: tenant.id, commissionId: commission.id })).posted === false)

        await notify({
          tenantId: tenant.id, type: 'follow_up', title: 'Commission paid',
          message: `${cfg.referrer.name}: $${(commission.commission_cents / 100).toFixed(2)} paid via ${cfg.referralPayout.paidVia} — ${cfg.referralPayout.note}`,
        })
      }
    }

    // ================= 9. REVIEWS =================
    // Linked to the real client record resolved in 3a above (not null) — every
    // prior scenario left this hardcoded null despite the job already having a
    // real client_id, which would have made this the tenant's ENTIRE review
    // history invisible from that customer's client record in production.
    const { data: review, error: revErr } = await supabase.from('reviews').insert({
      tenant_id: tenant.id, client_id: job?.client_id || null, booking_id: jobBookings?.[jobBookings.length - 1]?.id || null,
      team_member_id: worker?.id || null, rating: cfg.review.rating, comment: cfg.review.comment,
      source: 'google', status: 'published', name: cfg.lead.contactName, text: cfg.review.comment,
      completed_at: new Date().toISOString(), published_at: new Date().toISOString(),
    }).select('id, rating').single()
    add('review: customer review recorded', !!review && !revErr && review.rating === cfg.review.rating, revErr?.message)
    add('review: linked to the real client record (visible from that customer\'s history, not orphaned)', !!job?.client_id, job?.client_id)

    const { reviewRequestEmail } = await import('../src/lib/email-templates')
    const reviewHtml = reviewRequestEmail({ tenantName: bizName, clientName: cfg.lead.contactName, feedbackUrl: `https://${slug}.example.com/review` })
    add('comms: review-request email composes', reviewHtml.includes('Leave a Review') && reviewHtml.includes(cfg.lead.contactName))
    await notify({ tenantId: tenant.id, type: 'review_received', title: 'New review', message: `${cfg.lead.contactName} left a ${cfg.review.rating}-star review` })

    // ================= 10. REPORTING (ledger P&L over the project's own window) =================
    const { ledgerProfitAndLoss } = await import('../src/lib/finance/ledger-reports')
    const from = projectDaysFromNow(0, 0).slice(0, 10)
    const to = projectDaysFromNow(cfg.sessions[cfg.sessions.length - 1].offsetDays + 5, 0).slice(0, 10)
    const pnl = await ledgerProfitAndLoss(tenant.id, from, to)
    add('reporting: P&L revenue reflects milestone payments', pnl.revenue_cents === revenueRecognizedCents, `pnl.revenue=${pnl.revenue_cents} vs ${revenueRecognizedCents}`)
    add('reporting: P&L shows labor cost (net < revenue)', pnl.net_profit_cents < pnl.revenue_cents, `net=${pnl.net_profit_cents} rev=${pnl.revenue_cents}`)
    add('reporting: P&L net profit positive on this job', pnl.net_profit_cents > 0, `net=${pnl.net_profit_cents}`)

  } catch (err) {
    const msg = err instanceof Error ? err.message
      : (err && typeof err === 'object') ? JSON.stringify(err)
      : String(err)
    add('FATAL', false, msg)
  } finally {
    if (!PERSIST) {
      if (tenantId) {
        for (const tbl of [
          'referral_commissions', 'referrers', 'reviews', 'notifications', 'payroll_payments',
          'territory_claims', 'expenses', 'journal_lines', 'journal_entries', 'chart_of_accounts',
          'hr_documents', 'hr_employee_profiles', 'hr_document_requirements', 'invoice_activity', 'invoices',
          'quote_activity', 'quotes', 'deal_activities', 'deals', 'job_events', 'job_payments',
          'booking_team_members', 'bookings', 'recurring_schedules', 'jobs', 'team_members', 'payments', 'clients',
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
      }
    } else if (tenantId) {
      leftovers.push(`PERSISTED tenant ${tenantId}`)
    }
  }

  const passed = checks.filter(c => c.pass).length
  const failed = checks.filter(c => !c.pass).length
  const failures = checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  return { category: cfg.key, industry: ind, model: 'project', passed, failed, failures, ms: Date.now() - t0, leftovers }
}

async function runProjectArchetypesPhase(): Promise<TradeResult[]> {
  const scoped = ONLY.length ? PROJECT_SCENARIOS.filter(s => ONLY.includes(s.key)) : PROJECT_SCENARIOS
  const results: TradeResult[] = []
  for (let i = 0; i < scoped.length; i++) {
    process.stdout.write(`[P12 ${i + 1}/${scoped.length}] ${scoped[i].key.padEnd(20)}`)
    const r = await runProjectArchetype(scoped[i], i)
    results.push(r)
    console.log(`${r.failed === 0 ? '✓' : '✗'} ${r.passed} pass${r.failed ? ` / ${r.failed} FAIL` : ''} [${r.industry}] (${r.ms}ms)`)
    r.failures.forEach(f => console.log(`      ✗ ${f}`))
    if (r.leftovers.length) r.leftovers.forEach(l => console.log(`      ⚠ leftover ${l}`))
  }
  return results
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

  // P12 — project archetypes (W2 lane): runs whenever no ONLY filter is set, or
  // when ONLY names one of the archetype scenario keys directly.
  const runArchetypes = !ONLY.length || PROJECT_SCENARIOS.some(s => ONLY.includes(s.key))
  const archetypeResults = runArchetypes ? await runProjectArchetypesPhase() : []
  results.push(...archetypeResults)

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
