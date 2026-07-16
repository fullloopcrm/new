import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PATCH /api/jobs/[id] -- completing a job fires ownerAlert() with the job's
 * own `title` interpolated raw into `bodyHtml` (an HTML sink; emailShell()'s
 * contract requires callers to pre-escape, same as every other ownerAlert()
 * caller -- see the fix already applied to /api/portal/request, commit
 * 4f41d111). `title` is settable via this same PATCH's `body.title` by any
 * authenticated tenant member with bookings.edit, so an unescaped title lets
 * that member inject HTML/links into the owner-facing "job complete" email.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

const ownerAlertCalls: Record<string, unknown>[] = []

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: h.tenantId }, error: null })),
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => {}),
  shapeSession: (b: Record<string, unknown>) => ({ id: b.id, status: b.status }),
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: vi.fn(async (input: Record<string, unknown>) => {
    ownerAlertCalls.push(input)
  }),
}))

const MALICIOUS_TITLE = '<img src=x onerror=alert(1)>Deck build'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  ownerAlertCalls.length = 0
  h.store = {
    jobs: [
      { id: 'job-A1', tenant_id: 'tenant-A', title: 'Deck build', status: 'scheduled', total_cents: 50000 },
    ],
    job_payments: [],
    job_events: [],
  }
})

describe('PATCH /api/jobs/[id] — ownerAlert bodyHtml/heading escaping on completion', () => {
  it('escapes an attacker-controlled title before it reaches the HTML email body', async () => {
    const { PATCH } = await import('./route')
    // First set the malicious title, then complete the job in the same PATCH
    // (title + status can both be set together per the route's own contract).
    const res = await PATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ title: MALICIOUS_TITLE, status: 'completed' }) }),
      { params: Promise.resolve({ id: 'job-A1' }) },
    )

    expect(res.status).toBe(200)
    expect(ownerAlertCalls).toHaveLength(1)
    const { bodyHtml, heading } = ownerAlertCalls[0] as { bodyHtml: string; heading: string }

    expect(bodyHtml).not.toContain('<img src=x onerror=alert(1)>')
    expect(bodyHtml).toContain('&lt;img src=x onerror=alert(1)&gt;Deck build')
    expect(heading).not.toContain('<img src=x onerror=alert(1)>')
  })
})
