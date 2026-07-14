/**
 * GDPR / CCPA customer data export.
 *
 * Collects a tenant's customer data across four domains — bookings, invoices,
 * communications, notes — for a Data Subject Access Request (single client) or
 * a full-tenant compliance export. Everything is tenant-scoped: tables with a
 * `tenant_id` column are filtered on it directly (.eq('tenant_id', ...)); the
 * one table without one (`crm_notes`) is scoped through its FK to `clients`,
 * which is itself tenant-scoped, so no cross-tenant data can leak.
 *
 * Pure serialization (rowsToCsv) is separated from DB collection so it can be
 * unit-tested without a database. csvEscape is reused from finance-export to
 * keep CSV formula-injection neutralization consistent across the codebase.
 */
import { supabaseAdmin } from './supabase'
import { csvEscape } from './finance-export'

// ─── Types ─────────────────────────────────────────────────
export type GdprSection = 'bookings' | 'invoices' | 'communications' | 'notes'

export interface GdprExportBundle {
  generated_at: string
  tenant_id: string
  client_id: string | null
  counts: Record<GdprSection, number>
  sections: Record<GdprSection, Record<string, unknown>[]>
}

type Row = Record<string, unknown>

// Supabase returns at most 1000 rows per request by default; page past it.
const PAGE_SIZE = 1000
// PostgREST `in(...)` lists get unwieldy past a few hundred ids; chunk them.
const IN_CHUNK = 200

// ─── CSV serialization (pure) ──────────────────────────────

/**
 * Serialize heterogeneous rows to CSV. Unlike a fixed-column serializer, the
 * header is the union of every row's keys, so merged sections (e.g. SMS +
 * comhub messages) don't silently drop columns. Object/array values are
 * JSON-stringified; null/undefined become empty cells.
 */
export function rowsToCsv(rows: Row[]): string {
  if (rows.length === 0) return ''
  const keys: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k)
        keys.push(k)
      }
    }
  }
  const header = keys.map(csvEscape).join(',')
  const lines = rows.map(row =>
    keys
      .map(k => {
        const v = row[k]
        if (v === null || v === undefined) return ''
        const cell = typeof v === 'object' ? JSON.stringify(v) : String(v)
        return csvEscape(cell)
      })
      .join(',')
  )
  return [header, ...lines].join('\n')
}

// ─── DB collection ─────────────────────────────────────────

/** Split an array into fixed-size chunks. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

type PageResult = { data: Row[] | null; error: { message: string } | null }

/**
 * Run a paginated query to completion. `run(from, to)` must build a fresh
 * query each call (Supabase builders are single-use) and apply .range(from,to).
 */
async function fetchAll(
  label: string,
  run: (from: number, to: number) => PromiseLike<PageResult>
): Promise<Row[]> {
  const out: Row[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await run(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`gdpr-export ${label}: ${error.message}`)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return out
}

/** All client ids belonging to a tenant (used to scope crm_notes). */
async function tenantClientIds(tenantId: string): Promise<string[]> {
  const rows = await fetchAll('clients', (from, to) =>
    supabaseAdmin.from('clients').select('id').eq('tenant_id', tenantId).range(from, to)
  )
  return rows.map(r => String(r.id))
}

async function collectBookings(tenantId: string, clientId: string | null): Promise<Row[]> {
  return fetchAll('bookings', (from, to) => {
    let q = supabaseAdmin.from('bookings').select('*').eq('tenant_id', tenantId)
    if (clientId) q = q.eq('client_id', clientId)
    return q.order('created_at', { ascending: false }).range(from, to)
  })
}

async function collectInvoices(tenantId: string, clientId: string | null): Promise<Row[]> {
  return fetchAll('invoices', (from, to) => {
    let q = supabaseAdmin.from('invoices').select('*').eq('tenant_id', tenantId)
    if (clientId) q = q.eq('client_id', clientId)
    return q.order('created_at', { ascending: false }).range(from, to)
  })
}

/**
 * Communications = direct client SMS history + comhub message-hub threads.
 * client_sms_messages links to the client directly. comhub_messages links
 * through comhub_contacts (client_id) → comhub_threads (contact_id) →
 * comhub_messages (thread_id); when scoped to one client we resolve that chain
 * first. Rows are tagged with `_source` so a merged CSV stays legible.
 */
async function collectCommunications(tenantId: string, clientId: string | null): Promise<Row[]> {
  const sms = await fetchAll('client_sms_messages', (from, to) => {
    let q = supabaseAdmin.from('client_sms_messages').select('*').eq('tenant_id', tenantId)
    if (clientId) q = q.eq('client_id', clientId)
    return q.order('created_at', { ascending: false }).range(from, to)
  })

  let threadIds: string[] | null = null
  if (clientId) {
    const contacts = await fetchAll('comhub_contacts', (from, to) =>
      supabaseAdmin
        .from('comhub_contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .range(from, to)
    )
    const contactIds = contacts.map(c => String(c.id))
    if (contactIds.length === 0) {
      threadIds = []
    } else {
      const threads: Row[] = []
      for (const ids of chunk(contactIds, IN_CHUNK)) {
        const t = await fetchAll('comhub_threads', (from, to) =>
          supabaseAdmin
            .from('comhub_threads')
            .select('id')
            .eq('tenant_id', tenantId)
            .in('contact_id', ids)
            .range(from, to)
        )
        threads.push(...t)
      }
      threadIds = threads.map(t => String(t.id))
    }
  }

  let comhub: Row[] = []
  if (threadIds === null) {
    // Full-tenant export: every message for the tenant.
    comhub = await fetchAll('comhub_messages', (from, to) =>
      supabaseAdmin
        .from('comhub_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sent_at', { ascending: false })
        .range(from, to)
    )
  } else if (threadIds.length > 0) {
    for (const ids of chunk(threadIds, IN_CHUNK)) {
      const m = await fetchAll('comhub_messages', (from, to) =>
        supabaseAdmin
          .from('comhub_messages')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('thread_id', ids)
          .order('sent_at', { ascending: false })
          .range(from, to)
      )
      comhub.push(...m)
    }
  }

  return [
    ...sms.map(r => ({ _source: 'sms', ...r })),
    ...comhub.map(r => ({ _source: 'comhub', ...r })),
  ]
}

/**
 * Notes = per-booking operational notes + CRM notes about the client.
 * booking_notes are scoped by tenant (and, for a single client, by that
 * client's booking ids). crm_notes has no tenant_id, so it is scoped through
 * subject_id ∈ the tenant's client ids (subject_type = 'client').
 */
async function collectNotes(
  tenantId: string,
  clientId: string | null,
  bookings: Row[]
): Promise<Row[]> {
  // booking_notes
  let bookingNotes: Row[] = []
  if (clientId) {
    const bookingIds = bookings.map(b => String(b.id))
    for (const ids of chunk(bookingIds, IN_CHUNK)) {
      if (ids.length === 0) continue
      const n = await fetchAll('booking_notes', (from, to) =>
        supabaseAdmin
          .from('booking_notes')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('booking_id', ids)
          .range(from, to)
      )
      bookingNotes.push(...n)
    }
  } else {
    bookingNotes = await fetchAll('booking_notes', (from, to) =>
      supabaseAdmin.from('booking_notes').select('*').eq('tenant_id', tenantId).range(from, to)
    )
  }

  // crm_notes (client-subject only)
  const subjectIds = clientId ? [clientId] : await tenantClientIds(tenantId)
  const crmNotes: Row[] = []
  for (const ids of chunk(subjectIds, IN_CHUNK)) {
    if (ids.length === 0) continue
    const n = await fetchAll('crm_notes', (from, to) =>
      supabaseAdmin
        .from('crm_notes')
        .select('*')
        .eq('subject_type', 'client')
        .in('subject_id', ids)
        .range(from, to)
    )
    crmNotes.push(...n)
  }

  return [
    ...bookingNotes.map(r => ({ _source: 'booking_note', ...r })),
    ...crmNotes.map(r => ({ _source: 'crm_note', ...r })),
  ]
}

/**
 * Assemble the full export bundle for a tenant, optionally scoped to a single
 * client. `nowIso` is injected so callers control the timestamp (and tests are
 * deterministic).
 */
export async function collectGdprExport(
  tenantId: string,
  clientId: string | null,
  nowIso: string
): Promise<GdprExportBundle> {
  const bookings = await collectBookings(tenantId, clientId)
  const [invoices, communications, notes] = await Promise.all([
    collectInvoices(tenantId, clientId),
    collectCommunications(tenantId, clientId),
    collectNotes(tenantId, clientId, bookings),
  ])

  const sections: Record<GdprSection, Row[]> = { bookings, invoices, communications, notes }
  return {
    generated_at: nowIso,
    tenant_id: tenantId,
    client_id: clientId,
    counts: {
      bookings: bookings.length,
      invoices: invoices.length,
      communications: communications.length,
      notes: notes.length,
    },
    sections,
  }
}

/** Human-readable manifest for the ZIP bundle. */
export function buildManifestText(bundle: GdprExportBundle): string {
  const scope = bundle.client_id ? `client ${bundle.client_id}` : 'all customers (full tenant)'
  return [
    'GDPR / CCPA Data Export',
    '',
    `Generated: ${bundle.generated_at}`,
    `Tenant:    ${bundle.tenant_id}`,
    `Scope:     ${scope}`,
    '',
    'Contents:',
    `- bookings.csv        (${bundle.counts.bookings} rows)`,
    `- invoices.csv        (${bundle.counts.invoices} rows)`,
    `- communications.csv  (${bundle.counts.communications} rows)`,
    `- notes.csv           (${bundle.counts.notes} rows)`,
    '- export.json         (all sections, machine-readable)',
    '',
  ].join('\n')
}
