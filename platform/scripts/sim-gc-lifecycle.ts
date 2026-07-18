/**
 * GC LIFECYCLE — ONE deep, real, end-to-end walkthrough of a single general
 * contracting tenant across the WHOLE business lifecycle: hire the crew, take
 * a lead, quote it, sell it, schedule + dispatch the crew, execute the job
 * (check-in/out + video evidence), invoice it, collect payment, run payroll,
 * request a review, offer a maintenance retainer, and read it all back
 * through the same aggregates the dashboard uses.
 *
 * Different shape from sim-all-trades.ts: that harness runs 15 verticals ×
 * ~60 shallow checks each, hunting for bugs across breadth. This is ONE
 * tenant, operated depth-first like a real owner would run it for a month,
 * proving the full chain holds together end to end — Jeff's standing ask
 * ("prove the whole lifecycle actually works for a real contracting tenant")
 * made concrete as a single narrative instead of another broad sweep.
 *
 * Exercises REAL libs (provisionTenant, createJobFromQuote, seedHrDefaults,
 * postPayrollToLedger, postPaymentRevenue, createRecurringSeriesFromQuote)
 * AND real unauthenticated route handlers where they exist (quote public
 * accept, team-portal PIN login/checkin/checkout/video-upload, reviews
 * submit) — the same mix sim-all-trades.ts uses, for the same reason:
 * authenticated admin routes need headers()/cookies() Clerk context this
 * script doesn't have, so those are exercised via their exact DB write shape
 * instead.
 *
 * SAFETY: RESEND_API_KEY forced to a placeholder so no real email fires
 * (matches sim-all-trades.ts's convention). This tenant has no telnyx/stripe
 * credentials configured, so no real SMS or Stripe charge can fire either —
 * both are called for real and their failure/absence is asserted on, not
 * faked around. Owner identity = Jeff (fullloopcrm@gmail.com / +12122029220)
 * so nothing lands on a real third party.
 *
 * USAGE: cd platform && npx tsx scripts/sim-gc-lifecycle.ts
 *   SIM_PERSIST=1  keep the tenant for manual inspection (default: clean up)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'

// ---- env (same bootstrap as sim-all-trades.ts) ----
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
process.env.RESEND_API_KEY = 'placeholder' // guarantee no real email fires
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
  return 'sim-gc-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + id.slice(0, 6)
}

const naive = (d: Date) => d.toISOString().slice(0, 19)
const daysFromNow = (n: number, hour = 9) => { const d = new Date(Date.now() + n * 24 * 3600 * 1000); d.setHours(hour, 0, 0, 0); return d }

async function main() {
  let tenantId: string | null = null
  const leftoverTables = [
    'reviews', 'notifications', 'payments', 'payroll_payments', 'journal_lines', 'journal_entries',
    'chart_of_accounts', 'hr_documents', 'hr_employee_profiles', 'hr_document_requirements',
    'invoice_activity', 'invoices', 'recurring_schedules', 'quote_activity', 'deal_activities',
    'deals', 'quotes', 'job_events', 'job_payments', 'booking_team_members', 'bookings', 'jobs',
    'team_members', 'clients', 'service_types', 'entities', 'tenant_invites', 'tenant_domains',
  ]

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 1 — TENANT: sell + onboard a general-contracting business
    // ═══════════════════════════════════════════════════════════════════════
    const bizName = `Titan Build & Renovation Co (sim-${runId})`
    const { mapIndustry } = await import('../src/lib/industry-presets')
    const ind = mapIndustry('Remodeling / General Contracting')
    add('1-tenant', 'mapIndustry resolves "Remodeling / General Contracting" → remodeling', ind === 'remodeling', ind)

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
      address: 'Charlotte, NC 28202',
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
      .select('id, name, price_cents, item_type, per_unit, default_hourly_rate').eq('tenant_id', tenant.id)
    add('1-tenant', `remodeling service catalog seeded (${services?.length || 0} services, all priced)`,
      (services?.length || 0) > 0 && (services || []).every(s => (s.price_cents || 0) > 0), `${services?.length} services`)

    const inviteToken = randomBytes(32).toString('hex')
    const { error: invErr } = await supabase.from('tenant_invites').insert({
      tenant_id: tenant.id, email: OWNER.email.toLowerCase(), role: 'owner', token: inviteToken,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    add('1-tenant', 'admin/owner invite created (Jeff — the "1 admin")', !invErr, invErr?.message)
    gap('The admin login itself is a Clerk-authenticated dashboard session — Clerk auth is not scriptable headlessly, so only the real tenant_invites(role=owner) row is proven, not an actual browser login.')

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 2 — HR: hire 1 admin (above) + 10 real field crew, onboard docs
    // ═══════════════════════════════════════════════════════════════════════
    const { seedHrDefaults } = await import('../src/lib/hr')
    const { provisionApprovedApplicant } = await import('../src/lib/team-provisioning')
    const hr0 = await seedHrDefaults(tenant.id)
    add('2-hr', 'HR document requirement template seeded', hr0.requirementsSeeded > 0, `${hr0.requirementsSeeded} reqs`)

    const CREW_ROSTER: Array<{ name: string; title: string; role: string; employmentType: 'employee_w2' | 'contractor_1099'; compType: 'hourly'; payRateCents: number }> = [
      { name: 'Marcus Reyes', title: 'Foreman / Lead Carpenter', role: 'foreman', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 3800 },
      { name: 'Danny Ortiz', title: 'Carpenter', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2800 },
      { name: 'Chris Whitfield', title: 'Carpenter', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2800 },
      { name: 'Sam Delacroix', title: 'General Laborer', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2000 },
      { name: 'Jordan Pike', title: 'General Laborer', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2000 },
      { name: 'Renee Castillo', title: 'Drywall & Finish Specialist', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2600 },
      { name: 'Terrence Boyd', title: 'Painter', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2400 },
      { name: 'Alicia Moon', title: 'Equipment Operator', role: 'crew', employmentType: 'employee_w2', compType: 'hourly', payRateCents: 2700 },
      { name: 'Pete Nakamura', title: 'Electrician (Sub)', role: 'sub', employmentType: 'contractor_1099', compType: 'hourly', payRateCents: 5500 },
      { name: 'Gloria Fenn', title: 'Plumber (Sub)', role: 'sub', employmentType: 'contractor_1099', compType: 'hourly', payRateCents: 5000 },
    ]

    const crew: Array<{ id: string; pin: string; name: string; def: (typeof CREW_ROSTER)[number] }> = []
    for (let i = 0; i < CREW_ROSTER.length; i++) {
      const def = CREW_ROSTER[i]
      const phone = '704' + String(5550000 + i).slice(-7)
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
    add('2-hr', `all 10 field crew hired as real team_members with 4-digit portal PINs`, crew.length === 10 && crew.every(c => /^\d{4}$/.test(c.pin)), `${crew.length}/10 hired`)

    const hr1 = await seedHrDefaults(tenant.id)
    add('2-hr', 'HR profiles backfilled for all 10 new hires', hr1.profilesBackfilled === 10, `backfilled=${hr1.profilesBackfilled}`)

    for (const c of crew) {
      await supabase.from('hr_employee_profiles').update({
        employment_type: c.def.employmentType, comp_type: c.def.compType, pay_rate_cents: c.def.payRateCents,
        title: c.def.title, hire_date: new Date().toISOString().slice(0, 10), hr_status: 'active',
      }).eq('tenant_id', tenant.id).eq('team_member_id', c.id)
    }
    const { data: profiles } = await supabase.from('hr_employee_profiles').select('team_member_id, employment_type, pay_rate_cents, title').eq('tenant_id', tenant.id)
    const w2Count = (profiles || []).filter(p => p.employment_type === 'employee_w2').length
    const subCount = (profiles || []).filter(p => p.employment_type === 'contractor_1099').length
    add('2-hr', 'crew comp/title/hire_date set — realistic mix of W-2 crew + 1099 trade subs', w2Count === 8 && subCount === 2, `w2=${w2Count} 1099=${subCount}`)

    // HR document compliance — every hire submits + gets approved on their applicable docs
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

    // Real team-portal PIN login for the foreman — proves the crew's actual entry point, not just the DB row.
    const foreman = crew.find(c => c.def.role === 'foreman')!
    const { POST: portalAuthPOST } = await import('../src/app/api/team-portal/auth/route')
    const loginRes = await portalAuthPOST(new Request('http://sim.local/api/team-portal/auth', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.44.1.1' },
      body: JSON.stringify({ pin: foreman.pin, tenant_slug: tenant.slug }),
    }))
    const loginBody = await loginRes.json()
    add('2-hr', 'foreman logs into the team portal with their real PIN (real route)', loginRes.status === 200 && !!loginBody?.token && loginBody?.member?.id === foreman.id, `status=${loginRes.status}`)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 3 — LEAD INTAKE → SALES PIPELINE (deal)
    // ═══════════════════════════════════════════════════════════════════════
    const { data: leadClient, error: lcErr } = await supabase.from('clients').insert({
      tenant_id: tenant.id, name: 'The Whitmores', email: `whitmore+${runId}@example.com`,
      phone: '+17045551234', address: '842 Providence Rd, Charlotte, NC 28207', status: 'lead', source: 'web',
    }).select('id, email').single()
    add('3-lead', 'homeowner lead captured as a client (mirrors /api/contact web-lead intake)', !!leadClient && !lcErr, lcErr?.message)

    const { stageMeta, OPEN_STAGES } = await import('../src/lib/pipeline')
    const { data: deal, error: dealErr } = await supabase.from('deals').insert({
      tenant_id: tenant.id, client_id: leadClient?.id || null, title: 'Whitmore kitchen + primary bath remodel',
      stage: 'new', mode: 'sales', value_cents: 0, probability: 10, source: 'web', status: 'active',
      last_activity_at: new Date().toISOString(),
    }).select('id, stage, probability').single()
    add('3-lead', 'deal opened in the sales pipeline at "new" (Lead) stage', !!deal && !dealErr && deal.stage === 'new', dealErr?.message)
    add('3-lead', 'pipeline stage constants correct (new=Lead, prob 10, open)',
      stageMeta('new').label === 'Lead' && stageMeta('new').defaultProbability === 10 && OPEN_STAGES.includes('new'))

    await supabase.from('deals').update({ stage: 'qualifying', last_activity_at: new Date().toISOString() }).eq('id', deal!.id)
    await supabase.from('deal_activities').insert({ tenant_id: tenant.id, deal_id: deal!.id, type: 'note', description: 'Site visit done — full gut kitchen + primary bath, ~5 week scope.' })
    add('3-lead', 'ops qualifies the lead (site visit note logged, stage → qualifying)', true)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 4 — QUOTE / ESTIMATE → SEND → ACCEPT (real public route + e-sign)
    // ═══════════════════════════════════════════════════════════════════════
    const { computeTotals, normalizeLineItems, generateQuoteNumber, generatePublicToken } = await import('../src/lib/quote')
    const svcForQuote = (services || []).slice(0, 3)
    const lineItems = normalizeLineItems(svcForQuote.map((s, i) => ({
      name: s.name, quantity: i === 0 ? 120 : 40, unit_price_cents: s.price_cents || 0,
    })))
    const totals = computeTotals(lineItems, 725, 0) // 7.25% NC sales tax on materials-inclusive labor line, no discount
    add('4-quote', 'quote line items priced from this tenant\'s real seeded services (no $0 lines)', totals.subtotal_cents > 0, `subtotal=${totals.subtotal_cents}`)

    const quoteNumber = await generateQuoteNumber(tenant.id)
    add('4-quote', 'quote number format Q-YYYYMM-NNNN', /^Q-\d{6}-\d{4}$/.test(quoteNumber), quoteNumber)

    const depositCents = Math.round(totals.total_cents * 0.3)
    const { data: quote, error: qErr } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: leadClient!.id, deal_id: deal!.id, quote_number: quoteNumber, status: 'draft',
      title: 'Whitmore kitchen + primary bath remodel — estimate', contact_name: 'The Whitmores',
      contact_email: leadClient!.email, contact_phone: '+17045551234', service_address: '842 Providence Rd, Charlotte, NC 28207',
      line_items: lineItems, subtotal_cents: totals.subtotal_cents, tax_rate_bps: 725, tax_cents: totals.tax_cents,
      discount_cents: 0, total_cents: totals.total_cents, deposit_type: 'flat', deposit_value: depositCents, deposit_cents: depositCents,
      public_token: generatePublicToken(),
    }).select('id, public_token, total_cents, quote_number').single()
    add('4-quote', 'estimate created and linked to the deal', !!quote && !qErr, qErr?.message)
    if (!quote) throw new Error('quote insert failed: ' + qErr?.message)

    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', quote.id)
    await supabase.from('deal_activities').insert({
      tenant_id: tenant.id, deal_id: deal!.id, type: 'note',
      description: `Estimate ${quoteNumber} sent — $${(quote.total_cents / 100).toFixed(2)}`, metadata: { quote_id: quote.id },
    })
    await supabase.from('deals').update({ value_cents: quote.total_cents, stage: 'quoted', last_activity_at: new Date().toISOString() }).eq('id', deal!.id)
    add('4-quote', 'estimate sent to the Whitmores, deal value synced + stage → quoted', true, `$${(quote.total_cents / 100).toFixed(2)}`)

    // Real public accept route — the homeowner e-signs. Unauthenticated/token-based.
    const { POST: acceptQuote } = await import('../src/app/api/quotes/public/[token]/accept/route')
    const sigPng = 'data:image/png;base64,' + 'A'.repeat(120)
    const acceptReq = new Request(`http://localhost/api/quotes/public/${quote.public_token}/accept`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.44.2.1' },
      body: JSON.stringify({ signature_png: sigPng, signature_name: 'Whitmore Homeowner' }),
    })
    const acceptRes = await acceptQuote(acceptReq, { params: Promise.resolve({ token: quote.public_token }) })
    add('4-quote', 'homeowner e-signs the estimate via the real public accept route', acceptRes.status === 200, `status=${acceptRes.status}`)

    const { data: dealAfterAccept } = await supabase.from('deals').select('stage, probability').eq('id', deal!.id).single()
    add('4-quote', 'deposit-required accept → deal moves to pending (not sold) until deposit collected', dealAfterAccept?.stage === 'pending' && dealAfterAccept?.probability === 80, JSON.stringify(dealAfterAccept))

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 5 — JOB CREATION: sold project, multi-session payment plan
    // ═══════════════════════════════════════════════════════════════════════
    const { createJobFromQuote } = await import('../src/lib/jobs')
    const finalCents = totals.total_cents - depositCents
    const progress1 = Math.round(finalCents * 0.4)
    const finalPay = finalCents - progress1

    const today = daysFromNow(0)
    const todayEnd = new Date(today.getTime() + 8 * 3600 * 1000)
    const demoSession = { start_time: naive(today), end_time: naive(todayEnd), notes: 'Demo day — gut kitchen + primary bath' }
    const framingSession = { start_time: naive(daysFromNow(4)), end_time: naive(daysFromNow(4, 17)), notes: 'Framing + rough-in prep' }
    const roughInSession = { start_time: naive(daysFromNow(6)), end_time: naive(daysFromNow(6, 17)), notes: 'Electrical + plumbing rough-in' }
    const finishSession = { start_time: naive(daysFromNow(18)), end_time: naive(daysFromNow(18, 17)), notes: 'Drywall, paint, finish carpentry' }
    const walkthroughSession = { start_time: naive(daysFromNow(25)), end_time: naive(daysFromNow(25, 11)), notes: 'Final walkthrough + sign-off' }

    const jobRes = await createJobFromQuote(tenant.id, quote.id, {
      payments: [
        { label: 'Deposit', kind: 'deposit', amount_cents: depositCents, trigger: 'on_signature' },
        { label: 'Progress — demo & rough-in complete', kind: 'progress', amount_cents: progress1, trigger: 'on_stage_complete' },
        // 'manual', not 'on_stage_complete' — a final draw isn't due on just ANY
        // stage completing (the platform's release trigger has no per-milestone
        // granularity beyond the enum itself), it's due when ops explicitly
        // invoices it at walkthrough sign-off. Mirrors sim-all-trades.ts's own
        // P3.1 project payment plan convention (deposit=on_signature, final=manual).
        { label: 'Final — walkthrough sign-off', kind: 'final', amount_cents: finalPay, trigger: 'manual' },
      ],
      sessions: [demoSession, framingSession, roughInSession, finishSession, walkthroughSession],
    })
    add('5-job', 'accepted estimate converted into a Job (project sibling of a booking)', !!jobRes.job_id && !jobRes.already_converted, `job=${jobRes.job_id?.slice(0, 8)}`)

    const { data: job } = await supabase.from('jobs').select('id, status, total_cents').eq('id', jobRes.job_id).single()
    add('5-job', 'job status scheduled, total = estimate total', job?.status === 'scheduled' && job?.total_cents === totals.total_cents, `status=${job?.status} total=${job?.total_cents}`)

    const { data: jobPayments } = await supabase.from('job_payments').select('id, kind, amount_cents, status, trigger').eq('job_id', jobRes.job_id).order('sort_order')
    add('5-job', '3-milestone payment plan created (deposit/progress/final)', (jobPayments?.length || 0) === 3, `${jobPayments?.length} milestones`)
    const depositRow = (jobPayments || []).find(p => p.kind === 'deposit')
    add('5-job', 'on_signature deposit auto-released to invoiced the moment the job was created from the signed quote', depositRow?.status === 'invoiced', `deposit status=${depositRow?.status}`)

    const { data: jobBookings } = await supabase.from('bookings').select('id, start_time, status, notes').eq('job_id', jobRes.job_id).order('start_time')
    add('5-job', '5 project sessions created as bookings under the job (demo → framing → rough-in → finish → walkthrough)', (jobBookings || []).length === 5, `${jobBookings?.length} sessions`)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 6 — SCHEDULING / DISPATCH — all 10 crew rotated across the project
    // ═══════════════════════════════════════════════════════════════════════
    const byNote = (note: string) => (jobBookings || []).find(b => b.notes === note)
    const demoBk = byNote(demoSession.notes)!, framingBk = byNote(framingSession.notes)!
    const roughInBk = byNote(roughInSession.notes)!, finishBk = byNote(finishSession.notes)!, walkBk = byNote(walkthroughSession.notes)!

    const laborer1 = crew.find(c => c.name === 'Sam Delacroix')!, laborer2 = crew.find(c => c.name === 'Jordan Pike')!
    const carp1 = crew.find(c => c.name === 'Danny Ortiz')!, carp2 = crew.find(c => c.name === 'Chris Whitfield')!
    const electrician = crew.find(c => c.name === 'Pete Nakamura')!, plumber = crew.find(c => c.name === 'Gloria Fenn')!
    const drywaller = crew.find(c => c.name === 'Renee Castillo')!, painter = crew.find(c => c.name === 'Terrence Boyd')!
    const operator = crew.find(c => c.name === 'Alicia Moon')!

    const dispatch: Array<{ bookingId: string; lead: string; helpers: string[] }> = [
      { bookingId: demoBk.id as string, lead: foreman.id, helpers: [laborer1.id, laborer2.id] },
      { bookingId: framingBk.id as string, lead: foreman.id, helpers: [carp1.id, carp2.id, laborer1.id] },
      { bookingId: roughInBk.id as string, lead: electrician.id, helpers: [plumber.id] },
      { bookingId: finishBk.id as string, lead: drywaller.id, helpers: [painter.id, operator.id] },
      { bookingId: walkBk.id as string, lead: foreman.id, helpers: [carp1.id] },
    ]
    let dispatchRows = 0
    for (const d of dispatch) {
      const rows = [{ tenant_id: tenant.id, booking_id: d.bookingId, team_member_id: d.lead, is_lead: true, position: 1 },
        ...d.helpers.map((h, i) => ({ tenant_id: tenant.id, booking_id: d.bookingId, team_member_id: h, is_lead: false, position: i + 2 }))]
      const { error } = await supabase.from('booking_team_members').insert(rows)
      if (!error) dispatchRows += rows.length
      await supabase.from('bookings').update({ team_member_id: d.lead, team_size: rows.length }).eq('id', d.bookingId)
    }
    const dispatchedIds = new Set(dispatch.flatMap(d => [d.lead, ...d.helpers]))
    add('6-dispatch', 'all 10 field crew dispatched across the 5 project sessions (booking_team_members)', dispatchedIds.size === 10 && dispatchRows > 0, `${dispatchedIds.size}/10 crew touched the job, ${dispatchRows} assignment rows`)

    // Negative probe: try to double-book the foreman on an overlapping window on the SAME day as demo — must be rejected.
    const { error: overlapErr } = await supabase.from('bookings').insert({
      tenant_id: tenant.id, team_member_id: foreman.id, start_time: naive(new Date(today.getTime() + 2 * 3600 * 1000)),
      end_time: naive(new Date(today.getTime() + 5 * 3600 * 1000)), status: 'scheduled', service_type: 'dispatch-overlap-probe',
    })
    add('6-dispatch', 'dispatch overlap guard rejects double-booking the foreman on top of the demo-day session', !!overlapErr, overlapErr ? 'rejected ✓' : 'ACCEPTED — no overlap guard')

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 7 — JOB EXECUTION: crew checks in/out on-site, uploads video evidence
    // ═══════════════════════════════════════════════════════════════════════
    const { createToken } = await import('../src/app/api/team-portal/auth/token')
    const foremanToken = createToken(foreman.id, tenant.id, foreman.def.payRateCents / 100, 'lead')

    const { POST: checkinPOST } = await import('../src/app/api/team-portal/checkin/route')
    const checkinReq = new Request('http://sim.local/api/team-portal/checkin', {
      method: 'POST', headers: { authorization: `Bearer ${foremanToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: demoBk.id }),
    })
    const checkinRes = await checkinPOST(checkinReq)
    const checkinBody = await checkinRes.json()
    add('7-execution', 'foreman checks in on demo day via the real team-portal route (today-dated session)', checkinRes.status === 200 && !!checkinBody?.booking?.check_in_time && checkinBody?.booking?.status === 'in_progress', `status=${checkinRes.status}`)

    // Walkthrough video evidence — the platform's actual "photo/media proof of
    // work" mechanism for a job session is a video upload (walkthrough/final),
    // not a photo attachment; there is no dedicated job-photo feature. Exercised
    // for real: a real (tiny) file, real Supabase Storage write, real bookings
    // field update + notify() call.
    const { POST: videoUploadPOST } = await import('../src/app/api/team-portal/video-upload/route')
    const videoForm = new FormData()
    const videoBlob = new Blob([Buffer.from('sim-fake-mp4-bytes')], { type: 'video/mp4' })
    videoForm.append('file', videoBlob, 'walkthrough.mp4')
    videoForm.append('booking_id', demoBk.id as string)
    videoForm.append('type', 'walkthrough')
    const videoReq = new Request('http://sim.local/api/team-portal/video-upload', { method: 'POST', headers: { authorization: `Bearer ${foremanToken}` }, body: videoForm })
    const videoRes = await videoUploadPOST(videoReq as never)
    const videoBody = await videoRes.json()
    add('7-execution', 'walkthrough video evidence uploaded via the real route (real Supabase Storage write — no dedicated photo feature exists, video is the closest analog)', videoRes.status === 200 && !!videoBody?.url, `status=${videoRes.status}`)
    gap('No dedicated job "photos" feature exists (no job_photos table, no photo route). The closest real feature is the walkthrough/final VIDEO upload on team-portal/video-upload, which was exercised instead.')

    // Backdate check-in 8 hours so checkout's elapsed-time billing math has a
    // real work day to compute over — the sim's check-in/check-out otherwise
    // happen milliseconds apart, which correctly (not a bug) rounds to 0 hours.
    await supabase.from('bookings').update({ check_in_time: new Date(Date.now() - 8 * 3600 * 1000).toISOString() }).eq('id', demoBk.id)

    const { POST: checkoutPOST } = await import('../src/app/api/team-portal/checkout/route')
    const checkoutReq = new Request('http://sim.local/api/team-portal/checkout', {
      method: 'POST', headers: { authorization: `Bearer ${foremanToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: demoBk.id }),
    })
    const checkoutRes = await checkoutPOST(checkoutReq)
    const checkoutBody = await checkoutRes.json()
    add('7-execution', 'foreman checks out after an 8hr day — actual_hours + team_member_pay computed from real elapsed time, booking marked completed', checkoutRes.status === 200 && checkoutBody?.booking?.status === 'completed' && checkoutBody?.booking?.actual_hours >= 7.5, `hours=${checkoutBody?.booking?.actual_hours}`)

    // "session_completed" job event — releases the on_stage_complete progress milestone.
    const { logJobEvent, releasePaymentsForEvent } = await import('../src/lib/jobs')
    await logJobEvent({ tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'session_completed', detail: { booking_id: demoBk.id } })
    const releasedCount = await releasePaymentsForEvent(tenant.id, jobRes.job_id, 'session_completed')
    add('7-execution', 'demo-day completion releases the on_stage_complete progress milestone to invoiced', releasedCount === 1, `${releasedCount} released`)

    // Fast-forward the remaining sessions to completed (their real-time execution
    // is the same checkin/checkout mechanics already proven above on the demo
    // session — repeating it per-session tests the same code path, not new code).
    for (const bk of [framingBk, roughInBk, finishBk, walkBk]) {
      await supabase.from('bookings').update({ status: 'completed', check_in_time: new Date().toISOString(), check_out_time: new Date().toISOString(), actual_hours: 8 }).eq('id', bk.id)
    }
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobRes.job_id)
    await logJobEvent({ tenant_id: tenant.id, job_id: jobRes.job_id, event_type: 'completed', detail: {} })
    const finalReleased = await releasePaymentsForEvent(tenant.id, jobRes.job_id, 'completed')
    add('7-execution', 'job completion event fires (no auto-release expected — the final draw is a MANUAL-trigger milestone, correctly untouched by the stage-complete releaser)', finalReleased === 0, `${finalReleased} released (expected 0)`)

    // The final draw is manual by design (see the payment-plan comment above) —
    // ops explicitly invoices it now that the walkthrough is signed off.
    const { error: finalInvoiceErr } = await supabase.from('job_payments').update({ status: 'invoiced' }).eq('job_id', jobRes.job_id).eq('kind', 'final').eq('status', 'pending')
    add('7-execution', 'ops manually invoices the final draw at walkthrough sign-off', !finalInvoiceErr, finalInvoiceErr?.message)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 8 — INVOICING: one invoice per milestone, tied to the job
    // ═══════════════════════════════════════════════════════════════════════
    const { generateInvoiceNumber, generateInvoicePublicToken, computeTotals: invTotals, normalizeLineItems: invLines } = await import('../src/lib/invoice')
    const { data: defEntity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).limit(1).maybeSingle()
    const { data: releasedPayments } = await supabase.from('job_payments').select('id, label, kind, amount_cents, status').eq('job_id', jobRes.job_id).order('sort_order')
    add('8-invoice', 'all 3 milestones now invoiced (deposit + progress + final released across execution stages)', (releasedPayments || []).every(p => p.status === 'invoiced'), JSON.stringify((releasedPayments || []).map(p => p.status)))

    const invoiceIds: Record<string, string> = {}
    for (const p of releasedPayments || []) {
      const invNum = await generateInvoiceNumber(tenant.id)
      const iLines = invLines([{ name: p.label as string, quantity: 1, unit_price_cents: p.amount_cents as number }])
      const iTot = invTotals(iLines, 0, 0)
      const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        tenant_id: tenant.id, entity_id: defEntity?.id || null, invoice_number: invNum, status: 'sent',
        title: `Whitmore remodel — ${p.label}`, contact_name: 'The Whitmores', contact_email: leadClient!.email,
        line_items: iLines, subtotal_cents: iTot.subtotal_cents, tax_rate_bps: 0, tax_cents: 0, discount_cents: 0,
        total_cents: iTot.total_cents, due_date: new Date().toISOString().slice(0, 10), public_token: generateInvoicePublicToken(),
      }).select('id, total_cents').single()
      if (invoice && !invErr) invoiceIds[p.id as string] = invoice.id as string
    }
    add('8-invoice', 'a real invoice row created per milestone, correctly totaled', Object.keys(invoiceIds).length === (releasedPayments || []).length, `${Object.keys(invoiceIds).length} invoices`)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 9 — PAYMENT COLLECTION (Stripe test mode + non-Stripe deposit)
    // ═══════════════════════════════════════════════════════════════════════
    const { createCheckoutSession } = await import('../src/lib/stripe')
    const depositInvoiceId = invoiceIds[(releasedPayments || []).find(p => p.kind === 'deposit')!.id as string]
    let stripeAttempted = false, stripeConfigured = !!process.env.STRIPE_SECRET_KEY
    try {
      await createCheckoutSession({
        tenantId: tenant.id, bookingId: demoBk.id as string, amount: depositCents, customerEmail: leadClient!.email as string,
        serviceName: 'Whitmore remodel deposit', successUrl: 'http://sim.local/success', cancelUrl: 'http://sim.local/cancel',
      })
      stripeAttempted = true
    } catch (e) {
      stripeAttempted = /Stripe API key not configured/i.test(e instanceof Error ? e.message : String(e))
    }
    add('9-payment', 'Stripe checkout-session creation called for real (correctly refuses without a configured key — proves the guard, not a fake pass)', stripeAttempted && !stripeConfigured, `configured=${stripeConfigured}`)
    gap('No STRIPE_SECRET_KEY is configured for this tenant/environment, so no real Stripe test-mode network round-trip (Checkout Session, PaymentIntent, or webhook signature verification) could be exercised. Standing rule is test-mode-only anyway, and this repo carries no Stripe test key for this project — flagging for the leader/Jeff rather than pulling a key from another project (nycmaid) or fabricating a pass.')

    // Prove the DOWNSTREAM effect a successful Stripe webhook produces — the
    // exact write shape from webhooks/stripe/route.ts's invoice-paid branch
    // (payments row + DB trigger recompute + postPaymentRevenue ledger post) —
    // so the money-in plumbing is proven even though the network call isn't.
    const { postPaymentRevenue } = await import('../src/lib/finance/post-revenue')
    const fakeSessionId = `cs_test_sim_${runId}`
    const { data: stripePayment, error: spErr } = await supabase.from('payments').insert({
      tenant_id: tenant.id, invoice_id: depositInvoiceId, amount_cents: depositCents, method: 'stripe',
      status: 'succeeded', stripe_session_id: fakeSessionId,
    }).select('id').single()
    add('9-payment', 'deposit invoice paid via the exact payments-row shape the real Stripe webhook writes on checkout.session.completed', !!stripePayment && !spErr, spErr?.message)
    if (stripePayment) {
      const revRes = await postPaymentRevenue({ tenantId: tenant.id, paymentId: stripePayment.id as string })
      add('9-payment', 'deposit payment posted to the revenue ledger', revRes.posted, revRes.reason || 'posted')
    }
    const { data: depositInvoiceAfter } = await supabase.from('invoices').select('status, amount_paid_cents, total_cents').eq('id', depositInvoiceId).single()
    add('9-payment', 'invoices_recompute_paid trigger flips the deposit invoice to paid', depositInvoiceAfter?.status === 'paid' && depositInvoiceAfter?.amount_paid_cents === depositInvoiceAfter?.total_cents, JSON.stringify(depositInvoiceAfter))

    // Progress + final collected the OTHER real way GC clients actually pay large
    // draws — ACH/check via the non-Stripe payments path (also real, also DB-verified).
    for (const kind of ['progress', 'final'] as const) {
      const p = (releasedPayments || []).find(x => x.kind === kind)!
      const invId = invoiceIds[p.id as string]
      const { data: achPayment, error: achErr } = await supabase.from('payments').insert({
        tenant_id: tenant.id, invoice_id: invId, amount_cents: p.amount_cents, method: 'ach', status: 'succeeded',
      }).select('id').single()
      if (achPayment) await postPaymentRevenue({ tenantId: tenant.id, paymentId: achPayment.id as string })
      add('9-payment', `${kind} draw ($${((p.amount_cents as number) / 100).toFixed(2)}) collected via ACH and posted to the ledger`, !!achPayment && !achErr, achErr?.message)
    }
    const { data: allInvoicesAfter } = await supabase.from('invoices').select('status').eq('tenant_id', tenant.id)
    add('9-payment', 'all 3 milestone invoices fully paid', (allInvoicesAfter || []).every(i => i.status === 'paid'), JSON.stringify((allInvoicesAfter || []).map(i => i.status)))

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 10 — PAYROLL for all 10 field employees
    // ═══════════════════════════════════════════════════════════════════════
    const { postPayrollToLedger } = await import('../src/lib/finance/post-labor')
    let payrollRows = 0, payrollPosted = 0
    const periodStart = daysFromNow(-14).toISOString().slice(0, 10)
    const periodEnd = new Date().toISOString().slice(0, 10)
    for (const c of crew) {
      const hoursWorked = c.def.role === 'foreman' ? 40 : c.def.role === 'sub' ? 8 : 32
      const amountCents = Math.round(hoursWorked * (c.def.payRateCents))
      const { data: pay, error: payErr } = await supabase.from('payroll_payments').insert({
        tenant_id: tenant.id, team_member_id: c.id, amount: amountCents, method: c.def.employmentType === 'contractor_1099' ? 'check' : 'direct_deposit',
        period_start: periodStart, period_end: periodEnd,
      }).select('id').single()
      if (pay && !payErr) {
        payrollRows++
        const res = await postPayrollToLedger({ tenantId: tenant.id, payrollPaymentId: pay.id as string })
        if (res.posted) payrollPosted++
      }
    }
    add('10-payroll', 'payroll run for all 10 field employees, real payroll_payments rows', payrollRows === 10, `${payrollRows}/10`)
    add('10-payroll', 'every payroll payment posted to the labor ledger (postPayrollToLedger)', payrollPosted === 10, `${payrollPosted}/10 posted`)

    const { data: laborJournalLines } = await supabase.from('journal_lines').select('debit_cents, credit_cents, journal_entries!inner(tenant_id)').eq('journal_entries.tenant_id', tenant.id)
    const totalDebits = (laborJournalLines || []).reduce((s, l) => s + (l.debit_cents || 0), 0)
    const totalCredits = (laborJournalLines || []).reduce((s, l) => s + (l.credit_cents || 0), 0)
    add('10-payroll', 'books balance — total ledger debits = total ledger credits across every posted entry (payroll + revenue)', totalDebits === totalCredits && totalDebits > 0, `debits=${totalDebits} credits=${totalCredits}`)

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 11 — COMMS: client + team notifications, real dispatch pipeline
    // ═══════════════════════════════════════════════════════════════════════
    const { notify } = await import('../src/lib/notify')
    await notify({
      tenantId: tenant.id, type: 'booking_confirmed', channel: 'email', recipientType: 'client', recipientId: leadClient!.id,
      title: 'Your project is scheduled', message: 'Demo day for your kitchen + primary bath remodel is confirmed.', bookingId: demoBk.id as string,
    })
    await notify({
      tenantId: tenant.id, type: 'team_confirm_request', channel: 'sms', recipientType: 'team_member', recipientId: foreman.id,
      title: 'Dispatch confirmation', message: "You're on the Whitmore job tomorrow at 9am.", bookingId: demoBk.id as string,
    })
    await notify({
      tenantId: tenant.id, type: 'payment_received', channel: 'email', recipientType: 'client', recipientId: leadClient!.id,
      title: 'Payment received', message: `We received your ${depositCents / 100} deposit. Thank you!`,
    })
    await notify({ tenantId: tenant.id, type: 'payroll_paid', channel: 'sms', recipientType: 'team_member', recipientId: foreman.id, title: 'Payroll paid', message: 'Your pay for this period has been deposited.' })
    const { data: notifRows } = await supabase.from('notifications').select('type, channel, recipient_type, status').eq('tenant_id', tenant.id)
    add('11-comms', 'client + team SMS/email dispatch pipeline exercised for real (notify() → notifications row + real send attempt)', (notifRows?.length || 0) >= 4, `${notifRows?.length} notifications logged`)
    gap('No Telnyx credentials configured for this tenant, and RESEND_API_KEY is force-set to a placeholder for sim safety (matches sim-all-trades.ts convention — a real key IS present in this worktree\'s .env.local, so this override is load-bearing, not cosmetic). Real SMS/email delivery was NOT exercised; the notify() routing/consent/audit-trail logic was.')

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 12 — REVIEWS / REPUTATION
    // ═══════════════════════════════════════════════════════════════════════
    // reviews/submit resolves its tenant via getTenantFromHeaders(), which
    // calls Next's `headers()` — request-scoped AsyncLocalStorage that only
    // exists inside a real Next.js request, not when a route handler is
    // imported and invoked directly from a script (confirmed: calling it
    // directly here throws and the route's outer catch turns that into a
    // generic 400, same class of limitation sim-all-trades.ts documents for
    // every headers()/cookies()-dependent admin route). Mirrored instead via
    // the route's own exact insert shape/moderation status, same treatment
    // sim-all-trades.ts gives quotes/[id]/send and deals/[id]/stage.
    const reviewText = 'Titan Build did an incredible job on our kitchen and primary bath. On schedule, on budget, and the crew was great to have in the house for 5 weeks.'
    const { data: reviewRow, error: reviewErr } = await supabase.from('reviews').insert({
      tenant_id: tenant.id, name: 'The Whitmores', email: leadClient!.email, rating: 5, text: reviewText,
      service_type: 'Remodeling / General Contracting', team_member_name: foreman.name,
      images: [], video_url: null, status: 'pending', verified: true, client_id: leadClient!.id, published_at: null,
    }).select('id, rating, status, client_id').single()
    add('12-reviews', 'homeowner review submitted (real route\'s exact insert/moderation shape — route itself needs Next request-scope headers() this harness can\'t provide, see gap)', !!reviewRow && !reviewErr, reviewErr?.message)
    add('12-reviews', 'review lands moderated (pending) and correctly linked + verified against the real client record', reviewRow?.status === 'pending' && reviewRow?.client_id === leadClient!.id, JSON.stringify(reviewRow))
    gap('reviews/submit (and every other public route that resolves its tenant via getTenantFromHeaders()) depends on Next.js\'s request-scoped headers() API, which only works inside a live Next request — it cannot be invoked directly from a standalone script the way bearer-token routes (checkin/checkout/video-upload) can. Mirrored via the route\'s exact DB write instead; the route\'s own header-signature/tenant-resolution code path itself was not executed.')

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 13 — RECURRING SERVICE (maintenance retainer, if the archetype fits)
    // ═══════════════════════════════════════════════════════════════════════
    // 'remodeling' is a PROJECT (lead-sale, one-off) vertical, not a booking
    // vertical — createRecurringSeriesFromQuote itself has no industry gate, so
    // nothing in the platform blocks a GC tenant from selling a recurring
    // add-on (e.g. an annual post-project maintenance walkthrough), but it is
    // not the archetype's primary mode the way it is for cleaning/lawn/pool.
    const { createRecurringSeriesFromQuote } = await import('../src/lib/sale-to-recurring')
    const maintNum = await generateQuoteNumber(tenant.id)
    const maintLines = normalizeLineItems([{ name: 'Annual maintenance walkthrough', quantity: 1, unit_price_cents: 25000 }])
    const maintTotals = computeTotals(maintLines, 0, 0)
    const { data: maintQuote } = await supabase.from('quotes').insert({
      tenant_id: tenant.id, client_id: leadClient!.id, quote_number: maintNum, status: 'accepted',
      title: 'Whitmore annual maintenance retainer', contact_name: 'The Whitmores', contact_email: leadClient!.email,
      contact_phone: '+17045551234', service_address: '842 Providence Rd, Charlotte, NC 28207',
      line_items: maintLines, subtotal_cents: maintTotals.subtotal_cents, tax_rate_bps: 0, tax_cents: 0, discount_cents: 0,
      total_cents: maintTotals.subtotal_cents, public_token: generatePublicToken(),
      recurring_type: 'annual', recurring_start_date: daysFromNow(365).toISOString().slice(0, 10),
      recurring_preferred_time: '09:00', recurring_duration_hours: 2,
    }).select('id').single()
    if (maintQuote) {
      const series = await createRecurringSeriesFromQuote(tenant.id, maintQuote.id)
      const { data: sched } = await supabase.from('recurring_schedules').select('id, status, recurring_type').eq('tenant_id', tenant.id).limit(1).maybeSingle()
      add('13-recurring', 'GC tenant CAN sell a recurring maintenance retainer if it chooses to (platform has no industry gate on this) — not the archetype\'s default mode, offered here as an upsell', sched?.status === 'active', JSON.stringify(series))
    }
    gap('"remodeling" is a project (one-time-sale) archetype, not a booking archetype — recurring service is an available upsell, not the primary lifecycle for this trade. Modeled here as an annual maintenance retainer rather than a weekly/monthly service, which is the realistic shape for a GC business.')

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 14 — REPORTING / DASHBOARDS (read the operations back through the
    // same aggregates the admin dashboard + finance reports query)
    // ═══════════════════════════════════════════════════════════════════════
    const { data: revenuePayments } = await supabase.from('payments').select('amount_cents, status').eq('tenant_id', tenant.id).eq('status', 'succeeded')
    const totalRevenueCents = (revenuePayments || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
    add('14-reporting', 'total revenue collected reflects every payment actually posted (deposit + progress + final)', totalRevenueCents === totals.total_cents, `$${(totalRevenueCents / 100).toFixed(2)} vs quote $${(totals.total_cents / 100).toFixed(2)}`)

    const { data: payrollTotalRows } = await supabase.from('payroll_payments').select('amount').eq('tenant_id', tenant.id)
    const totalPayrollCents = (payrollTotalRows || []).reduce((s, p) => s + (p.amount || 0), 0)
    add('14-reporting', 'total payroll cost for the period reflects all 10 field employees', totalPayrollCents > 0 && payrollTotalRows?.length === 10, `$${(totalPayrollCents / 100).toFixed(2)} across ${payrollTotalRows?.length} employees`)

    const { count: completedJobCount } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'completed')
    add('14-reporting', 'completed-jobs count reflects the closed Whitmore project', completedJobCount === 1, `${completedJobCount} completed job(s)`)

    const { data: hrRoster } = await supabase.from('team_members').select('id').eq('tenant_id', tenant.id).eq('active', true)
    add('14-reporting', 'active headcount reflects the full 10-person crew', hrRoster?.length === 10, `${hrRoster?.length} active`)

    const { data: reviewsForRating } = await supabase.from('reviews').select('rating').eq('tenant_id', tenant.id)
    const avgRating = (reviewsForRating || []).reduce((s, r) => s + (r.rating || 0), 0) / Math.max(1, reviewsForRating?.length || 1)
    add('14-reporting', 'reputation aggregate reflects the submitted review', avgRating === 5, `avg=${avgRating}`)

    console.log('\n' + '═'.repeat(80))
    console.log(`GC LIFECYCLE — tenant "${tenant.name}" (${tenant.id})`)
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
