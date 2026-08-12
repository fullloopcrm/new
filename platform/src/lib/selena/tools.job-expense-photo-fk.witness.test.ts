import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * add_job_expense wrote caller (model-supplied) vendor_id / service_type_id /
 * budget_line_item_id FKs verbatim with no ownership check — same
 * dangling-FK / cross-tenant class as tools.cleaner-fk.witness.test.ts.
 * list_job_expenses embeds `vendors(id,name)` and `service_types(id,name)`
 * off these exact columns (handleListJobExpenses, tools.ts ~L2101-2105), so
 * a foreign id let tenant A's agent read back tenant B's vendor/service-type
 * name on the next "list job expenses" call — a real read-exfil, not just a
 * dangling reference.
 *
 * update_job_photo wrote caller-supplied pair_id verbatim on one side of the
 * pairing (only the reverse-direction write was tenant-scoped), so a foreign
 * pair_id could point tenant A's photo at tenant B's photo row.
 *
 * This witness proves a foreign-tenant id is rejected (error, no write) and
 * that an own-tenant id still succeeds (CONTROL) for both tools.
 */

const TENANT_A = 'tenant_a'
const TENANT_B = 'tenant_b'

type Row = Record<string, unknown>

function makeTables() {
  return {
    jobs: [
      { id: 'job_a', tenant_id: TENANT_A },
    ] as Row[],
    vendors: [
      { id: 'vendor_a', tenant_id: TENANT_A, name: 'Vendor A' },
      { id: 'vendor_b', tenant_id: TENANT_B, name: 'Vendor B' },
    ] as Row[],
    service_types: [
      { id: 'svc_a', tenant_id: TENANT_A, name: 'Service A', category_id: null },
      { id: 'svc_b', tenant_id: TENANT_B, name: 'Service B', category_id: null },
    ] as Row[],
    budget_line_items: [
      { id: 'bli_a', tenant_id: TENANT_A, actual_cents: 0 },
      { id: 'bli_b', tenant_id: TENANT_B, actual_cents: 0 },
    ] as Row[],
    expenses: [] as Row[],
    entities: [
      { id: 'entity_a', tenant_id: TENANT_A, is_default: true },
    ] as Row[],
    audit_logs: [] as Row[],
    job_events: [] as Row[],
    job_photos: [
      { id: 'photo_a1', tenant_id: TENANT_A, job_id: 'job_a', pair_id: null as string | null },
      { id: 'photo_a2', tenant_id: TENANT_A, job_id: 'job_a', pair_id: null as string | null },
      { id: 'photo_b1', tenant_id: TENANT_B, job_id: 'job_b', pair_id: null as string | null },
    ] as Row[],
  }
}

let tables: ReturnType<typeof makeTables>

function makeQueryBuilder(table: string) {
  let op: 'select' | 'insert' | 'update' = 'select'
  let filters: [string, unknown][] = []
  let insertRow: Row | null = null
  let updatePatch: Row | null = null
  let single = false

  const rowsFor = () => (tables as Record<string, Row[]>)[table] || ((tables as Record<string, Row[]>)[table] = [])

  const matches = () => rowsFor().filter((r) => filters.every(([c, v]) => r[c] === v))

  const exec = async () => {
    if (op === 'insert') {
      const rows = rowsFor()
      const newRow: Row = { id: `${table}_${rows.length + 1}`, ...insertRow }
      rows.push(newRow)
      return { data: newRow, error: null }
    }
    if (op === 'update') {
      let matched: Row | null = null
      for (const r of matches()) {
        Object.assign(r, updatePatch)
        matched = r
      }
      return { data: matched, error: null }
    }
    const found = matches()
    if (single) return { data: found[0] || null, error: null }
    return { data: found, error: null }
  }

  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters.push([col, val])
      return builder
    },
    order: () => builder,
    limit: () => builder,
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
    maybeSingle: () => {
      single = true
      return exec()
    },
    single: () => {
      single = true
      return exec()
    },
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => exec().then(resolve, reject),
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => makeQueryBuilder(table),
  },
}))

vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
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

describe('add_job_expense — foreign vendor_id / service_type_id / budget_line_item_id rejected before insert', () => {
  const baseArgs = { job_id: 'job_a', category: 'supplies', amount_dollars: 25 }

  it('LOCK: foreign vendor_id (tenant B) is rejected, no expense created', async () => {
    const out = await runTool(
      'add_job_expense',
      { ...baseArgs, vendor_id: 'vendor_b' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('vendor not found')
    expect(tables.expenses.length).toBe(0)
  })

  it('LOCK: foreign service_type_id (tenant B) is rejected, no expense created', async () => {
    const out = await runTool(
      'add_job_expense',
      { ...baseArgs, service_type_id: 'svc_b' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('service type not found')
    expect(tables.expenses.length).toBe(0)
  })

  it('LOCK: foreign budget_line_item_id (tenant B) is rejected, no expense created', async () => {
    const out = await runTool(
      'add_job_expense',
      { ...baseArgs, budget_line_item_id: 'bli_b' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('budget line item not found')
    expect(tables.expenses.length).toBe(0)
  })

  it('CONTROL: own-tenant vendor_id / service_type_id / budget_line_item_id all succeed', async () => {
    const out = await runTool(
      'add_job_expense',
      { ...baseArgs, vendor_id: 'vendor_a', service_type_id: 'svc_a', budget_line_item_id: 'bli_a' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(tables.expenses.length).toBe(1)
    expect(tables.expenses[0].vendor_id).toBe('vendor_a')
    expect(tables.expenses[0].service_type_id).toBe('svc_a')
    expect(tables.expenses[0].budget_line_item_id).toBe('bli_a')
  })
})

describe('update_job_photo — foreign pair_id rejected before write', () => {
  it('LOCK: pair_id pointing at tenant B photo is rejected, no pair_id written either side', async () => {
    const out = await runTool(
      'update_job_photo',
      { job_id: 'job_a', photo_id: 'photo_a1', pair_id: 'photo_b1' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).error).toBe('pair photo not found')
    expect(tables.job_photos.find((p) => p.id === 'photo_a1')?.pair_id).toBeNull()
    expect(tables.job_photos.find((p) => p.id === 'photo_b1')?.pair_id).toBeNull()
  })

  it('CONTROL: pair_id pointing at own-tenant photo succeeds, both sides linked', async () => {
    const out = await runTool(
      'update_job_photo',
      { job_id: 'job_a', photo_id: 'photo_a1', pair_id: 'photo_a2' },
      'conv_1', 'owner_phone', stubResult(), TENANT_A
    )
    expect(JSON.parse(out).ok).toBe(true)
    expect(tables.job_photos.find((p) => p.id === 'photo_a1')?.pair_id).toBe('photo_a2')
    expect(tables.job_photos.find((p) => p.id === 'photo_a2')?.pair_id).toBe('photo_a1')
  })
})
