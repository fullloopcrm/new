/**
 * Import staging — Stage 3. Uploads are STAGED and reviewed before any write to
 * live tables, then committed (with per-row target_id tracking) so the whole
 * batch can be undone. Fixes the old direct-write imports: no more blind writes,
 * no more silent unmatched-skip, and phone is no longer mandatory (email or name
 * is enough to keep a client row).
 *
 * This slice implements CLIENTS end-to-end (stage → review → commit → undo) plus
 * the generic batch scaffolding; schedules reuse the same batch/commit/undo shape.
 */
import { supabaseAdmin } from './supabase'

export type ImportKind = 'clients' | 'schedules' | 'finance'
export type MatchStatus = 'new' | 'matched' | 'duplicate' | 'unmatched' | 'rejected'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s\-+().]{7,20}$/
const digits = (s?: string) => (s || '').replace(/\D/g, '')

export interface StagedRow {
  row_index: number
  raw: Record<string, unknown>
  mapped: Record<string, unknown>
  match_status: MatchStatus
  match_detail?: string
  target_table?: string
}

export interface BatchReview {
  batch: {
    id: string
    kind: ImportKind
    status: string
    source_filename: string | null
    total_rows: number
    committed_rows: number
    created_at: string
  }
  counts: Record<MatchStatus, number>
  rows: Array<StagedRow & { id: string; target_id: string | null }>
}

/** Classify one incoming client row against existing + in-batch keys. No writes. */
function classifyClient(
  raw: Record<string, unknown>,
  existingEmails: Set<string>,
  existingPhones: Set<string>,
): StagedRow {
  const idx = Number(raw.__i ?? 0)
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const phoneRaw = typeof raw.phone === 'string' ? raw.phone.trim() : ''
  const emailRaw = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''

  const base = (status: MatchStatus, detail?: string, mapped: Record<string, unknown> = {}): StagedRow =>
    ({ row_index: idx, raw, mapped, match_status: status, match_detail: detail, target_table: 'clients' })

  if (!name) return base('rejected', 'name is required')
  // Phone no longer mandatory — email or name is enough (the old bug rejected email-only rows).
  if (phoneRaw && !PHONE_RE.test(phoneRaw)) return base('rejected', `invalid phone "${phoneRaw}"`)
  if (emailRaw && !EMAIL_RE.test(emailRaw)) return base('rejected', `invalid email "${emailRaw}"`)
  if (!phoneRaw && !emailRaw) return base('rejected', 'need a phone or email')

  const phone10 = digits(phoneRaw).slice(-10)
  if (emailRaw && existingEmails.has(emailRaw)) return base('duplicate', `email ${emailRaw} already exists`)
  if (phone10.length === 10 && existingPhones.has(phone10)) return base('duplicate', `phone already exists`)

  // Accept — track in-batch so later rows dedupe against this one too.
  if (emailRaw) existingEmails.add(emailRaw)
  if (phone10.length === 10) existingPhones.add(phone10)
  const mapped: Record<string, unknown> = {
    name,
    phone: phoneRaw || null,
    email: emailRaw || null,
    address: typeof raw.address === 'string' && raw.address.trim() ? raw.address.trim() : null,
    source: typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : 'import',
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null,
    status: 'active',
  }
  return base('new', undefined, mapped)
}

/** Stage a client upload into a reviewable batch. NO writes to the clients table. */
export async function stageClientBatch(
  tenantId: string,
  rows: Array<Record<string, unknown>>,
  opts: { filename?: string; mapping?: unknown; createdBy?: string } = {},
): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('clients').select('email, phone').eq('tenant_id', tenantId)
  const emails = new Set((existing || []).map((c) => (c.email as string)?.toLowerCase()).filter(Boolean) as string[])
  const phones = new Set(
    (existing || []).map((c) => digits(c.phone as string).slice(-10)).filter((p) => p.length === 10),
  )

  const staged = rows.map((r, i) => classifyClient({ ...r, __i: i }, emails, phones))

  const { data: batch, error: bErr } = await supabaseAdmin
    .from('import_batches')
    .insert({
      tenant_id: tenantId, kind: 'clients', source_filename: opts.filename ?? null,
      mapping: opts.mapping ?? null, total_rows: rows.length, created_by: opts.createdBy ?? null,
    })
    .select('id')
    .single()
  if (bErr || !batch) throw new Error(`stage batch failed: ${bErr?.message}`)

  const batchId = batch.id as string
  const rowInserts = staged.map((s) => ({
    batch_id: batchId, tenant_id: tenantId, row_index: s.row_index,
    raw: s.raw, mapped: s.mapped, match_status: s.match_status,
    match_detail: s.match_detail ?? null, target_table: s.target_table ?? null,
  }))
  for (let i = 0; i < rowInserts.length; i += 500) {
    const { error } = await supabaseAdmin.from('import_rows').insert(rowInserts.slice(i, i + 500))  // tenant-scope-ok: insert rows carry tenant_id (built above)
    if (error) throw new Error(`stage rows failed: ${error.message}`)
  }
  return batchId
}

const RECURRING = ['weekly', 'biweekly', 'monthly']
const DOW: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}
const priceCents = (s?: string) => {
  const n = parseFloat((s || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/**
 * Stage a schedule upload. Each row must resolve to an ALREADY-IMPORTED client
 * (phone then name) — unmatched rows are held for review, never guessed onto a
 * live calendar. Recurring rows → recurring_schedules; one-time → bookings.
 */
export async function stageScheduleBatch(
  tenantId: string,
  rows: Array<Record<string, unknown>>,
  opts: { filename?: string; mapping?: unknown; createdBy?: string } = {},
): Promise<string> {
  const [{ data: clients }, { data: staff }] = await Promise.all([
    supabaseAdmin.from('clients').select('id, name, phone').eq('tenant_id', tenantId),
    supabaseAdmin.from('team_members').select('id, name').eq('tenant_id', tenantId),
  ])
  const byPhone = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const c of clients || []) {
    const p = digits(c.phone as string)
    if (p.length >= 10) byPhone.set(p.slice(-10), c.id as string)
    if (c.name) byName.set((c.name as string).trim().toLowerCase(), c.id as string)
  }
  const staffByName = new Map<string, string>()
  for (const s of staff || []) if (s.name) staffByName.set((s.name as string).trim().toLowerCase(), s.id as string)

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const staged: StagedRow[] = rows.map((raw, idx) => {
    const clientName = str(raw.client_name)
    const clientPhone = str(raw.client_phone)
    const mk = (status: MatchStatus, detail?: string, mapped: Record<string, unknown> = {}, target?: string): StagedRow =>
      ({ row_index: idx, raw, mapped, match_status: status, match_detail: detail, target_table: target })

    const phone = digits(clientPhone)
    let clientId = phone.length >= 10 ? byPhone.get(phone.slice(-10)) : undefined
    if (!clientId && clientName) clientId = byName.get(clientName.toLowerCase())
    if (!clientId) return mk('unmatched', `no client match for "${clientName || clientPhone || '—'}"`)

    const staffId = str(raw.staff_name) ? staffByName.get(str(raw.staff_name).toLowerCase()) || null : null
    const dur = parseFloat(str(raw.duration_hours)) || 2
    const rt = str(raw.recurring_type).toLowerCase()

    if (rt) {
      if (!RECURRING.includes(rt)) return mk('rejected', 'recurring_type must be weekly/biweekly/monthly')
      const dowRaw = str(raw.day_of_week).toLowerCase()
      const dow = dowRaw in DOW ? DOW[dowRaw] : /^[0-6]$/.test(dowRaw) ? Number(dowRaw) : null
      return mk('matched', undefined, {
        client_id: clientId, team_member_id: staffId, recurring_type: rt, day_of_week: dow,
        preferred_time: str(raw.preferred_time) || null, duration_hours: dur, notes: str(raw.notes) || null, status: 'active',
      }, 'recurring_schedules')
    }
    const startStr = str(raw.start)
    const d = startStr ? new Date(startStr) : null
    if (!d || isNaN(d.getTime())) return mk('rejected', `invalid/missing start date "${startStr}"`)
    const end = new Date(d.getTime() + dur * 3600_000)
    const fmt = (x: Date) => x.toISOString().slice(0, 19)
    return mk('matched', undefined, {
      client_id: clientId, team_member_id: staffId, service_type: str(raw.service_type) || null,
      start_time: fmt(d), end_time: fmt(end), status: 'scheduled', price: priceCents(str(raw.price)),
      team_size: 1, notes: str(raw.notes) || null,
    }, 'bookings')
  })

  const { data: batch, error: bErr } = await supabaseAdmin
    .from('import_batches')
    .insert({ tenant_id: tenantId, kind: 'schedules', source_filename: opts.filename ?? null, mapping: opts.mapping ?? null, total_rows: rows.length, created_by: opts.createdBy ?? null })
    .select('id').single()
  if (bErr || !batch) throw new Error(`stage batch failed: ${bErr?.message}`)
  const batchId = batch.id as string
  const inserts = staged.map((s) => ({
    batch_id: batchId, tenant_id: tenantId, row_index: s.row_index, raw: s.raw, mapped: s.mapped,
    match_status: s.match_status, match_detail: s.match_detail ?? null, target_table: s.target_table ?? null,
  }))
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supabaseAdmin.from('import_rows').insert(inserts.slice(i, i + 500))
    if (error) throw new Error(`stage rows failed: ${error.message}`)
  }
  return batchId
}

/** Review buckets for a staged batch. Read-only. */
export async function getBatchReview(batchId: string): Promise<BatchReview | null> {
  const { data: batch } = await supabaseAdmin.from('import_batches').select('*').eq('id', batchId).single()
  if (!batch) return null
  const { data: rows } = await supabaseAdmin
    .from('import_rows').select('*').eq('batch_id', batchId).order('row_index')

  const counts: Record<MatchStatus, number> = { new: 0, matched: 0, duplicate: 0, unmatched: 0, rejected: 0 }
  for (const r of rows || []) counts[(r.match_status as MatchStatus)] = (counts[(r.match_status as MatchStatus)] || 0) + 1

  return {
    batch: {
      id: batch.id, kind: batch.kind, status: batch.status, source_filename: batch.source_filename,
      total_rows: batch.total_rows, committed_rows: batch.committed_rows, created_at: batch.created_at,
    },
    counts,
    rows: (rows || []).map((r) => ({
      id: r.id, row_index: r.row_index, raw: r.raw, mapped: r.mapped,
      match_status: r.match_status, match_detail: r.match_detail ?? undefined,
      target_table: r.target_table ?? undefined, target_id: r.target_id ?? null,
    })),
  }
}

/** Commit accepted rows to live tables, recording target_id per row for undo. */
export async function commitBatch(batchId: string): Promise<{ committed: number }> {
  // Claim the staged→committed transition atomically, before touching any
  // row. A plain read-then-branch here (the old shape) lets two concurrent
  // commits — a double-click on "Commit Import", or a retried request on a
  // large/slow batch — both read status:'staged' and both loop through
  // inserting every accepted row, since the status flip used to happen only
  // at the very end. Unlike most double-submit bugs in this app there's no
  // DB unique constraint backstop here (clients has none on tenant/email or
  // tenant/phone) and dedup only runs once, at stage time — so a race
  // duplicates the tenant's entire imported client/booking list, not just
  // one row.
  const { data: batch } = await supabaseAdmin
    .from('import_batches')
    .update({ status: 'committed', committed_at: new Date().toISOString() })
    .eq('id', batchId)
    .eq('status', 'staged')
    .select()
    .maybeSingle()
  if (!batch) throw new Error('batch not found or not staged')

  try {
    // Only 'new' (clients) / 'matched' (schedules) rows are written; the rest are held for review.
    const { data: rows } = await supabaseAdmin
      .from('import_rows').select('*').eq('batch_id', batchId).in('match_status', ['new', 'matched'])

    let committed = 0
    for (const r of rows || []) {
      const table = r.target_table as string
      const payload = { ...(r.mapped as Record<string, unknown>), tenant_id: batch.tenant_id }
      const { data: ins, error } = await supabaseAdmin.from(table).insert(payload).select('id').single()
      if (error || !ins) continue // leave uncommitted; row keeps target_id null
      await supabaseAdmin.from('import_rows').update({ target_id: ins.id }).eq('id', r.id)
      committed++
    }

    await supabaseAdmin.from('import_batches')
      .update({ committed_rows: committed })
      .eq('id', batchId)
    return { committed }
  } catch (e) {
    // Release the claim so a genuinely failed commit (not a per-row skip,
    // already handled above) can be retried instead of leaving the batch
    // stuck 'committed' with nothing actually written.
    await supabaseAdmin.from('import_batches')
      .update({ status: 'staged', committed_at: null })
      .eq('id', batchId)
    throw e
  }
}

/** Undo a committed batch — delete every row it wrote, by recorded target_id. */
export async function undoBatch(batchId: string): Promise<{ removed: number }> {
  const { data: batch } = await supabaseAdmin.from('import_batches').select('status').eq('id', batchId).single()
  if (!batch) throw new Error('batch not found')
  if (batch.status !== 'committed') throw new Error(`batch is ${batch.status}, not committed`)

  const { data: rows } = await supabaseAdmin
    .from('import_rows').select('id, target_table, target_id').eq('batch_id', batchId).not('target_id', 'is', null)

  let removed = 0
  for (const r of rows || []) {
    const { error } = await supabaseAdmin.from(r.target_table as string).delete().eq('id', r.target_id)
    if (!error) { await supabaseAdmin.from('import_rows').update({ target_id: null }).eq('id', r.id); removed++ }
  }
  await supabaseAdmin.from('import_batches')
    .update({ status: 'undone', undone_at: new Date().toISOString() })
    .eq('id', batchId)
  return { removed }
}
