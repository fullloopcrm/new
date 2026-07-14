/**
 * Integration tests for GET /api/gdpr/export.
 *
 * These exercise the route handler's own logic — permission gating, format
 * negotiation (zip vs json), clientId validation, and the tenant-scoped
 * ownership check that guards a supplied clientId — while stubbing the DB
 * collection (collectGdprExport, covered separately in gdpr-export.test.ts).
 * The pure serializers (rowsToCsv, buildManifestText) run for real so the ZIP
 * path is verified end-to-end by unzipping the produced archive.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import JSZip from 'jszip'

// ── hoisted mock handles (referenced inside vi.mock factories) ──
const h = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  collectGdprExport: vi.fn(),
  // clients-ownership-check plumbing
  ownershipResult: { data: null as null | { id: string }, error: null },
  eqCalls: [] as unknown[][],
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

// Keep the real pure serializers; swap only the DB collector.
vi.mock('@/lib/gdpr-export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gdpr-export')>()
  return { ...actual, collectGdprExport: (...a: unknown[]) => h.collectGdprExport(...a) }
})

vi.mock('@/lib/supabase', () => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (...a: unknown[]) => (h.eqCalls.push(a), builder),
    maybeSingle: () => Promise.resolve(h.ownershipResult),
  }
  return { supabaseAdmin: { from: vi.fn(() => builder) } }
})

import { GET } from './route'
import type { GdprExportBundle } from '@/lib/gdpr-export'

const TENANT_ID = 'tenant-1'
const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

function sampleBundle(clientId: string | null): GdprExportBundle {
  return {
    generated_at: '2026-07-12T00:00:00.000Z',
    tenant_id: TENANT_ID,
    client_id: clientId,
    counts: { bookings: 1, invoices: 0, communications: 0, notes: 0 },
    sections: {
      bookings: [{ id: 'b1', client_id: clientId ?? 'c9' }],
      invoices: [],
      communications: [],
      notes: [],
    },
  }
}

function req(query = ''): Request {
  return new Request(`http://localhost/api/gdpr/export${query}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  h.eqCalls.length = 0
  h.ownershipResult = { data: null, error: null }
  // Default: authorized owner for TENANT_ID.
  h.requirePermission.mockResolvedValue({ tenant: { tenantId: TENANT_ID }, error: null })
})

describe('GET /api/gdpr/export — permission gate', () => {
  it('returns the permission error unchanged when the caller is not authorized', async () => {
    h.requirePermission.mockResolvedValue({
      tenant: null,
      error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }),
    })

    const res = await GET(req('?format=json'))

    expect(res.status).toBe(403)
    expect(h.collectGdprExport).not.toHaveBeenCalled()
  })
})

describe('GET /api/gdpr/export — format negotiation', () => {
  it('json: returns the bundle verbatim, tenant-scoped, with 200', async () => {
    const bundle = sampleBundle(null)
    h.collectGdprExport.mockResolvedValue(bundle)

    const res = await GET(req('?format=json'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    await expect(res.json()).resolves.toEqual(bundle)

    // tenant-scoping: the collector is called with the caller's tenant id.
    expect(h.collectGdprExport).toHaveBeenCalledTimes(1)
    const [tenantArg, clientArg] = h.collectGdprExport.mock.calls[0]
    expect(tenantArg).toBe(TENANT_ID)
    expect(clientArg).toBeNull()
  })

  it('zip (default): returns an application/zip attachment whose export.json is the bundle', async () => {
    const bundle = sampleBundle(null)
    h.collectGdprExport.mockResolvedValue(bundle)

    const res = await GET(req()) // no format → defaults to zip

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/zip')
    expect(res.headers.get('content-disposition')).toContain('gdpr-export-tenant-2026-07-12.zip')

    // Unzip and confirm bundle shape survived the round-trip.
    const zip = await JSZip.loadAsync(await res.arrayBuffer())
    const names = Object.keys(zip.files).sort()
    expect(names).toEqual(
      ['bookings.csv', 'communications.csv', 'export.json', 'invoices.csv', 'manifest.txt', 'notes.csv'].sort()
    )
    const parsed = JSON.parse(await zip.file('export.json')!.async('string'))
    expect(parsed).toEqual(bundle)
    // real serializer ran: bookings.csv has a header row from the one booking
    expect(await zip.file('bookings.csv')!.async('string')).toContain('id')
  })

  it('rejects an unsupported format with 400 before touching the DB', async () => {
    const res = await GET(req('?format=xml'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'format must be "zip" or "json"' })
    expect(h.collectGdprExport).not.toHaveBeenCalled()
  })
})

describe('GET /api/gdpr/export — clientId scoping', () => {
  it('rejects a non-UUID clientId with 400 before touching the DB', async () => {
    const res = await GET(req('?format=json&clientId=not-a-uuid'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'clientId must be a UUID' })
    expect(h.collectGdprExport).not.toHaveBeenCalled()
  })

  it('verifies clientId belongs to the tenant (id + tenant_id) and 404s when it does not', async () => {
    h.ownershipResult = { data: null, error: null } // client not found for this tenant

    const res = await GET(req(`?format=json&clientId=${CLIENT_ID}`))

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'Client not found' })
    // ownership check is tenant-scoped: both id and tenant_id filters applied.
    expect(h.eqCalls).toContainEqual(['id', CLIENT_ID])
    expect(h.eqCalls).toContainEqual(['tenant_id', TENANT_ID])
    // A cross-tenant id guess must never reach the collector.
    expect(h.collectGdprExport).not.toHaveBeenCalled()
  })

  it('proceeds to a client-scoped export once ownership is confirmed', async () => {
    h.ownershipResult = { data: { id: CLIENT_ID }, error: null }
    const bundle = sampleBundle(CLIENT_ID)
    h.collectGdprExport.mockResolvedValue(bundle)

    const res = await GET(req(`?format=json&clientId=${CLIENT_ID}`))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(bundle)
    const [tenantArg, clientArg] = h.collectGdprExport.mock.calls[0]
    expect(tenantArg).toBe(TENANT_ID)
    expect(clientArg).toBe(CLIENT_ID)
  })

  it('zip filename for a client-scoped export carries the client id', async () => {
    h.ownershipResult = { data: { id: CLIENT_ID }, error: null }
    h.collectGdprExport.mockResolvedValue(sampleBundle(CLIENT_ID))

    const res = await GET(req(`?clientId=${CLIENT_ID}`)) // zip default

    expect(res.headers.get('content-disposition')).toContain(`client-${CLIENT_ID}`)
  })
})

describe('GET /api/gdpr/export — failure handling', () => {
  it('maps a collector throw to a 500', async () => {
    h.collectGdprExport.mockRejectedValue(new Error('db down'))

    const res = await GET(req('?format=json'))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'db down' })
  })
})
