/**
 * Migrate The NYC Maid (single-tenant) → fullloop (multi-tenant) as tenant #1.
 *
 * SAFETY:
 *   - Read-only against nycmaid. Only writes to fullloop.
 *   - Idempotent — re-running won't duplicate (uses original UUIDs).
 *   - Has a --dry-run flag that shows counts without writing.
 *   - Honors a MIGRATION_CUTOFF timestamp (defaults to now) so you can run it
 *     once for the bulk copy, then again later to copy only the delta.
 *
 * USAGE:
 *   pnpm tsx scripts/migrate-from-nycmaid.ts --dry-run
 *   pnpm tsx scripts/migrate-from-nycmaid.ts            (writes for real)
 *   pnpm tsx scripts/migrate-from-nycmaid.ts --verify   (counts only, no copy)
 *
 * REQUIRED ENV (use .env.local):
 *   FULLLOOP_SUPABASE_URL
 *   FULLLOOP_SUPABASE_SERVICE_ROLE_KEY
 *   NYCMAID_SUPABASE_URL
 *   NYCMAID_SUPABASE_SERVICE_ROLE_KEY
 *   NYCMAID_RESEND_KEY  (optional — pre-fills tenant)
 *   NYCMAID_TELNYX_KEY  (optional)
 *   NYCMAID_TELNYX_PHONE (optional)
 *
 * Mapping notes:
 *   - nycmaid `cleaners` → fullloop `team_members` (status='active')
 *   - nycmaid `bookings.cleaner_id` → fullloop `bookings.team_member_id`
 *   - nycmaid `bookings.suggested_cleaner_id` → fullloop `bookings.suggested_team_member_id`
 *   - All UUIDs preserved 1:1 — easier to verify and roll back.
 */
import { createClient } from '@supabase/supabase-js'

// ─── Config ─────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const VERIFY_ONLY = process.argv.includes('--verify')
const CUTOFF = process.env.MIGRATION_CUTOFF || new Date().toISOString()
const TENANT_NAME = 'The NYC Maid'
const TENANT_SLUG = 'the-nyc-maid'

const fullloop = createClient(
  process.env.FULLLOOP_SUPABASE_URL!,
  process.env.FULLLOOP_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const nycmaid = createClient(
  process.env.NYCMAID_SUPABASE_URL!,
  process.env.NYCMAID_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg: string) {
  const prefix = DRY_RUN ? '[DRY-RUN]' : VERIFY_ONLY ? '[VERIFY]' : '[MIGRATE]'
  console.log(`${prefix} ${msg}`)
}

async function fetchAll<T>(table: string, query: (q: ReturnType<typeof nycmaid.from>) => unknown): Promise<T[]> {
  const all: T[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const q = (query(nycmaid.from(table)) as ReturnType<ReturnType<typeof nycmaid.from>['select']>).range(from, from + PAGE - 1)
    const { data, error } = await q
    if (error) throw new Error(`fetchAll ${table}: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function upsertBatch(table: string, rows: Record<string, unknown>[], conflictKey = 'id') {
  if (rows.length === 0) return
  if (DRY_RUN || VERIFY_ONLY) {
    log(`would upsert ${rows.length} rows into ${table}`)
    return
  }
  const PAGE = 500
  for (let i = 0; i < rows.length; i += PAGE) {
    const batch = rows.slice(i, i + PAGE)
    const { error } = await fullloop.from(table).upsert(batch, { onConflict: conflictKey })
    if (error) throw new Error(`upsert ${table} [${i}-${i + batch.length}]: ${error.message}`)
    log(`  ${table}: ${i + batch.length}/${rows.length}`)
  }
}

// ─── Step 1 — Tenant ────────────────────────────────────────────────────────

async function ensureTenant(): Promise<string> {
  const { data: existing } = await fullloop
    .from('tenants').select('id, name').eq('slug', TENANT_SLUG).maybeSingle()
  if (existing) {
    log(`tenant ${TENANT_SLUG} already exists: ${existing.id}`)
    return existing.id as string
  }
  if (VERIFY_ONLY) {
    throw new Error(`Tenant ${TENANT_SLUG} not found — verify mode requires it to exist`)
  }
  if (DRY_RUN) {
    log(`would create tenant ${TENANT_SLUG}`)
    return '(dry-run-tenant-id)'
  }
  const { data: created, error } = await fullloop.from('tenants').insert({
    name: TENANT_NAME,
    slug: TENANT_SLUG,
    domain: 'thenewyorkcitymaid.com',
    phone: '2122028400',
    email: 'hi@thenycmaid.com',
    address: 'New York, NY',
    timezone: 'America/New_York',
    currency: 'USD',
    industry: 'cleaning',
    status: 'active',
    resend_api_key: process.env.NYCMAID_RESEND_KEY || null,
    telnyx_api_key: process.env.NYCMAID_TELNYX_KEY || null,
    telnyx_phone: process.env.NYCMAID_TELNYX_PHONE || null,
    business_hours: '8am-8pm',
    payment_methods: ['zelle', 'stripe', 'venmo', 'cashapp'],
    zelle_email: 'hi@thenycmaid.com',
    selena_config: {
      ai_name: 'Selena',
      tone: 'warm',
      emoji: 'one_per_message',
      language: 'bilingual',
      pricing_tiers: [
        { label: 'We bring supplies', price: 75 },
        { label: 'You provide supplies', price: 59 },
      ],
      emergency_rate: 100,
      emergency_available: true,
      service_areas: ['Manhattan', 'Brooklyn', 'Queens', 'NJ Hudson', 'West Long Island'],
      arrival_buffer_weekday: 30,
      arrival_buffer_weekend: 60,
      cancellation_policy: 'First-time bookings cannot be cancelled or rescheduled. Recurring requires 7 days notice.',
      payment_methods: ['Zelle', 'Stripe', 'Venmo', 'CashApp'],
      payment_timing: '30 minutes before service completion',
      escalation_phone: '2122028400',
    },
  }).select('id').single()
  if (error) throw new Error(`create tenant: ${error.message}`)
  log(`✓ created tenant ${TENANT_SLUG}: ${created.id}`)
  return created.id as string
}

// ─── Step 2 — Map cleaners → team_members ───────────────────────────────────

interface NycCleaner {
  id: string; name: string; phone?: string; email?: string; pin?: string;
  pay_rate?: number; hourly_rate?: number; status?: string; active?: boolean;
  push_subscription?: unknown; preferred_language?: string; created_at?: string; updated_at?: string;
  stripe_account_id?: string; sms_consent?: boolean; labor_only?: boolean;
  home_latitude?: number; home_longitude?: number; home_by_time?: string;
}

async function migrateTeamMembers(tenantId: string) {
  log('--- team_members ---')
  const cleaners = await fetchAll<Record<string, unknown>>('cleaners', q => q.select('*').lte('created_at', CUTOFF))
  log(`fetched ${cleaners.length} cleaners`)
  const rows = cleaners.map(c => ({
    id: c.id,
    tenant_id: tenantId,
    name: c.name,
    email: c.email || null,
    phone: c.phone || null,
    pin: c.pin || null,
    role: 'worker',
    status: c.active === false || c.status === 'inactive' ? 'inactive' : 'active',
    hourly_rate: c.hourly_rate ?? null,
    pay_rate: c.pay_rate ?? null,
    push_subscription: c.push_subscription ?? null,
    preferred_language: c.preferred_language || 'en',
    stripe_account_id: c.stripe_account_id || null,
    sms_consent: c.sms_consent !== false,
    labor_only: c.labor_only || false,
    photo_url: c.photo_url || null,
    address: c.address || null,
    calendar_color: c.calendar_color || null,
    priority: c.priority ?? 0,
    schedule: c.schedule ?? null,
    unavailable_dates: c.unavailable_dates ?? null,
    working_days: c.working_days ?? null,
    working_start: c.working_start || null,
    working_end: c.working_end || null,
    max_jobs_per_day: c.max_jobs_per_day ?? null,
    notification_preferences: c.notification_preferences ?? null,
    has_car: c.has_car ?? null,
    max_travel_minutes: c.max_travel_minutes ?? null,
    home_latitude: c.home_latitude ?? null,
    home_longitude: c.home_longitude ?? null,
    home_by_time: c.home_by_time || null,
    notes: c.notes || null,
    service_zones: c.service_zones ?? null,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  }))
  await upsertBatch('team_members', rows)
}

// ─── Step 3 — Clients ───────────────────────────────────────────────────────

function isTestClient(c: Record<string, unknown>): boolean {
  const name = (c.name as string | null)?.toLowerCase() || ''
  const email = (c.email as string | null)?.toLowerCase() || ''
  const phone = (c.phone as string | null) || ''
  return (
    name.includes('selena-test') || email.includes('selena-test') ||
    phone.startsWith('email-test') || phone.startsWith('web-') ||
    email.endsWith('@e.com') || email.endsWith('@example.com') ||
    name === 'anon'
  )
}

async function migrateClients(tenantId: string) {
  log('--- clients ---')
  const allClients = await fetchAll<Record<string, unknown>>('clients', q => q.select('*').lte('created_at', CUTOFF))
  const clients = allClients.filter(c => !isTestClient(c))
  const skipped = allClients.length - clients.length
  log(`fetched ${allClients.length} clients (skipped ${skipped} test entries)`)
  const rows = clients.map(c => ({
    id: c.id,
    tenant_id: tenantId,
    name: c.name,
    email: c.email || null,
    phone: c.phone || null,
    address: c.address || null,
    address_line1: c.address_line1 || null,
    address_line2: c.address_line2 || null,
    city: c.city || null,
    state: c.state || null,
    zip: c.zip || null,
    unit: c.unit || null,
    notes: c.notes || null,
    special_instructions: c.special_instructions || null,
    source: c.source || null,
    referral_code: c.referral_code || null,
    referrer_id: c.referrer_id || null,
    email_opt_in: c.email_opt_in !== false,
    sms_opt_in: c.sms_opt_in !== false,
    sms_consent: c.sms_consent !== false,
    email_marketing_opt_out: c.email_marketing_opt_out || false,
    email_marketing_opted_out_at: c.email_marketing_opted_out_at || null,
    sms_marketing_opt_out: c.sms_marketing_opt_out || false,
    sms_marketing_opted_out_at: c.sms_marketing_opted_out_at || null,
    last_outreach_at: c.last_outreach_at || null,
    outreach_status: c.outreach_status || null,
    status: c.status || (c.active === false ? 'inactive' : 'active'),
    pin: c.pin || null,
    do_not_service: c.do_not_service || false,
    apology_credit_pct: c.apology_credit_pct || null,
    apology_credit_reason: c.apology_credit_reason || null,
    apology_credit_at: c.apology_credit_at || null,
    pet_name: c.pet_name || null,
    pet_type: c.pet_type || null,
    outreach_count: c.outreach_count || 0,
    selena_memory_summary: c.selena_memory ? String(c.selena_memory).slice(0, 5000) : null,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  }))
  await upsertBatch('clients', rows)
}

// ─── Step 4 — Recurring schedules ───────────────────────────────────────────

async function migrateRecurringSchedules(tenantId: string) {
  log('--- recurring_schedules ---')
  const rows = await fetchAll<Record<string, unknown>>('recurring_schedules', q => q.select('*').lte('created_at', CUTOFF))
  log(`fetched ${rows.length} recurring_schedules`)
  const mapped = rows.map(r => ({
    id: r.id,
    tenant_id: tenantId,
    client_id: r.client_id,
    team_member_id: r.cleaner_id || null,
    service_type_id: r.service_type_id || null,
    recurring_type: r.recurring_type,
    day_of_week: r.day_of_week ?? null,
    preferred_time: r.preferred_time || null,
    duration_hours: r.duration_hours ?? 3,
    hourly_rate: r.hourly_rate ?? null,
    pay_rate: r.pay_rate ?? r.cleaner_pay_rate ?? null,
    notes: r.notes || null,
    special_instructions: r.special_instructions || null,
    status: r.status || 'active',
    paused_until: r.paused_until || null,
    next_generate_after: r.next_generate_after || null,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: r.updated_at || new Date().toISOString(),
  }))
  await upsertBatch('recurring_schedules', mapped)
}

// ─── Step 5 — Bookings ──────────────────────────────────────────────────────

async function migrateBookings(tenantId: string) {
  log('--- bookings ---')
  const allRows = await fetchAll<Record<string, unknown>>('bookings', q => q.select('*').lte('created_at', CUTOFF))

  // Drop bookings whose client_id is no longer present in fullloop (e.g. test clients we filtered)
  const validClients = new Set<string>()
  const { data: cs } = await fullloop.from('clients').select('id').eq('tenant_id', tenantId)
  for (const c of cs || []) validClients.add(c.id as string)
  const rows = allRows.filter(r => !r.client_id || validClients.has(r.client_id as string))
  const skippedTest = allRows.length - rows.length
  log(`fetched ${allRows.length} bookings (skipped ${skippedTest} tied to filtered test clients)`)
  const mapped = rows.map(r => ({
    id: r.id,
    tenant_id: tenantId,
    client_id: r.client_id || null,
    team_member_id: r.cleaner_id || null,
    suggested_team_member_id: r.suggested_cleaner_id || null,
    schedule_id: r.schedule_id || null,
    service_type_id: r.service_type_id || null,
    service_type: r.service_type || null,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status || 'scheduled',
    price: r.price ?? 0,
    hourly_rate: r.hourly_rate ?? null,
    pay_rate: r.pay_rate ?? null,
    recurring_type: r.recurring_type || null,
    notes: r.notes || null,
    special_instructions: r.special_instructions || null,
    check_in_time: r.check_in_time || null,
    check_out_time: r.check_out_time || null,
    check_in_lat: r.check_in_lat ?? null,
    check_in_lng: r.check_in_lng ?? null,
    check_out_lat: r.check_out_lat ?? null,
    check_out_lng: r.check_out_lng ?? null,
    check_in_location: r.check_in_location ?? null,
    check_out_location: r.check_out_location ?? null,
    worker_token: r.worker_token || null,
    token_expires_at: r.token_expires_at || null,
    payment_status: r.payment_status || 'unpaid',
    payment_method: r.payment_method || null,
    payment_date: r.payment_date || null,
    payment_sender_name: r.payment_sender_name || null,
    payment_reminder_sent_at: r.payment_reminder_sent_at || null,
    partial_payment_cents: r.partial_payment_cents ?? null,
    fifteen_min_alert_time: r.fifteen_min_alert_time || null,
    tip_amount: r.tip_amount ?? 0,
    actual_hours: r.actual_hours ?? null,
    team_member_pay: r.cleaner_pay ?? null,
    team_member_paid: r.cleaner_paid ?? false,
    team_member_paid_at: r.cleaner_paid_at ?? null,
    suggested_reason: r.suggested_reason || null,
    attributed_at: r.attributed_at || null,
    attributed_domain: r.attributed_domain || null,
    attribution_confidence: r.attribution_confidence ?? null,
    team_member_token: r.cleaner_token || null,
    final_video_url: r.final_video_url || null,
    final_video_url_uploaded_at: r.final_video_url_uploaded_at || null,
    walkthrough_video_url: r.walkthrough_video_url || null,
    walkthrough_video_url_uploaded_at: r.walkthrough_video_url_uploaded_at || null,
    ref_code: r.ref_code || null,
    referrer_id: r.referrer_id || null,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: r.updated_at || new Date().toISOString(),
  }))
  await upsertBatch('bookings', mapped)
}

// ─── Step 6 — SMS Conversations + Messages ──────────────────────────────────

async function migrateSmsConversations(tenantId: string) {
  log('--- sms_conversations ---')
  const allConvos = await fetchAll<Record<string, unknown>>('sms_conversations', q => q.select('*').lte('created_at', CUTOFF))

  // Only skip convos that are CLEARLY test:
  //   - name explicitly says "test selena-test+..." or "anon"
  //   - or email matches the selena-test pattern
  // Do NOT use phone='web-...' here — that's the legit web-chat placeholder.
  const isTestConvo = (c: Record<string, unknown>) => {
    const name = (c.name as string | null)?.toLowerCase() || ''
    const email = (c.email as string | null)?.toLowerCase() || ''
    const phone = (c.phone as string | null) || ''
    return name.includes('selena-test') || email.includes('selena-test') ||
           email.endsWith('@e.com') || email.endsWith('@example.com') ||
           name === 'anon' || phone.startsWith('email-test')
  }
  const convos = allConvos.filter(c => !isTestConvo(c))
  const skipped = allConvos.length - convos.length
  log(`fetched ${allConvos.length} sms_conversations (skipped ${skipped} test convos)`)

  // Load valid client + booking IDs to NULL out orphaned FK references
  const validClients = new Set<string>()
  const validBookings = new Set<string>()
  {
    const { data: cs } = await fullloop.from('clients').select('id').eq('tenant_id', tenantId)
    for (const c of cs || []) validClients.add(c.id as string)
    const { data: bs } = await fullloop.from('bookings').select('id').eq('tenant_id', tenantId)
    for (const b of bs || []) validBookings.add(b.id as string)
  }

  let orphanedClient = 0
  let orphanedBooking = 0
  const mapped = convos.map(c => {
    const cid = c.client_id as string | null
    const bid = c.booking_id as string | null
    if (cid && !validClients.has(cid)) orphanedClient++
    if (bid && !validBookings.has(bid)) orphanedBooking++
    return {
      id: c.id,
      tenant_id: tenantId,
      client_id: cid && validClients.has(cid) ? cid : null,
      booking_id: bid && validBookings.has(bid) ? bid : null,
      phone: c.phone || null,
      name: c.name || null,
      state: c.state || null,
      status: c.status || null,
      expired: c.expired ?? false,
      completed_at: c.completed_at || null,
      last_message_at: c.last_message_at || null,
      booking_checklist: c.booking_checklist || null,
      quality_score: c.quality_score ?? null,
      quality_issues: c.quality_issues || null,
      outcome: c.outcome || null,
      summary: c.summary || null,
      preferred_date: c.preferred_date || null,
      preferred_time: c.preferred_time || null,
      service_type: c.service_type || null,
      bedrooms: c.bedrooms || null,
      bathrooms: c.bathrooms || null,
      hourly_rate: c.hourly_rate ?? null,
      address: c.address || null,
      email: c.email || null,
      pricing_choice: c.pricing_choice || null,
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
    }
  })
  if (orphanedClient || orphanedBooking) {
    log(`  nulled ${orphanedClient} orphan client_ids, ${orphanedBooking} orphan booking_ids`)
  }
  await upsertBatch('sms_conversations', mapped)

  log('--- sms_conversation_messages ---')
  const validConvoIds = new Set(convos.map(c => c.id as string))
  const allMsgs = await fetchAll<Record<string, unknown>>('sms_conversation_messages', q => q.select('*').lte('created_at', CUTOFF))
  const msgs = allMsgs.filter(m => validConvoIds.has(m.conversation_id as string))
  const skippedMsgs = allMsgs.length - msgs.length
  log(`fetched ${allMsgs.length} sms_conversation_messages (skipped ${skippedMsgs} for filtered convos)`)
  const msgsMapped = msgs.map(m => ({
    id: m.id,
    conversation_id: m.conversation_id,
    direction: m.direction,
    message: m.message,
    created_at: m.created_at || new Date().toISOString(),
  }))
  await upsertBatch('sms_conversation_messages', msgsMapped)
}

// ─── Step 7 — Selena memory ─────────────────────────────────────────────────

async function migrateSelenaMemory(tenantId: string) {
  log('--- selena_memory ---')
  const rows = await fetchAll<Record<string, unknown>>('selena_memory', q => q.select('*').lte('created_at', CUTOFF))
  log(`fetched ${rows.length} selena_memory`)
  const validClients = new Set<string>()
  const { data: cs } = await fullloop.from('clients').select('id').eq('tenant_id', tenantId)
  for (const c of cs || []) validClients.add(c.id as string)

  let orphans = 0
  const mapped = rows.map(r => {
    const cid = r.client_id as string | null
    if (cid && !validClients.has(cid)) orphans++
    return {
      id: r.id,
      tenant_id: tenantId,
      client_id: cid && validClients.has(cid) ? cid : null,
      type: r.type,
      content: r.content,
      source: r.source || null,
      created_at: r.created_at || new Date().toISOString(),
    }
  })
  if (orphans) log(`  nulled ${orphans} orphan client_ids`)
  await upsertBatch('selena_memory', mapped)
}

// ─── Step 8 — Verify ────────────────────────────────────────────────────────

async function verify(tenantId: string) {
  log('=== VERIFICATION ===')
  const tables = [
    ['clients', 'clients'],
    ['cleaners', 'team_members'],
    ['recurring_schedules', 'recurring_schedules'],
    ['bookings', 'bookings'],
    ['sms_conversations', 'sms_conversations'],
    ['sms_conversation_messages', 'sms_conversation_messages'],
    ['selena_memory', 'selena_memory'],
  ]
  // Get this tenant's conversation IDs so we can scope the messages count
  const { data: convoIds } = await fullloop.from('sms_conversations').select('id').eq('tenant_id', tenantId)
  const idSet = (convoIds || []).map(c => c.id as string)

  // Build the set of nycmaid test-client IDs so we can subtract them from the source counts
  const { data: testClientRows } = await nycmaid.from('clients').select('id, name, email, phone')
  const testClientIds = new Set<string>()
  for (const c of testClientRows || []) {
    if (isTestClient(c as Record<string, unknown>)) testClientIds.add(c.id as string)
  }

  let mismatches = 0
  for (const [src, dst] of tables) {
    let srcCount: number | null
    if (src === 'clients') {
      const r = await nycmaid.from(src).select('*', { count: 'exact', head: true }).lte('created_at', CUTOFF)
      srcCount = (r.count || 0) - testClientIds.size
    } else if (src === 'bookings' || src === 'sms_conversations' || src === 'selena_memory') {
      // Total minus the rows tied to test clients (avoid NULL pitfall in NOT IN)
      const r = await nycmaid.from(src).select('*', { count: 'exact', head: true }).lte('created_at', CUTOFF)
      let testRowCount = 0
      if (testClientIds.size > 0) {
        const r2 = await nycmaid.from(src).select('*', { count: 'exact', head: true })
          .lte('created_at', CUTOFF)
          .in('client_id', [...testClientIds])
        testRowCount = r2.count || 0
      }
      srcCount = (r.count || 0) - testRowCount
    } else {
      const r = await nycmaid.from(src).select('*', { count: 'exact', head: true }).lte('created_at', CUTOFF)
      srcCount = r.count
    }
    let dstCount: number | null
    if (dst === 'sms_conversation_messages') {
      // chunk to avoid 414 URL too long with hundreds of convo ids
      let total = 0
      for (let i = 0; i < idSet.length; i += 100) {
        const chunk = idSet.slice(i, i + 100)
        const r = await fullloop.from(dst).select('*', { count: 'exact', head: true }).in('conversation_id', chunk)
        total += r.count || 0
      }
      dstCount = total
    } else {
      const r = await fullloop.from(dst).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
      dstCount = r.count
    }
    const match = srcCount === dstCount ? '✓' : '✗'
    if (srcCount !== dstCount) mismatches++
    log(`  ${match} ${src}→${dst}: ${srcCount} → ${dstCount}`)
  }
  if (mismatches === 0) {
    log('=== ALL COUNTS MATCH ===')
  } else {
    log(`=== ${mismatches} MISMATCH(ES) — DO NOT CUT OVER ===`)
    process.exit(1)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  log(`cutoff: ${CUTOFF}`)
  log(`mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : VERIFY_ONLY ? 'VERIFY (no writes)' : 'LIVE (writes!)'}`)
  log('')

  const tenantId = await ensureTenant()

  if (!VERIFY_ONLY) {
    await migrateClients(tenantId)
    await migrateTeamMembers(tenantId)
    await migrateRecurringSchedules(tenantId)
    await migrateBookings(tenantId)
    await migrateSmsConversations(tenantId)
    await migrateSelenaMemory(tenantId)
  }

  await verify(tenantId)

  log('')
  log('Done. If counts matched, the data copy is faithful.')
  log('NOTHING ELSE has changed — no webhooks point at fullloop yet.')
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
