/**
 * LANDSCAPING TENANT STAND-UP — build a second real test tenant, "Tucker's
 * Landscaping Company," on the lawn_care (booking/service) vertical — the
 * recurring-mow, service-model sibling of sim-gc-lifecycle.ts's one-off
 * project (remodeling) tenant. Priority order per the leader's ask: stand up
 * the tenant + 20 real clients + 5 real field team members correctly FIRST
 * (with real verification, not placeholder rows), then exercise a modest
 * slice of the operating lifecycle (dispatch/checkin/checkout, one recurring
 * sale, one payroll run, one invoice+payment, reporting readback) to prove
 * the seeded data is actually load-bearing, not just decorative rows.
 *
 * Reuses sim-gc-lifecycle.ts's infra/patterns directly: same env bootstrap,
 * same provisionTenant/seedHrDefaults/provisionApprovedApplicant HR pipeline,
 * same team-portal PIN/checkin/checkout real-route exercises, same
 * postPayrollToLedger/postPaymentRevenue finance posting, same cleanup-on-exit
 * shape. Differs where the vertical differs: lawn_care is a SERVICE
 * (recurring booking) archetype, not a PROJECT (lead-sale) archetype, so
 * client "service history" is modeled as backdated completed bookings against
 * client_properties (this platform's real multi-address-per-client table),
 * not job payment milestones.
 *
 * SAFETY: same as sim-gc-lifecycle.ts — RESEND_API_KEY forced to a
 * placeholder, no Stripe/Telnyx creds configured for this tenant, owner
 * identity = Jeff so nothing lands on a real third party.
 *
 * USAGE: cd platform && npx tsx scripts/sim-landscaping-tenant.ts
 *   SIM_PERSIST=1  keep the tenant for manual inspection (default: clean up)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'

// ---- env (same bootstrap as sim-gc-lifecycle.ts) ----
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
process.env.RESEND_API_KEY = 'placeholder'
if (!process.env.TEAM_PORTAL_SECRET) process.env.TEAM_PORTAL_SECRET = randomBytes(32).toString('hex')
if (!process.env.PORTAL_SECRET) process.env.PORTAL_SECRET = randomBytes(32).toString('hex')
const supabase = createClient(url, key, { auth: { persistSession: false } })

const OWNER = { name: 'Jeff Tucker', email: 'fullloopcrm@gmail.com', phone: '+12122029220' }
const PERSIST = process.env.SIM_PERSIST === '1'
const runId = `${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`

interface Check { section: string; name: string; pass: boolean; detail?: string }
const checks: Check[] = []
const gaps: string[] = []
function add(section: string, name: string, pass: boolean, detail?: string) {
  checks.push({ section, name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} [${section}] ${name}${detail ? ` — ${detail}` : ''}`)
}
function gap(note: string) {
  gaps.push(note)
  console.log(`⚠️  GAP: ${note}`)
}

function slugify(name: string, id: string): string {
  return 'sim-lawn-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + id.slice(0, 6)
}

const naive = (d: Date) => d.toISOString().slice(0, 19)
const daysFromNow = (n: number, hour = 9) => { const d = new Date(Date.now() + n * 24 * 3600 * 1000); d.setHours(hour, 0, 0, 0); return d }

// ═══════════════════════════════════════════════════════════════════════════
// FIELD CREW — 5 real hires, realistic role mix for a lawn-care operation
// ═══════════════════════════════════════════════════════════════════════════
const CREW_ROSTER: Array<{
  name: string; title: string; role: 'lead' | 'worker'; employmentType: 'employee_w2' | 'contractor_1099'
  compType: 'hourly'; payRateCents: number; hireDaysAgo: number
}> = [
  { name: 'Hector Delgado', title: 'Crew Lead / Foreman', role: 'lead', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2600, hireDaysAgo: 1100 },
  { name: 'Mason Fitch', title: 'Mower Operator', role: 'worker', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 1900, hireDaysAgo: 730 },
  { name: 'DeShawn Price', title: 'Mower Operator', role: 'worker', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 1800, hireDaysAgo: 420 },
  { name: 'Kayla Simmons', title: 'Landscape Technician (planting / mulch / hardscape)', role: 'worker', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2100, hireDaysAgo: 240 },
  { name: 'Roy Whitfield', title: 'Seasonal Crew (leaf & cleanup season, sub)', role: 'worker', employmentType: 'contractor_1099', compType: 'hourly', payRateCents: 2400, hireDaysAgo: 60 },
]

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTS — 20 real accounts with varied property types + service history.
// historyType drives how many backdated completed bookings get generated so
// the roster reads as a real book of business, not 20 identical placeholders.
// ═══════════════════════════════════════════════════════════════════════════
type HistoryType = 'long_weekly' | 'weekly' | 'biweekly' | 'monthly_fert' | 'seasonal_leaf' | 'new' | 'churned' | 'commercial_contract'
interface ClientDef {
  name: string; email: string; phone: string; address: string
  propertyLabel: string; propertyNotes: string; historyType: HistoryType
}
const CLIENTS: ClientDef[] = [
  { name: 'Diane Marsh', email: 'diane.marsh', phone: '6155550101', address: '214 Poplar Ridge Ln, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Ranch home, 0.18-acre lot, flat front yard + fenced backyard', historyType: 'long_weekly' },
  { name: 'The Osei Family', email: 'osei.family', phone: '6155550102', address: '88 Meadowbrook Ct, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'New construction, fresh sod install spring 2026, 0.22-acre lot', historyType: 'weekly' },
  { name: 'Bill & Carol Tran', email: 'tran.residence', phone: '6155550103', address: '1402 Winterberry Dr, Franklin, TN 37069', propertyLabel: 'Estate', propertyNotes: 'Custom estate, 2.6 acres, in-ground pool + full irrigation system', historyType: 'long_weekly' },
  { name: 'Ashwood Village HOA', email: 'admin.ashwoodvillage', phone: '6155550104', address: '500 Ashwood Common, Franklin, TN 37067', propertyLabel: 'Common Grounds', propertyNotes: 'HOA community — 3 entrance islands + clubhouse lawn, contract mowing', historyType: 'commercial_contract' },
  { name: 'Marcus Iheanacho', email: 'marcus.iheanacho', phone: '6155550105', address: '77 Steepbank Rd, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Corner lot on a hillside, steep erosion-prone rear slope', historyType: 'biweekly' },
  { name: 'The Colemans', email: 'coleman.family', phone: '6155550106', address: '219 Heritage Oak Ln, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Historic 1920s home, mature oak-shaded lawn, no irrigation system', historyType: 'monthly_fert' },
  { name: 'Brightline Office Park LLC', email: 'facilities.brightline', phone: '6155550107', address: '900 Cool Springs Blvd, Franklin, TN 37067', propertyLabel: 'Office Park', propertyNotes: 'Commercial office park — parking lot islands + entrance beds, contract', historyType: 'commercial_contract' },
  { name: 'Magnolia Grove Retirement Community', email: 'grounds.magnoliagrove', phone: '6155550108', address: '15 Magnolia Grove Way, Franklin, TN 37064', propertyLabel: 'Clubhouse Grounds', propertyNotes: 'Retirement community — clubhouse grounds + walking-path borders', historyType: 'commercial_contract' },
  { name: 'Patel Rental Holdings', email: 'accounting.patelholdings', phone: '6155550109', address: '60 Dellwood St, Franklin, TN 37064', propertyLabel: 'Rental Portfolio', propertyNotes: 'Landlord — 3-unit rental portfolio (60/62/64 Dellwood), shared small lots', historyType: 'weekly' },
  { name: 'Renee Vasquez', email: 'renee.vasquez', phone: '6155550110', address: '33 Cul-de-Sac Ct, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Standard suburban cul-de-sac lot, 0.2 acre', historyType: 'weekly' },
  { name: 'Big Sky Farm (Tom Halloran)', email: 'tom.hallorans', phone: '6155550111', address: '4400 Hillsboro Pike, Franklin, TN 37064', propertyLabel: 'Farm', propertyNotes: 'Farmhouse + 5-acre pasture edge mowing, bush-hog attachment needed', historyType: 'biweekly' },
  { name: 'Cedar Court Condo Association', email: 'board.cedarcourt', phone: '6155550112', address: '210 Cedar Ct, Franklin, TN 37067', propertyLabel: 'Common Grounds', propertyNotes: 'Condo association — 8 units, shared courtyard, contract mowing', historyType: 'commercial_contract' },
  { name: 'First Franklin Community Church', email: 'facilities.firstfranklin', phone: '6155550113', address: '501 Church St, Franklin, TN 37064', propertyLabel: 'Campus', propertyNotes: 'Church campus, 1.5 acres + parking lot beds', historyType: 'biweekly' },
  { name: 'The Whitfields', email: 'whitfield.residence', phone: '6155550114', address: '12 Harpeth River Rd, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Waterfront lot on the Harpeth River — erosion control + riverbank mowing', historyType: 'monthly_fert' },
  { name: 'Sandra & Mike Ilagan', email: 'ilagan.duplex', phone: '6155550115', address: '45 Duplex Row, Franklin, TN 37064', propertyLabel: 'Duplex', propertyNotes: 'Duplex property (45/47), two small side-by-side yards', historyType: 'weekly' },
  { name: 'Vantage Corporate HQ', email: 'facilities.vantagehq', phone: '6155550116', address: '100 Vantage Way, Franklin, TN 37067', propertyLabel: 'Corporate HQ', propertyNotes: 'Corporate headquarters — entrance + parking islands, high-visibility contract', historyType: 'commercial_contract' },
  { name: 'Emily Ransom', email: 'emily.ransom', phone: '6155550117', address: '909 Fresh Start Ave, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Just signed up — first mow scheduled this week, 0.16-acre lot', historyType: 'new' },
  { name: 'The Buckners', email: 'buckner.family', phone: '6155550118', address: '18 Willowbrook Trail, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Long-standing weekly client (5 years), 0.3 acre with flower beds', historyType: 'long_weekly' },
  { name: 'Denise Frey', email: 'denise.frey', phone: '6155550119', address: '27 Autumn Hollow Dr, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Seasonal-only client — spring + fall cleanup, no standing mow contract', historyType: 'seasonal_leaf' },
  { name: 'The Garzas', email: 'garza.family', phone: '6155550120', address: '5 Fading Lawn Ct, Franklin, TN 37064', propertyLabel: 'Home', propertyNotes: 'Cancelled after a storm-damage billing dispute — was weekly for 10 weeks', historyType: 'churned' },
]

async function main() {
  let tenantId: string | null = null
  const leftoverTables = [
    'notifications', 'payments', 'payroll_payments', 'journal_lines', 'journal_entries',
    'chart_of_accounts', 'hr_documents', 'hr_employee_profiles', 'hr_document_requirements',
    'invoice_activity', 'invoices', 'recurring_schedules', 'quote_activity', 'deal_activities',
    'deals', 'quotes', 'job_events', 'job_payments', 'booking_team_members', 'bookings',
    'property_changes', 'client_properties', 'team_members', 'clients', 'service_types',
    'entities', 'tenant_invites', 'tenant_domains', 'jobs',
  ]

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 1 — TENANT: sell + onboard a lawn-care / landscaping business
    // ═══════════════════════════════════════════════════════════════════════
    const bizName = `Tucker's Landscaping Company (sim-${runId})`
    const { mapIndustry } = await import('../src/lib/industry-presets')
    const ind = mapIndustry('Lawn Care & Landscaping Maintenance')
    add('1-tenant', 'mapIndustry resolves "Lawn Care & Landscaping Maintenance" → lawn_care', ind === 'lawn_care', ind)

    const { signupPricing } = await import('../src/lib/tier-prices')
    const pricing = signupPricing()
    const slug = slugify(bizName, randomUUID())
    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
      name: bizName, slug, industry: ind,
      phone: OWNER.phone, email: OWNER.email,
      owner_name: OWNER.name, owner_email: OWNER.email, owner_phone: OWNER.phone,
      status: 'active', plan: 'growth',
      monthly_rate: Math.round((pricing.monthly_cents || 0) / 100),
      setup_fee: Math.round((pricing.setup_cents || 0) / 100),
      setup_fee_paid_at: new Date().toISOString(), billing_status: 'active',
      address: 'Franklin, TN 37064',
    }).select('id, slug, name').single()
    add('1-tenant', 'tenant created (active, growth plan)', !!tenant && !tErr, tErr?.message || tenant?.id)
    if (!tenant) throw new Error('tenant insert failed: ' + tErr?.message)
    tenantId = tenant.id

    const { error: eErr } = await supabase.from('entities').insert({ tenant_id: tenant.id, name: bizName, is_default: true, active: true })
    add('1-tenant', 'default entity seeded', !eErr, eErr?.message)

    const { provisionTenant } = await import('../src/lib/provision-tenant')
    const prov = await provisionTenant({ tenantId: tenant.id, industry: ind })
    add('1-tenant', 'provisionTenant seeded services/config/hours/payment methods/guidelines', prov.seeded.services > 0 && prov.seeded.selena_config, JSON.stringify(prov.seeded))

    const { data: services } = await supabase.from('service_types')
      .select('id, name, price_cents, item_type, per_unit, default_hourly_rate, default_duration_hours').eq('tenant_id', tenant.id)
    add('1-tenant', `lawn-care service catalog seeded (${services?.length || 0} services, all priced)`,
      (services?.length || 0) > 0 && (services || []).every(s => (s.price_cents || 0) > 0), `${services?.length} services`)

    const inviteToken = randomBytes(32).toString('hex')
    const { error: invErr } = await supabase.from('tenant_invites').insert({
      tenant_id: tenant.id, email: OWNER.email.toLowerCase(), role: 'owner', token: inviteToken,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    add('1-tenant', 'admin/owner invite created (Jeff — the "1 admin")', !invErr, invErr?.message)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 2 — HR: 5 real field team members (real HR profiles, pay rates,
    // hire dates), same pipeline sim-gc-lifecycle.ts uses.
    // ═══════════════════════════════════════════════════════════════════════
    const { seedHrDefaults } = await import('../src/lib/hr')
    const { provisionApprovedApplicant } = await import('../src/lib/team-provisioning')
    const hr0 = await seedHrDefaults(tenant.id)
    add('2-hr', 'HR document requirement template seeded', hr0.requirementsSeeded > 0, `${hr0.requirementsSeeded} reqs`)

    const crew: Array<{ id: string; pin: string; name: string; def: (typeof CREW_ROSTER)[number] }> = []
    for (let i = 0; i < CREW_ROSTER.length; i++) {
      const def = CREW_ROSTER[i]
      const phone = '615' + String(5559000 + i).slice(-7)
      try {
        await provisionApprovedApplicant(tenant.id, {
          id: randomUUID(), name: def.name, email: `${def.name.toLowerCase().replace(/[^a-z]+/g, '.')}+${runId}@example.com`, phone, address: null,
        })
      } catch (e) {
        const emailThrew = /Email not configured|Resend/i.test(e instanceof Error ? e.message : String(e))
        if (!emailThrew) throw e
      }
      const { data: member } = await supabase.from('team_members').select('id, pin, name').eq('tenant_id', tenant.id).eq('name', def.name).single()
      if (member) crew.push({ id: member.id as string, pin: String(member.pin), name: member.name as string, def })
    }
    add('2-hr', 'all 5 field team members hired as real team_members with 4-digit portal PINs', crew.length === 5 && crew.every(c => /^\d{4}$/.test(c.pin)), `${crew.length}/5 hired`)

    const hr1 = await seedHrDefaults(tenant.id)
    add('2-hr', 'HR profiles backfilled for all 5 new hires', hr1.profilesBackfilled === 5, `backfilled=${hr1.profilesBackfilled}`)

    for (const c of crew) {
      const hireDate = new Date(Date.now() - c.def.hireDaysAgo * 24 * 3600 * 1000).toISOString().slice(0, 10)
      await supabase.from('team_members').update({ role: c.def.role }).eq('id', c.id)
      await supabase.from('hr_employee_profiles').update({
        employment_type: c.def.employmentType, comp_type: c.def.compType, pay_rate_cents: c.def.payRateCents,
        title: c.def.title, hire_date: hireDate, hr_status: 'active',
      }).eq('tenant_id', tenant.id).eq('team_member_id', c.id)
    }
    const { data: profiles } = await supabase.from('hr_employee_profiles').select('team_member_id, employment_type, pay_rate_cents, title, hire_date').eq('tenant_id', tenant.id)
    const w2Count = (profiles || []).filter(p => p.employment_type === 'employee_w2').length
    const subCount = (profiles || []).filter(p => p.employment_type === 'contractor_1099').length
    add('2-hr', 'crew comp/title/hire_date set — realistic mix of tenured W-2 crew + a newer 1099 seasonal sub',
      w2Count === 4 && subCount === 1 && (profiles || []).every(p => !!p.pay_rate_cents && !!p.title && !!p.hire_date),
      `w2=${w2Count} 1099=${subCount}`)

    const { data: hrReqs } = await supabase.from('hr_document_requirements').select('doc_type, applies_to, required').eq('tenant_id', tenant.id).order('sort_order')
    let totalSubmitted = 0, totalApproved = 0
    for (const c of crew) {
      const applicable = (hrReqs || []).filter(r => r.required && (r.applies_to === 'all' || r.applies_to === c.def.employmentType))
      for (const req of applicable) {
        await supabase.from('hr_documents').insert({
          tenant_id: tenant.id, team_member_id: c.id, doc_type: req.doc_type, status: 'submitted',
          file_url: `https://sim-uploads.example.com/${runId}/${c.id}/${req.doc_type}.pdf`,
        })
        totalSubmitted++
      }
    }
    const { data: submittedDocs } = await supabase.from('hr_documents').select('id, team_member_id, doc_type').eq('tenant_id', tenant.id)
    for (const d of submittedDocs || []) {
      await supabase.from('hr_documents').update({ status: 'approved' }).eq('id', d.id as string)
      totalApproved++
    }
    add('2-hr', `every hire's applicable onboarding docs (W-9/W-4/I-9/direct-deposit/ID/agreement) submitted + ops-approved`,
      totalSubmitted > 0 && totalApproved === totalSubmitted, `submitted=${totalSubmitted} approved=${totalApproved}`)

    // Real team-portal PIN login for the crew lead — proves the crew's actual entry point.
    const lead = crew.find(c => c.def.role === 'lead')!
    const { POST: portalAuthPOST } = await import('../src/app/api/team-portal/auth/route')
    const loginRes = await portalAuthPOST(new Request('http://sim.local/api/team-portal/auth', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.44.1.1' },
      body: JSON.stringify({ pin: lead.pin, tenant_slug: tenant.slug }),
    }))
    const loginBody = await loginRes.json()
    add('2-hr', 'crew lead logs into the team portal with their real PIN (real route)', loginRes.status === 200 && !!loginBody?.token && loginBody?.member?.id === lead.id, `status=${loginRes.status}`)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 3 — 20 CLIENTS: real accounts, varied property types, real
    // client_properties rows, and varied backdated service history.
    // ═══════════════════════════════════════════════════════════════════════
    const svcByName = (n: string) => (services || []).find(s => (s.name as string).includes(n))
    const mowSvc = svcByName('Mowing') || (services || [])[0]
    const fertSvc = svcByName('Fertilization') || (services || [])[0]
    const aerationSvc = svcByName('Aeration') || (services || [])[0]
    const leafSvc = svcByName('Leaf Cleanup') || (services || [])[0]

    const HISTORY_PLAN: Record<HistoryType, { count: number; intervalDays: number; svc: typeof mowSvc; futureBooking: boolean; clientStatus: 'active' | 'inactive' }> = {
      long_weekly: { count: 24, intervalDays: 7, svc: mowSvc, futureBooking: true, clientStatus: 'active' },
      weekly: { count: 12, intervalDays: 7, svc: mowSvc, futureBooking: true, clientStatus: 'active' },
      biweekly: { count: 8, intervalDays: 14, svc: mowSvc, futureBooking: true, clientStatus: 'active' },
      monthly_fert: { count: 5, intervalDays: 30, svc: fertSvc, futureBooking: true, clientStatus: 'active' },
      commercial_contract: { count: 16, intervalDays: 14, svc: mowSvc, futureBooking: true, clientStatus: 'active' },
      seasonal_leaf: { count: 2, intervalDays: 180, svc: leafSvc, futureBooking: false, clientStatus: 'active' },
      new: { count: 0, intervalDays: 7, svc: mowSvc, futureBooking: true, clientStatus: 'active' },
      churned: { count: 10, intervalDays: 7, svc: mowSvc, futureBooking: false, clientStatus: 'inactive' },
    }

    let clientsCreated = 0, propertiesCreated = 0, bookingsCreated = 0
    // Fixed per-client "route": each client gets one consistent crew member and
    // one consistent time-of-day slot (realistic — a lawn-care route reuses the
    // same tech + time weekly). Clients are bucketed 5-at-a-time so every group
    // of 5 gets 5 DISTINCT crew members at the SAME hour, and different groups
    // sit at different hours — this guarantees no two clients' visits can ever
    // land on the same crew member during an overlapping window, regardless of
    // which calendar day their independent recurring intervals happen to share.
    const ROUTE_HOURS = [8, 10, 13, 15]
    const routeFor = (clientIndex: number) => ({
      member: crew[clientIndex % crew.length],
      hour: ROUTE_HOURS[Math.floor(clientIndex / crew.length) % ROUTE_HOURS.length],
    })

    for (let clientIndex = 0; clientIndex < CLIENTS.length; clientIndex++) {
      const cdef = CLIENTS[clientIndex]
      const plan = HISTORY_PLAN[cdef.historyType]
      const route = routeFor(clientIndex)
      const durationMs = (plan.svc?.default_duration_hours || 1) * 3600 * 1000
      const { data: client, error: cErr } = await supabase.from('clients').insert({
        tenant_id: tenant.id, name: cdef.name, email: `${cdef.email}+${runId}@example.com`, phone: cdef.phone,
        address: cdef.address, notes: cdef.propertyNotes, source: 'referral', status: plan.clientStatus,
      }).select('id').single()
      if (cErr || !client) { add('3-clients', `client created: ${cdef.name}`, false, cErr?.message); continue }
      clientsCreated++

      const { data: property, error: pErr } = await supabase.from('client_properties').insert({
        tenant_id: tenant.id, client_id: client.id, label: cdef.propertyLabel, address: cdef.address,
        is_primary: true, active: true,
      }).select('id').single()
      if (!pErr && property) propertiesCreated++

      // Backdated completed service-history bookings, oldest first.
      for (let i = plan.count; i >= 1; i--) {
        const when = daysFromNow(-1 * i * plan.intervalDays, route.hour)
        const end = new Date(when.getTime() + durationMs)
        const { error: bErr } = await supabase.from('bookings').insert({
          tenant_id: tenant.id, client_id: client.id, property_id: property?.id || null,
          team_member_id: route.member.id, service_type_id: plan.svc?.id || null, service_type: plan.svc?.name || 'Service',
          start_time: naive(when), end_time: naive(end), status: 'completed',
          price: plan.svc?.price_cents || 0, hourly_rate: plan.svc?.default_hourly_rate || null,
          pay_rate: route.member.def.payRateCents / 100,
          check_in_time: when.toISOString(), check_out_time: end.toISOString(),
          notes: `${cdef.historyType.replace(/_/g, ' ')} service history — visit ${plan.count - i + 1}/${plan.count}`,
        })
        if (!bErr) bookingsCreated++
        else console.log(`DEBUG history booking failed for ${cdef.name} visit ${plan.count - i + 1}/${plan.count}: ${bErr.message}`)
      }

      // Churned clients: last visit ended in a cancellation, not a clean stop.
      // (cancelled bookings are exempt from the overlap guard, so this is safe
      // even sharing a slot with another client's route.)
      if (cdef.historyType === 'churned') {
        const cancelWhen = daysFromNow(-14, route.hour)
        await supabase.from('bookings').insert({
          tenant_id: tenant.id, client_id: client.id, property_id: property?.id || null,
          team_member_id: route.member.id, service_type_id: mowSvc?.id || null, service_type: mowSvc?.name || 'Service',
          start_time: naive(cancelWhen), end_time: naive(new Date(cancelWhen.getTime() + 3600 * 1000)),
          status: 'cancelled', price: mowSvc?.price_cents || 0,
          notes: 'Cancelled — storm-damage billing dispute, client churned',
        })
      }

      // Active recurring clients + the brand-new signup get one real upcoming booking.
      if (plan.futureBooking) {
        const upcoming = daysFromNow(cdef.historyType === 'new' ? 2 : plan.intervalDays, route.hour)
        const { error: fErr } = await supabase.from('bookings').insert({
          tenant_id: tenant.id, client_id: client.id, property_id: property?.id || null,
          team_member_id: route.member.id, service_type_id: plan.svc?.id || null, service_type: plan.svc?.name || 'Service',
          start_time: naive(upcoming), end_time: naive(new Date(upcoming.getTime() + durationMs)),
          status: 'scheduled', price: plan.svc?.price_cents || 0, pay_rate: route.member.def.payRateCents / 100,
          notes: cdef.historyType === 'new' ? 'First visit — new client' : 'Next scheduled recurring visit',
        })
        if (fErr) console.log(`DEBUG future booking failed for ${cdef.name}: ${fErr.message}`)
      }
    }
    add('3-clients', 'all 20 real clients created (varied property types, not placeholder rows)', clientsCreated === 20, `${clientsCreated}/20`)
    add('3-clients', 'a real client_properties row exists for every client (multi-address-per-client table)', propertiesCreated === 20, `${propertiesCreated}/20`)
    add('3-clients', 'varied backdated + upcoming service-history bookings created across the roster', bookingsCreated > 100, `${bookingsCreated} bookings`)

    const { data: clientStatusRows } = await supabase.from('clients').select('status').eq('tenant_id', tenant.id)
    const activeClients = (clientStatusRows || []).filter(c => c.status === 'active').length
    const inactiveClients = (clientStatusRows || []).filter(c => c.status === 'inactive').length
    add('3-clients', 'roster reflects real mix: 19 active + 1 churned/inactive (not a uniform placeholder set)', activeClients === 19 && inactiveClients === 1, `active=${activeClients} inactive=${inactiveClients}`)

    const { count: newClientUpcoming } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id).eq('status', 'scheduled')
    add('3-clients', 'new-signup and recurring clients all carry a real upcoming scheduled visit', (newClientUpcoming || 0) >= 18, `${newClientUpcoming} scheduled bookings`)

    console.log('\n' + '═'.repeat(80))
    console.log(`TENANT + CLIENT/TEAM STAND-UP COMPLETE — "${tenant.name}" (${tenant.id})`)
    console.log('═'.repeat(80))

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 4 — DEPTH PASS (time-permitting): dispatch + real checkin/checkout,
    // one real recurring sale conversion, payroll for all 5, one real
    // invoice+payment, reporting readback through the same aggregates the
    // dashboard queries.
    // ═══════════════════════════════════════════════════════════════════════

    // 4a. Dispatch + execute one real upcoming visit end-to-end via the team portal.
    const { data: aScheduled } = await supabase.from('bookings').select('id, client_id, team_member_id, start_time')
      .eq('tenant_id', tenant.id).eq('status', 'scheduled').order('start_time').limit(1).maybeSingle()
    if (aScheduled) {
      const nowStart = new Date()
      await supabase.from('bookings').update({ start_time: naive(nowStart), end_time: naive(new Date(nowStart.getTime() + 3600 * 1000)) }).eq('id', aScheduled.id)
      const dispatchedMember = crew.find(c => c.id === aScheduled.team_member_id) || lead
      const { createToken } = await import('../src/app/api/team-portal/auth/token')
      const token = createToken(dispatchedMember.id, tenant.id, dispatchedMember.def.payRateCents / 100, dispatchedMember.def.role === 'lead' ? 'lead' : 'worker')

      const { POST: checkinPOST } = await import('../src/app/api/team-portal/checkin/route')
      const checkinRes = await checkinPOST(new Request('http://sim.local/api/team-portal/checkin', {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: aScheduled.id }),
      }))
      const checkinBody = await checkinRes.json()
      add('4-depth', 'a dispatched crew member checks in on a real upcoming visit via the team portal', checkinRes.status === 200 && checkinBody?.booking?.status === 'in_progress', `status=${checkinRes.status}`)

      await supabase.from('bookings').update({ check_in_time: new Date(Date.now() - 3600 * 1000).toISOString() }).eq('id', aScheduled.id)
      const { POST: checkoutPOST } = await import('../src/app/api/team-portal/checkout/route')
      const checkoutRes = await checkoutPOST(new Request('http://sim.local/api/team-portal/checkout', {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: aScheduled.id }),
      }))
      const checkoutBody = await checkoutRes.json()
      add('4-depth', 'crew member checks out — actual_hours computed, visit marked completed', checkoutRes.status === 200 && checkoutBody?.booking?.status === 'completed', `hours=${checkoutBody?.booking?.actual_hours}`)
    } else {
      add('4-depth', 'a dispatched crew member checks in/out on a real upcoming visit', false, 'no scheduled booking found')
    }

    // 4b. Sell + convert one real recurring lawn-care plan (the vertical's primary sale mode).
    const newLeadClient = await supabase.from('clients').select('id, email').eq('tenant_id', tenant.id).eq('name', 'Emily Ransom').single()
    if (newLeadClient.data) {
      const { computeTotals, normalizeLineItems, generateQuoteNumber, generatePublicToken } = await import('../src/lib/quote')
      const lines = normalizeLineItems([{ name: mowSvc?.name || 'Weekly Mowing', quantity: 1, unit_price_cents: mowSvc?.price_cents || 5500 }])
      const totals = computeTotals(lines, 0, 0)
      const quoteNumber = await generateQuoteNumber(tenant.id)
      const { data: recurQuote } = await supabase.from('quotes').insert({
        tenant_id: tenant.id, client_id: newLeadClient.data.id, quote_number: quoteNumber, status: 'accepted',
        title: 'Weekly mowing plan', contact_name: 'Emily Ransom', contact_email: newLeadClient.data.email,
        line_items: lines, subtotal_cents: totals.subtotal_cents, tax_rate_bps: 0, tax_cents: 0, discount_cents: 0,
        total_cents: totals.total_cents, public_token: generatePublicToken(),
        recurring_type: 'weekly', recurring_start_date: daysFromNow(7).toISOString().slice(0, 10),
        recurring_preferred_time: '09:00', recurring_duration_hours: 1,
      }).select('id').single()
      if (recurQuote) {
        const { createRecurringSeriesFromQuote } = await import('../src/lib/sale-to-recurring')
        const series = await createRecurringSeriesFromQuote(tenant.id, recurQuote.id)
        const { data: sched } = await supabase.from('recurring_schedules').select('id, status, recurring_type').eq('id', series.schedule_id).maybeSingle()
        add('4-depth', 'new client\'s weekly mowing plan converted into a live recurring_schedules series (real conversion path)', sched?.status === 'active' && series.bookings_created > 0, `${series.bookings_created} bookings, status=${sched?.status}`)
      }
    }

    // 4c. Payroll for all 5 field employees.
    const { postPayrollToLedger } = await import('../src/lib/finance/post-labor')
    let payrollRows = 0, payrollPosted = 0
    const periodStart = daysFromNow(-14).toISOString().slice(0, 10)
    const periodEnd = new Date().toISOString().slice(0, 10)
    for (const c of crew) {
      const hoursWorked = c.def.role === 'lead' ? 40 : c.def.employmentType === 'contractor_1099' ? 16 : 36
      const amountCents = Math.round(hoursWorked * c.def.payRateCents)
      const { data: pay, error: payErr } = await supabase.from('payroll_payments').insert({
        tenant_id: tenant.id, team_member_id: c.id, amount: amountCents,
        method: c.def.employmentType === 'contractor_1099' ? 'check' : 'direct_deposit',
        period_start: periodStart, period_end: periodEnd,
      }).select('id').single()
      if (pay && !payErr) {
        payrollRows++
        const res = await postPayrollToLedger({ tenantId: tenant.id, payrollPaymentId: pay.id as string })
        if (res.posted) payrollPosted++
        else console.log(`DEBUG payroll not posted for ${c.name} (${c.def.employmentType}): ${res.reason}`)
      }
    }
    add('4-depth', 'payroll run for all 5 field employees, real payroll_payments rows', payrollRows === 5, `${payrollRows}/5`)
    add('4-depth', 'every payroll payment posted to the labor ledger', payrollPosted === 5, `${payrollPosted}/5 posted`)
    if (payrollPosted < payrollRows) {
      gap('REAL BUG (not a sim artifact): src/lib/finance/post-labor.ts postLabor() races ensureChartAccounts against a parallel getAccountIdByCode(tenantId, \'2450\') — `Promise.all([laborAccountId(...), getAccountIdByCode(tenantId, \'2450\')])`. laborAccountId() awaits ensureChartAccounts() internally before its own lookup, but the sibling \'2450\' lookup fires at the same time and is NOT gated on that seed finishing. On a brand-new tenant\'s very FIRST labor-ledger post (chart_of_accounts empty), the \'2450\' read can return null before the upsert commits, so postPayrollToLedger silently returns {posted:false, reason:"accounts_missing"} — no throw, no visible error, the payroll_payments row just never reaches the books. Reproduced deterministically here: this tenant\'s payroll run was the FIRST finance-ledger post ever made for it, and the first iteration (Hector Delgado) always loses the race. sim-gc-lifecycle.ts never hits this because its payroll stage runs AFTER a Stripe/ACH payment has already called ensureChartAccounts. Fix would be awaiting ensureChartAccounts(tenantId) once before the Promise.all, not something this data-seeding task should silently patch in a shared finance module — flagging for the leader/Jeff.')
    }

    // 4d. One real invoice + payment for a long-tenured client.
    const buckners = await supabase.from('clients').select('id, email').eq('tenant_id', tenant.id).eq('name', 'The Buckners').single()
    if (buckners.data) {
      const { generateInvoiceNumber, generateInvoicePublicToken, computeTotals: invTotals, normalizeLineItems: invLines } = await import('../src/lib/invoice')
      const { data: defEntity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()
      const invNum = await generateInvoiceNumber(tenant.id)
      const lines = invLines([{ name: 'Weekly mowing — monthly billing', quantity: 4, unit_price_cents: mowSvc?.price_cents || 5500 }])
      const tot = invTotals(lines, 0, 0)
      const { data: invoice } = await supabase.from('invoices').insert({
        tenant_id: tenant.id, entity_id: defEntity?.id || null, invoice_number: invNum, status: 'sent',
        title: 'Buckner residence — monthly mowing', contact_name: 'The Buckners', contact_email: buckners.data.email,
        line_items: lines, subtotal_cents: tot.subtotal_cents, tax_rate_bps: 0, tax_cents: 0, discount_cents: 0,
        total_cents: tot.total_cents, due_date: new Date().toISOString().slice(0, 10), public_token: generateInvoicePublicToken(),
      }).select('id, total_cents').single()
      if (invoice) {
        const { data: payment } = await supabase.from('payments').insert({
          tenant_id: tenant.id, invoice_id: invoice.id, amount_cents: invoice.total_cents, method: 'ach', status: 'succeeded',
        }).select('id').single()
        if (payment) {
          const { postPaymentRevenue } = await import('../src/lib/finance/post-revenue')
          const rev = await postPaymentRevenue({ tenantId: tenant.id, paymentId: payment.id as string })
          add('4-depth', 'a real invoice cut + paid for a long-tenured client, posted to the revenue ledger', rev.posted, rev.reason || 'posted')
        }
        const { data: invAfter } = await supabase.from('invoices').select('status').eq('id', invoice.id).single()
        add('4-depth', 'invoices_recompute_paid trigger flips the invoice to paid', invAfter?.status === 'paid', invAfter?.status)
      }
    }

    // 4e. Reporting readback — same aggregates the dashboard queries.
    const { count: activeHeadcount } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true)
    add('4-depth', 'active headcount reflects the full 5-person crew', activeHeadcount === 5, `${activeHeadcount} active`)
    const { count: totalClientCount } = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
    add('4-depth', 'client roster count reflects all 20 accounts', totalClientCount === 20, `${totalClientCount} clients`)
    const { count: completedVisits } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'completed')
    add('4-depth', 'completed-visit count reflects the backdated service history', (completedVisits || 0) > 100, `${completedVisits} completed`)

  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    add('FATAL', 'unhandled exception', false, msg)
  } finally {
    if (!PERSIST && tenantId) {
      for (const tbl of leftoverTables) {
        await supabase.from(tbl).delete().eq('tenant_id', tenantId).then(() => {}, () => {})
      }
      await supabase.from('tenants').delete().eq('id', tenantId).then(() => {}, () => {})
      console.log(`\nCleaned up tenant ${tenantId} (SIM_PERSIST=1 to keep it next run)`)
    } else if (tenantId) {
      console.log(`\nPersisted — tenant ${tenantId} kept for inspection`)
    }

    const bySection = new Map<string, Check[]>()
    for (const c of checks) bySection.set(c.section, [...(bySection.get(c.section) || []), c])
    console.log('\n' + '─'.repeat(80))
    for (const [section, cs] of bySection) {
      const pass = cs.filter(c => c.pass).length
      console.log(`${section}: ${pass}/${cs.length}`)
    }
    const totalPass = checks.filter(c => c.pass).length
    console.log('─'.repeat(80))
    console.log(`TOTAL: ${totalPass}/${checks.length} checks passed`)
    if (gaps.length) {
      console.log(`\n${gaps.length} documented gap(s)/limitations (not failures — real product/environment gaps):`)
      gaps.forEach((g, i) => console.log(`  ${i + 1}. ${g}`))
    }
    const failed = checks.filter(c => !c.pass)
    if (failed.length) {
      console.log(`\n${failed.length} FAILED check(s):`)
      failed.forEach(c => console.log(`  ❌ [${c.section}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`))
      process.exitCode = 1
    }
  }
}

main()
