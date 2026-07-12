/**
 * Dead-branch regression guard for the GDPR export's crm_notes collection.
 *
 * THE BUG (documented in deploy-prep/gdpr-export-format-spec.md §5.1):
 * collectNotes() queries `crm_notes` with `.eq('subject_type', 'client')`, but
 * migrations/2026_07_01_crm_notes.sql constrains that column to
 * `CHECK (subject_type IN ('lead', 'tenant'))` and the app only ever writes
 * those two values. No row can have subject_type='client', so the crm_note
 * portion of the export's `notes` section is permanently empty.
 *
 * These tests pin that broken reality. The mock below ENFORCES the real CHECK
 * constraint — it only holds rows whose subject_type is CHECK-valid and applies
 * the actual subject_type/subject_id filters the code passes — so it faithfully
 * reproduces the production DB's behavior rather than hand-waving zero rows.
 *
 * If the query's subject_type is corrected (or the branch removed / CHECK
 * widened), the RED test at the bottom starts passing and its `it.fails`
 * wrapper flips to failing — forcing whoever touches it to update this file
 * instead of letting the export silently start (or keep) returning nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabaseAdmin: { from: vi.fn() } }))

import { supabaseAdmin } from './supabase'
import { collectGdprExport } from './gdpr-export'

// The subject_type values the migration's CHECK constraint permits. Mirrored
// here so a drift in either place is caught; 'client' is deliberately absent.
const CHECK_ALLOWED = ['lead', 'tenant'] as const

type Row = Record<string, unknown>
type Calls = { eq: unknown[][]; in: unknown[][] }

// Plain builder for tables we don't need to filter — returns preset rows.
function plainBuilder(rows: Row[]) {
  const result = { data: rows, error: null }
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    in: () => b,
    order: () => b,
    range: () => b,
    maybeSingle: () => Promise.resolve(result),
    then: (onF: (v: typeof result) => unknown) => Promise.resolve(result).then(onF),
  }
  return b
}

// crm_notes builder that behaves like the constrained table: it holds only
// CHECK-valid rows and actually applies the subject_type + subject_id filters,
// so the resolved rows reflect what Postgres would return.
function crmNotesBuilder(rows: Row[], calls: Calls) {
  // Guard the fixture itself: seeding an impossible row would fake the result.
  for (const r of rows) {
    if (!CHECK_ALLOWED.includes(r.subject_type as (typeof CHECK_ALLOWED)[number])) {
      throw new Error(`crm_notes fixture violates CHECK: subject_type=${String(r.subject_type)}`)
    }
  }
  let subjType: unknown
  let ids: unknown[] | undefined
  const b: Record<string, unknown> = {
    select: () => b,
    eq: (...a: unknown[]) => {
      calls.eq.push(a)
      if (a[0] === 'subject_type') subjType = a[1]
      return b
    },
    in: (...a: unknown[]) => {
      calls.in.push(a)
      if (a[0] === 'subject_id') ids = a[1] as unknown[]
      return b
    },
    order: () => b,
    range: () => b,
    then: (onF: (v: { data: Row[]; error: null }) => unknown) => {
      const data = rows.filter(
        r => r.subject_type === subjType && (!ids || ids.includes(r.subject_id))
      )
      return Promise.resolve({ data, error: null }).then(onF)
    },
  }
  return b
}

function wire(dataByTable: Record<string, Row[]>): { crm: Calls } {
  const crm: Calls = { eq: [], in: [] }
  vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
    if (table === 'crm_notes') return crmNotesBuilder(dataByTable.crm_notes ?? [], crm)
    return plainBuilder(dataByTable[table] ?? [])
  }) as unknown as typeof supabaseAdmin.from)
  return { crm }
}

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

beforeEach(() => vi.clearAllMocks())

describe('crm_notes dead branch — CHECK-vs-query mismatch', () => {
  it("'client' is not a CHECK-permitted subject_type", () => {
    // Documents the mismatch at the constant level: the query's value can never
    // satisfy the constraint the migration installs.
    expect(CHECK_ALLOWED).not.toContain('client')
  })

  it('returns 0 crm_note rows against CHECK-valid data (full-tenant export)', async () => {
    const { crm } = wire({
      clients: [{ id: CLIENT_ID }],
      // The only rows the real table can hold — both about this subject.
      crm_notes: [
        { id: 'n1', subject_type: 'lead', subject_id: CLIENT_ID, body: 'lead note' },
        { id: 'n2', subject_type: 'tenant', subject_id: CLIENT_ID, body: 'tenant note' },
      ],
    })

    const bundle = await collectGdprExport('t1', null, '2026-07-12T00:00:00.000Z')

    // Proof of the bug: despite CHECK-valid notes existing for this subject,
    // none reach the export.
    const crmRows = bundle.sections.notes.filter(r => r._source === 'crm_note')
    expect(crmRows).toHaveLength(0)
    expect(bundle.counts.notes).toBe(0)

    // ...and it's specifically because the code asked for the forbidden value.
    expect(crm.eq).toContainEqual(['subject_type', 'client'])
  })

  it('returns 0 crm_note rows in single-client (DSAR) mode too', async () => {
    const { crm } = wire({
      bookings: [],
      invoices: [],
      client_sms_messages: [],
      comhub_contacts: [],
      booking_notes: [],
      crm_notes: [{ id: 'n1', subject_type: 'lead', subject_id: CLIENT_ID }],
    })

    const bundle = await collectGdprExport('t1', CLIENT_ID, '2026-07-12T00:00:00.000Z')

    expect(bundle.sections.notes.filter(r => r._source === 'crm_note')).toHaveLength(0)
    // scoped to the client's id, but still filtered on the impossible type
    expect(crm.eq).toContainEqual(['subject_type', 'client'])
    expect(crm.in).toContainEqual(['subject_id', [CLIENT_ID]])
  })

  // RED: encodes the desired-but-unmet behavior. Today it throws (0 crm rows),
  // so `it.fails` keeps the suite green while flagging the defect. When the
  // query is corrected / branch fixed so a CHECK-valid note about the client
  // flows through, the body passes → `it.fails` FAILS → this test must be
  // rewritten as a normal `it(...)`. That is the anti-silent-regression latch.
  it.fails('RED: a CHECK-valid crm_note about the client should appear in the export', async () => {
    wire({
      bookings: [],
      invoices: [],
      client_sms_messages: [],
      comhub_contacts: [],
      booking_notes: [],
      crm_notes: [{ id: 'n1', subject_type: 'lead', subject_id: CLIENT_ID, body: 'about the client' }],
    })

    const bundle = await collectGdprExport('t1', CLIENT_ID, '2026-07-12T00:00:00.000Z')

    // Desired: the note surfaces. Broken today → this assertion throws.
    expect(bundle.sections.notes.some(r => r._source === 'crm_note')).toBe(true)
  })
})
