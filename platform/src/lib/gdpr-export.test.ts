import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DB layer before importing the module under test.
vi.mock('./supabase', () => ({ supabaseAdmin: { from: vi.fn() } }))

import { supabaseAdmin } from './supabase'
import {
  rowsToCsv,
  buildManifestText,
  collectGdprExport,
  type GdprExportBundle,
} from './gdpr-export'

type Row = Record<string, unknown>
type Calls = { eq: unknown[][]; in: unknown[][]; select: unknown[][] }

// A chainable, awaitable stand-in for a Supabase query builder. Every method
// returns the same builder; awaiting it (at any point in the chain) resolves to
// the preset result. Records eq/in/select args for assertions.
function makeBuilder(rows: Row[], calls: Calls) {
  const result = { data: rows, error: null as null | { message: string } }
  const builder: Record<string, unknown> = {
    select: (...a: unknown[]) => (calls.select.push(a), builder),
    eq: (...a: unknown[]) => (calls.eq.push(a), builder),
    in: (...a: unknown[]) => (calls.in.push(a), builder),
    order: () => builder,
    range: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (onF: (v: typeof result) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onF, onR),
  }
  return builder
}

function wireTables(dataByTable: Record<string, Row[]>): Record<string, Calls> {
  const callsByTable: Record<string, Calls> = {}
  vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
    const calls = (callsByTable[table] ||= { eq: [], in: [], select: [] })
    return makeBuilder(dataByTable[table] ?? [], calls)
  }) as unknown as typeof supabaseAdmin.from)
  return callsByTable
}

describe('rowsToCsv', () => {
  it('returns empty string for no rows', () => {
    expect(rowsToCsv([])).toBe('')
  })

  it('serializes simple rows', () => {
    const csv = rowsToCsv([{ a: 1, b: 'x' }, { a: 2, b: 'y' }])
    expect(csv).toBe('a,b\n1,x\n2,y')
  })

  it('uses the union of keys across heterogeneous rows', () => {
    const csv = rowsToCsv([{ a: 1 }, { b: 2 }])
    // header is union a,b; missing cells are empty
    expect(csv).toBe('a,b\n1,\n,2')
  })

  it('JSON-stringifies object and array values', () => {
    const csv = rowsToCsv([{ meta: { k: 1 }, tags: ['x', 'y'] }])
    // JSON contains commas/quotes → quoted and inner quotes doubled
    expect(csv).toBe('meta,tags\n"{""k"":1}","[""x"",""y""]"')
  })

  it('renders null and undefined as empty cells', () => {
    const csv = rowsToCsv([{ a: null, b: undefined, c: 0 }])
    expect(csv).toBe('a,b,c\n,,0')
  })

  it('neutralizes CSV formula injection', () => {
    const csv = rowsToCsv([{ note: '=SUM(A1:A2)' }])
    expect(csv).toBe("note\n'=SUM(A1:A2)")
  })

  it('quotes values containing commas, quotes, and newlines', () => {
    const csv = rowsToCsv([{ v: 'a,b' }, { v: 'he said "hi"' }, { v: 'line1\nline2' }])
    expect(csv).toBe('v\n"a,b"\n"he said ""hi"""\n"line1\nline2"')
  })
})

describe('buildManifestText', () => {
  const base: GdprExportBundle = {
    generated_at: '2026-07-12T10:00:00.000Z',
    tenant_id: 't1',
    client_id: null,
    counts: { bookings: 3, invoices: 2, communications: 5, notes: 1 },
    sections: { bookings: [], invoices: [], communications: [], notes: [] },
  }

  it('describes a full-tenant export', () => {
    const txt = buildManifestText(base)
    expect(txt).toContain('all customers (full tenant)')
    expect(txt).toContain('bookings.csv        (3 rows)')
    expect(txt).toContain('Tenant:    t1')
  })

  it('describes a single-client export', () => {
    const txt = buildManifestText({ ...base, client_id: 'c9' })
    expect(txt).toContain('client c9')
  })
})

describe('collectGdprExport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('collects and tenant-scopes a full-tenant export', async () => {
    const calls = wireTables({
      bookings: [{ id: 'b1' }, { id: 'b2' }],
      invoices: [{ id: 'i1' }],
      client_sms_messages: [{ id: 's1', body: 'hi' }],
      comhub_messages: [{ id: 'm1', body: 'yo' }],
      booking_notes: [{ id: 'bn1' }],
      clients: [{ id: 'c1' }, { id: 'c2' }],
      crm_notes: [{ id: 'cn1' }],
    })

    const bundle = await collectGdprExport('t1', null, '2026-07-12T00:00:00.000Z')

    expect(bundle.tenant_id).toBe('t1')
    expect(bundle.client_id).toBeNull()
    expect(bundle.counts).toEqual({ bookings: 2, invoices: 1, communications: 2, notes: 2 })

    // communications merges sms + comhub with source tags
    const comm = bundle.sections.communications
    expect(comm.map(r => r._source).sort()).toEqual(['comhub', 'sms'])

    // notes merges booking_notes + crm_notes
    expect(bundle.sections.notes.map(r => r._source).sort()).toEqual(['booking_note', 'crm_note'])

    // every primary table filtered on tenant_id
    for (const t of ['bookings', 'invoices', 'client_sms_messages', 'comhub_messages', 'booking_notes']) {
      expect(calls[t].eq).toContainEqual(['tenant_id', 't1'])
    }
    // crm_notes has no tenant_id column → scoped via subject_id ∈ tenant clients
    expect(calls.crm_notes.eq).toContainEqual(['subject_type', 'client'])
    expect(calls.crm_notes.in).toContainEqual(['subject_id', ['c1', 'c2']])
  })

  it('scopes every section to a single client and resolves the comhub chain', async () => {
    const clientId = '11111111-1111-1111-1111-111111111111'
    const calls = wireTables({
      bookings: [{ id: 'b1' }],
      invoices: [],
      client_sms_messages: [{ id: 's1' }],
      comhub_contacts: [{ id: 'ct1' }],
      comhub_threads: [{ id: 'th1' }],
      comhub_messages: [{ id: 'm1' }],
      booking_notes: [{ id: 'bn1' }],
      crm_notes: [{ id: 'cn1' }],
    })

    const bundle = await collectGdprExport('t1', clientId, '2026-07-12T00:00:00.000Z')

    expect(bundle.client_id).toBe(clientId)
    expect(bundle.counts.communications).toBe(2) // sms + comhub

    // client filter applied on the direct tables
    expect(calls.bookings.eq).toContainEqual(['client_id', clientId])
    expect(calls.invoices.eq).toContainEqual(['client_id', clientId])
    expect(calls.client_sms_messages.eq).toContainEqual(['client_id', clientId])

    // comhub chain: contacts by client → threads by contact → messages by thread
    expect(calls.comhub_contacts.eq).toContainEqual(['client_id', clientId])
    expect(calls.comhub_threads.in).toContainEqual(['contact_id', ['ct1']])
    expect(calls.comhub_messages.in).toContainEqual(['thread_id', ['th1']])

    // booking_notes scoped to the client's booking ids; crm_notes to the client
    expect(calls.booking_notes.in).toContainEqual(['booking_id', ['b1']])
    expect(calls.crm_notes.in).toContainEqual(['subject_id', [clientId]])

    // clients table is NOT queried for the id list in single-client mode
    expect(calls.clients).toBeUndefined()
  })

  it('skips the comhub message query when the client has no contacts', async () => {
    const clientId = '22222222-2222-2222-2222-222222222222'
    const calls = wireTables({
      bookings: [],
      invoices: [],
      client_sms_messages: [],
      comhub_contacts: [],
      booking_notes: [],
      crm_notes: [],
    })

    const bundle = await collectGdprExport('t1', clientId, '2026-07-12T00:00:00.000Z')

    expect(bundle.counts.communications).toBe(0)
    expect(calls.comhub_messages).toBeUndefined()
    expect(calls.comhub_threads).toBeUndefined()
  })

  it('throws with a labeled message when a query errors', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      (() => ({
        select: function () { return this },
        eq: function () { return this },
        in: function () { return this },
        order: function () { return this },
        range: function () { return this },
        then: (onF: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'boom' } }).then(onF),
      })) as unknown as typeof supabaseAdmin.from
    )

    await expect(collectGdprExport('t1', null, 'now')).rejects.toThrow(/gdpr-export bookings: boom/)
  })
})
