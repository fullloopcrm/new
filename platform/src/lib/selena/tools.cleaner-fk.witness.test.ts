import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * assign_cleaner_to_booking / create_manual_booking / block_cleaner_dates
 * (Yinez/Selena owner tools) wrote caller (model-supplied) cleaner_id /
 * client_id FKs verbatim with no ownership check — same dangling-FK /
 * cross-tenant class as the P1/P11/P19/P23 findings in
 * deploy-prep/cross-tenant-leak-register.md. list_bookings embeds
 * `clients(name)` and `cleaners(name, id)` off these exact columns
 * (handleListBookings, tools.ts ~L701), so a foreign id let tenant A's agent
 * read back tenant B's client/cleaner name on the next "list bookings" call —
 * a real read-exfil, not just a dangling reference.
 *
 * This witness proves a foreign-tenant id is rejected (error, no write) and
 * that an own-tenant id still succeeds (CONTROL) for all three tools.
 */

const TENANT_A = 'tenant_a'
const TENANT_B = 'tenant_b'

type Row = Record<string, unknown>

function makeTables() {
  return {
    cleaners: [
      { id: 'cleaner_a', tenant_id: TENANT_A, name: 'Alice A' },
      { id: 'cleaner_b', tenant_id: TENANT_B, name: 'Bob B' },
    ] as Row[],
    clients: [
      { id: 'client_a', tenant_id: TENANT_A, name: 'Client A' },
      { id: 'client_b', tenant_id: TENANT_B, name: 'Client B' },
    ] as Row[],
    bookings: [
      { id: 'booking_a', tenant_id: TENANT_A, cleaner_id: null, client_id: 'client_a', status: 'pending' },
    ] as Row[],
    cleaner_blocks: [] as Row[],
  }
}

let tables: ReturnType<typeof makeTables>

function makeQueryBuilder(table: string) {
  let op: 'select' | 'insert' | 'update' = 'select'
  let filters: [string, unknown][] = []
  let insertRow: Row | null = null
  let updatePatch: Row | null = null

  const rowsFor = () => (tables as Record<string, Row[]>)[table] || ((tables as Record<string, Row[]>)[table] = [])

  const exec = async () => {
    const rows = rowsFor()
    if (op === 'insert') {
      const newRow: Row = { id: `${table}_${rows.length + 1}`, ...insertRow }
      rows.push(newRow)
      return { data: newRow, error: null }
    }
    if (op === 'update') {
      let matched: Row | null = null
      for (const r of rows) {
        if (filters.every(([c, v]) => r[c] === v)) {
          Object.assign(r, updatePatch)
          matched = r
        }
      }
      return { data: matched, error: null }
    }
    const match = rows.find((r) => filters.every(([c, v]) => r[c] === v)) || null
    return { data: match, error: null }
  }

  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters.push([col, val])
      return builder
    },
    insert: (row: Row) => {
      op = 'insert'
      insertRow = row
      return builder
    },
    update: (patch: Row) => {
      op = 'update'
      updatePatch = patch
      return builder
    },
    maybeSingle: () => exec(),
    single: () => exec(),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => exec().then(resolve, reject),
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => makeQueryBuilder(table),
  },
}))

vi.mock('@/lib/selena/agent', () => ({ isOwner: () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))

import { runTool } from './tools'

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

beforeEach(() => {
  tables = makeTables()
})

describe('assign_cleaner_to_booking — foreign cleaner_id rejected before write', () => {
  it('LOCK: cleaner_b (tenant B) is rejected, booking.cleaner_id stays null', async () => {
    const out = await runTool(
      'assign_cleaner_to_booking',
      { booking_id: 'booking_a', cleaner_id: 'cleaner_b' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(tables.bookings[0].cleaner_id).toBeNull()
  })

  it('CONTROL: cleaner_a (own tenant) succeeds and is stamped', async () => {
    const out = await runTool(
      'assign_cleaner_to_booking',
      { booking_id: 'booking_a', cleaner_id: 'cleaner_a' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).ok).toBe(true)
    expect(tables.bookings[0].cleaner_id).toBe('cleaner_a')
    expect(tables.bookings[0].status).toBe('scheduled')
  })
})

describe('create_manual_booking — foreign client_id / cleaner_id rejected before insert', () => {
  const baseArgs = { date: '2026-08-01', time: '9am', service_type: 'Regular cleaning', hourly_rate: 50, estimated_hours: 2 }

  it('LOCK: foreign client_id (tenant B) is rejected, no booking created', async () => {
    const out = await runTool(
      'create_manual_booking',
      { ...baseArgs, client_id: 'client_b' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('client not found')
    expect(tables.bookings.length).toBe(1) // only the seeded booking_a
  })

  it('LOCK: own-tenant client_id but foreign cleaner_id (tenant B) is rejected, no booking created', async () => {
    const out = await runTool(
      'create_manual_booking',
      { ...baseArgs, client_id: 'client_a', cleaner_id: 'cleaner_b' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(tables.bookings.length).toBe(1)
  })

  it('CONTROL: own-tenant client_id + cleaner_id succeed', async () => {
    const out = await runTool(
      'create_manual_booking',
      { ...baseArgs, client_id: 'client_a', cleaner_id: 'cleaner_a' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(tables.bookings.length).toBe(2)
    const created = tables.bookings.find((b) => b.id === parsed.booking_id)
    expect(created?.client_id).toBe('client_a')
    expect(created?.suggested_cleaner_id).toBe('cleaner_a')
  })
})

describe('block_cleaner_dates — foreign cleaner_id rejected before insert', () => {
  it('LOCK: cleaner_b (tenant B) is rejected, no cleaner_blocks row created', async () => {
    const out = await runTool(
      'block_cleaner_dates',
      { cleaner_id: 'cleaner_b', from_date: '2026-08-01', to_date: '2026-08-05' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(tables.cleaner_blocks.length).toBe(0)
  })

  it('CONTROL: cleaner_a (own tenant) succeeds', async () => {
    const out = await runTool(
      'block_cleaner_dates',
      { cleaner_id: 'cleaner_a', from_date: '2026-08-01', to_date: '2026-08-05' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).ok).toBe(true)
    expect(tables.cleaner_blocks.length).toBe(1)
    expect(tables.cleaner_blocks[0].cleaner_id).toBe('cleaner_a')
    expect(tables.cleaner_blocks[0].tenant_id).toBe(TENANT_A)
  })
})
