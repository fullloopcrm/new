import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/PUT /api/admin/comhub/voice/settings — first route-level regression
 * test (P1/W1 O13 sweep). Per-admin softphone settings (ring strategy,
 * caller-id mode, recording/transcription toggles) had zero coverage.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
  adminId: 'admin-A1' as string | null,
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  adminId: string | null
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))
vi.mock('@/lib/admin-member', () => ({ getActiveAdminMemberId: async () => h.adminId }))

import { GET, PUT } from './route'

const DEFAULT_SETTINGS = {
  ring_strategy: 'browser_then_cell',
  caller_id_mode: 'show_customer',
  auto_record: true,
  auto_transcribe: true,
  fallback_cell_phone: null,
  do_not_disturb_until: null,
}

const putReq = (body: unknown) => new NextRequest('http://x', { method: 'PUT', body: JSON.stringify(body) })
const putReqRaw = (raw: string) => new NextRequest('http://x', { method: 'PUT', body: raw })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.adminId = 'admin-A1'
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = { comhub_admin_voice_settings: [] }
})

describe('GET /api/admin/comhub/voice/settings — permission gate', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const res = await GET()

    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/comhub/voice/settings — defaults', () => {
  it('returns DEFAULT_SETTINGS when there is no active admin member', async () => {
    h.adminId = null

    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ settings: DEFAULT_SETTINGS })
  })

  it('returns DEFAULT_SETTINGS when the admin has no saved settings row yet', async () => {
    const res = await GET()

    await expect(res.json()).resolves.toEqual({ settings: DEFAULT_SETTINGS })
  })

  it("returns the admin's own saved settings row when one exists", async () => {
    h.store.comhub_admin_voice_settings.push({
      admin_id: 'admin-A1',
      tenant_id: 'tenant-A',
      ring_strategy: 'cell_only',
      caller_id_mode: 'show_business',
      auto_record: false,
      auto_transcribe: false,
      fallback_cell_phone: '555-1234',
      do_not_disturb_until: null,
    })

    const res = await GET()
    const json = await res.json()

    expect(json.settings).toMatchObject({ ring_strategy: 'cell_only', caller_id_mode: 'show_business', fallback_cell_phone: '555-1234' })
  })

  it("never returns another tenant's settings row even if scoped by the same admin id", async () => {
    h.store.comhub_admin_voice_settings.push({
      admin_id: 'admin-A1',
      tenant_id: 'tenant-B',
      ring_strategy: 'simultaneous',
      caller_id_mode: 'show_business',
      auto_record: false,
      auto_transcribe: false,
      fallback_cell_phone: null,
      do_not_disturb_until: null,
    })

    const res = await GET()
    const json = await res.json()

    expect(json.settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe('PUT /api/admin/comhub/voice/settings — permission + preconditions', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const res = await PUT(putReq({ ring_strategy: 'cell_only' }))

    expect(res.status).toBe(403)
    expect(h.store.comhub_admin_voice_settings.length).toBe(0)
  })

  it('returns 412 when there is no active admin member', async () => {
    h.adminId = null

    const res = await PUT(putReq({ ring_strategy: 'cell_only' }))

    expect(res.status).toBe(412)
    await expect(res.json()).resolves.toEqual({ error: 'no tenant member found' })
  })

  it('returns 400 for an invalid JSON body', async () => {
    const res = await PUT(putReqRaw('not json'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'invalid body' })
  })
})

describe('PUT /api/admin/comhub/voice/settings — field validation + upsert', () => {
  it('upserts a valid ring_strategy/caller_id_mode, stamped with the tenant_id', async () => {
    const res = await PUT(putReq({ ring_strategy: 'cell_only', caller_id_mode: 'show_business' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.settings).toMatchObject({ ring_strategy: 'cell_only', caller_id_mode: 'show_business', admin_id: 'admin-A1' })
    expect(h.store.comhub_admin_voice_settings[0].tenant_id).toBe('tenant-A')
  })

  it('ignores an unrecognized ring_strategy/caller_id_mode value', async () => {
    const res = await PUT(putReq({ ring_strategy: 'teleport', caller_id_mode: 'invisible' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.settings.ring_strategy).toBeUndefined()
    expect(json.settings.caller_id_mode).toBeUndefined()
  })

  it('applies boolean toggles for auto_record/auto_transcribe', async () => {
    const res = await PUT(putReq({ auto_record: false, auto_transcribe: false }))
    const json = await res.json()

    expect(json.settings.auto_record).toBe(false)
    expect(json.settings.auto_transcribe).toBe(false)
  })

  it('allows clearing fallback_cell_phone / do_not_disturb_until back to null', async () => {
    h.store.comhub_admin_voice_settings.push({
      admin_id: 'admin-A1',
      tenant_id: 'tenant-A',
      fallback_cell_phone: '555-1234',
      do_not_disturb_until: '2026-08-01T00:00:00.000Z',
    })

    const res = await PUT(putReq({ fallback_cell_phone: null, do_not_disturb_until: null }))
    const json = await res.json()

    expect(json.settings.fallback_cell_phone).toBeNull()
    expect(json.settings.do_not_disturb_until).toBeNull()
  })

  it('a subsequent PUT updates the same row (upsert on admin_id) rather than creating a duplicate', async () => {
    await PUT(putReq({ ring_strategy: 'cell_only' }))
    await PUT(putReq({ caller_id_mode: 'show_business' }))

    const rows = h.store.comhub_admin_voice_settings.filter((r) => r.admin_id === 'admin-A1')
    expect(rows.length).toBe(1)
    expect(rows[0].ring_strategy).toBe('cell_only')
    expect(rows[0].caller_id_mode).toBe('show_business')
  })
})
