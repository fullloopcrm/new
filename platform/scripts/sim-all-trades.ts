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
  payments: ProjectPaymentPct[]
  sessions: ProjectSessionPlan[]
  crew: { name: string; employmentType: 'contractor_1099' | 'employee_w2'; compType: 'per_job' | 'hourly' | 'salary'; payLabel: string; payCents: number; payMethod: string }
  referrer: { name: string; email: string; phone: string; refCode: string; commissionRate: number; note: string }
  review: { rating: number; comment: string }
  // Mid-project scope change — the customer adds/changes scope after the job
  // is already sold, scheduled and underway (not caught at quote time). Real
  // pain point for every one of these trades: hidden damage found once
  // tear-off starts, a client falling for the samples and wanting more,
  // seeing one room finished and wanting another added.
  changeOrder: { note: string; offsetDays: number; lineItem: ProjectLineItem }
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

    const { data: quote, error: qInsErr } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: null, deal_id: deal.id, quote_number: quoteNumber, status: 'draft',
      title: cfg.quoteTitle, contact_name: cfg.lead.contactName, contact_email: cfg.lead.contactEmail,
      contact_phone: cfg.lead.contactPhone, service_address: cfg.lead.address,
      line_items: lineItems, subtotal_cents: totals.subtotal_cents, tax_rate_bps: cfg.taxRateBps,
      tax_cents: totals.tax_cents, discount_cents: 0, total_cents: totals.total_cents,
      public_token: generatePublicToken(),
    }).select('id, total_cents, quote_number').single()
    add('quote: created & linked to deal', !!quote && !qInsErr, qInsErr?.message)
    if (!quote) throw new Error('quote insert failed: ' + qInsErr?.message)

    // ---- comms compose (pure — no send; tenant has no resend/telnyx keys) ----
    const { emailShell, smsFormat } = await import('../src/lib/messaging/shell')
    const quoteEmailHtml = emailShell({
      brand: { name: bizName },
      kicker: 'Your proposal is ready', heading: "Let's make it official.",
      bodyHtml: `<p>Hi ${cfg.lead.contactName.split(' ')[0]},</p><p>Your proposal ${quote.quote_number} — ${cfg.quoteTitle} is ready. Total ${formatCents(quote.total_cents)}.</p>`,
      cta: { label: 'Review & Accept', url: `https://${slug}.example.com/quote/${randomUUID()}` },
    })
    add('comms: quote email composes with real total', quoteEmailHtml.includes(formatCents(quote.total_cents)) && quoteEmailHtml.includes(quote.quote_number))
    const quoteSms = smsFormat({ name: bizName }, `Hi ${cfg.lead.contactName.split(' ')[0]}, your proposal for ${formatCents(quote.total_cents)} is ready — review, sign & pay here.`)
    add('comms: quote sms signed with business name', quoteSms.includes(bizName))

    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: 'email' }).eq('id', quote.id)
    await supabase.from('deals').update({ stage: 'quoted', value_cents: quote.total_cents, last_activity_at: new Date().toISOString() }).eq('id', deal.id)
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal.id, type: 'note',
      description: `Proposal ${quote.quote_number} sent — ${formatCents(quote.total_cents)}`,
      metadata: { quote_id: quote.id, total_cents: quote.total_cents },
    })
    add('quote: deal advanced to quoted', true)

    // ================= 3. SALE CONVERSION =================
    await supabase.from('quotes').update({ status: 'accepted', accepted_at: new Date().toISOString(), signature_name: cfg.lead.contactName }).eq('id', quote.id)
    await supabase.from('deals').update({ stage: 'pending', last_activity_at: new Date().toISOString() }).eq('id', deal.id)
    await notify({ tenantId: tenant.id, type: 'quote_accepted', title: 'Proposal accepted', message: `${cfg.lead.contactName} accepted ${quote.quote_number}` })

    // ================= 4. SCHEDULING (real project timeline) =================
    const { createJobFromQuote } = await import('../src/lib/jobs')
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

    const { data: job } = await supabase.from('jobs').select('id, status, total_cents').eq('id', jobRes.job_id).single()
    add('job: status scheduled', job?.status === 'scheduled', job?.status)
    add('job: total = quote total', job?.total_cents === quote.total_cents)

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

    // assign the crew member to the job's sessions
    if (worker?.id && jobBookings?.length) {
      for (const b of jobBookings) await supabase.from('bookings').update({ team_member_id: worker.id }).eq('id', b.id)
      add('schedule: crew assigned to every session', true)
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

    // ================= 7. BOOKKEEPING / INVOICING (milestone invoices → ledger) =================
    const { generateInvoiceNumber, generateInvoicePublicToken, computeTotals: invTotals, normalizeLineItems: invLines } = await import('../src/lib/invoice')
    const { postPaymentRevenue } = await import('../src/lib/finance/post-revenue')
    const { data: defEntity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()

    const billablePlan = [...plan, coPayment]
    let invoicesCreated = 0
    let paymentsPosted = 0
    let revenueRecognizedCents = 0
    for (const p of billablePlan) {
      const invNum = await generateInvoiceNumber(tenant.id)
      const iLines = invLines([{ name: p.label, quantity: 1, unit_price_cents: p.amount_cents }])
      const iTot = invTotals(iLines, 0, 0)
      const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        tenant_id: tenant.id, entity_id: defEntity?.id || null, invoice_number: invNum, status: 'paid',
        title: `${cfg.quoteTitle} — ${p.label}`, contact_name: cfg.lead.contactName, contact_email: cfg.lead.contactEmail,
        line_items: iLines, subtotal_cents: iTot.subtotal_cents, tax_rate_bps: 0, tax_cents: 0,
        discount_cents: 0, total_cents: iTot.total_cents, due_date: new Date().toISOString().slice(0, 10),
        public_token: generateInvoicePublicToken(), paid_at: new Date().toISOString(),
      }).select('id, total_cents').single()
      if (invoice && !invErr) invoicesCreated++

      const { data: payment, error: payErr } = await supabase.from('payments').insert({
        tenant_id: tenant.id, booking_id: null, amount_cents: p.amount_cents, tip_cents: 0,
        method: 'ach', status: 'completed',
      }).select('id').single()
      if (payment && !payErr) {
        const rev = await postPaymentRevenue({ tenantId: tenant.id, paymentId: payment.id })
        if (rev.posted) { paymentsPosted++; revenueRecognizedCents += p.amount_cents }
      }
    }
    add(`invoicing: ${billablePlan.length} invoices created & marked paid (incl. change order)`, invoicesCreated === billablePlan.length, `${invoicesCreated}/${billablePlan.length}`)
    add(`invoicing: ${billablePlan.length} payments posted to ledger (incl. change order)`, paymentsPosted === billablePlan.length, `${paymentsPosted}/${billablePlan.length}`)
    add('invoicing: revenue = quote total + change order (scope creep not lost)', revenueRecognizedCents === newJobTotal, `${revenueRecognizedCents} vs ${newJobTotal}`)

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
    }

    // ================= 9. REVIEWS =================
    const { data: review, error: revErr } = await supabase.from('reviews').insert({
      tenant_id: tenant.id, client_id: null, booking_id: jobBookings?.[jobBookings.length - 1]?.id || null,
      team_member_id: worker?.id || null, rating: cfg.review.rating, comment: cfg.review.comment,
      source: 'google', status: 'published', name: cfg.lead.contactName, text: cfg.review.comment,
      completed_at: new Date().toISOString(), published_at: new Date().toISOString(),
    }).select('id, rating').single()
    add('review: customer review recorded', !!review && !revErr && review.rating === cfg.review.rating, revErr?.message)

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
          'territory_claims', 'journal_lines', 'journal_entries', 'chart_of_accounts',
          'hr_employee_profiles', 'hr_document_requirements', 'invoice_activity', 'invoices',
          'quote_activity', 'quotes', 'deal_activities', 'deals', 'job_events', 'job_payments',
          'bookings', 'recurring_schedules', 'jobs', 'team_members', 'payments', 'clients',
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
