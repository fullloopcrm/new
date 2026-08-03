import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * /api/dashboard/section-visibility — per-tenant Loop dashboard row on/off state.
 *
 * Read-merge-write against tenants.setup_progress (same jsonb column + pattern
 * as /api/settings/page-config): a PUT for one section must not clobber other
 * unrelated setup_progress keys (onboarding progress, per-page config, etc.),
 * and must reject unknown section keys / non-boolean `hidden` before touching
 * the DB. Permission is gated the same way /api/settings does (settings.edit).
 */

const TENANT_ID = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'owner' })),
  }
})

const requirePermissionMock = vi.fn(async () => ({
  tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'owner', userId: 'u1' },
  error: null,
}))
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...args: unknown[]) => requirePermissionMock(...args) }))

import { GET, PUT, VALID_SECTIONS } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'owner', userId: 'u1' },
    error: null,
  }))
  h = createTenantDbHarness({
    tenants: [{ id: TENANT_ID, setup_progress: { onboarding_step: 3, __page_config_finance: { sort: 'date' } } }],
  })
  holder.from = h.from
})

function putReq(body: unknown) {
  return new Request('http://t/api/dashboard/section-visibility', { method: 'PUT', body: JSON.stringify(body) })
}

describe('GET /api/dashboard/section-visibility', () => {
  it('returns an empty hidden list when none has ever been set', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hidden: [] })
  })

  it('returns the persisted hidden list', async () => {
    h.seed.tenants[0].setup_progress.dashboard_hidden_sections = ['sales', 'kpis']
    const res = await GET()
    expect((await res.json()).hidden).toEqual(['sales', 'kpis'])
  })
})

describe('PUT /api/dashboard/section-visibility', () => {
  it('rejects an unknown section', async () => {
    const res = await PUT(putReq({ section: 'not_a_real_section', hidden: true }))
    expect(res.status).toBe(400)
  })

  it('rejects a non-boolean hidden value', async () => {
    const res = await PUT(putReq({ section: 'sales', hidden: 'yes' }))
    expect(res.status).toBe(400)
  })

  it('turning a section off adds it to the array WITHOUT clobbering unrelated setup_progress keys', async () => {
    const res = await PUT(putReq({ section: 'sales', hidden: true }))
    expect(res.status).toBe(200)
    expect((await res.json()).hidden).toEqual(['sales'])

    const row = h.seed.tenants[0]
    expect(row.setup_progress.dashboard_hidden_sections).toEqual(['sales'])
    // Read-merge-write proof: sibling keys already on the jsonb column survive.
    expect(row.setup_progress.onboarding_step).toBe(3)
    expect(row.setup_progress.__page_config_finance).toEqual({ sort: 'date' })
  })

  it('turning a section back on removes only that key', async () => {
    h.seed.tenants[0].setup_progress.dashboard_hidden_sections = ['sales', 'kpis']
    const res = await PUT(putReq({ section: 'sales', hidden: false }))
    expect(res.status).toBe(200)
    expect((await res.json()).hidden).toEqual(['kpis'])
  })

  it('is idempotent — hiding an already-hidden section does not duplicate it', async () => {
    h.seed.tenants[0].setup_progress.dashboard_hidden_sections = ['sales']
    await PUT(putReq({ section: 'sales', hidden: true }))
    expect(h.seed.tenants[0].setup_progress.dashboard_hidden_sections).toEqual(['sales'])
  })

  it('every SectionVisibility key in the dashboard page is a VALID_SECTIONS entry', () => {
    // Guards against page.tsx and route.ts drifting apart (a typo'd `section`
    // prop would silently 400 forever with no visible error to the tenant).
    expect(VALID_SECTIONS).toEqual(['revenue', 'sales', 'jobs', 'jobs_by_month', 'kpis', 'today_tomorrow'])
  })

  it('is blocked when the caller lacks settings.edit permission', async () => {
    const { NextResponse } = await import('next/server')
    requirePermissionMock.mockImplementation(async () => ({
      tenant: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }))
    const res = await PUT(putReq({ section: 'sales', hidden: true }))
    expect(res.status).toBe(403)
    expect(h.capture.updates).toHaveLength(0)
  })
})
