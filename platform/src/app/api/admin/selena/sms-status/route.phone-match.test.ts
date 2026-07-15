/**
 * GET /api/admin/selena/sms-status -- the `phone` filter query param had NO
 * length floor before being ilike-substring-matched against
 * sms_conversations.phone. A short/malformed phone param (e.g. "1") would
 * broaden the tenant-scoped result set to include OTHER clients' outbound
 * SMS message content -- same ilike-substring bug class fixed elsewhere,
 * here on a read-only monitoring filter. Fixed by requiring a full 10-digit
 * national number before applying the filter at all (falls back to the
 * unfiltered, still tenant-scoped, result set otherwise).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const MONITOR_KEY = 'monitor-test-key'
const TENANT_ID = 'tenant-1'

const MESSAGES = [
  { id: 'm1', conversation_id: 'c1', message: 'hi client A', created_at: '2026-01-01', sms_conversations: { phone: '12125551234', client_id: 'client-a', tenant_id: TENANT_ID } },
  { id: 'm2', conversation_id: 'c2', message: 'hi client B', created_at: '2026-01-02', sms_conversations: { phone: '19175559876', client_id: 'client-b', tenant_id: TENANT_ID } },
]

let capturedIlike: { col: string; pattern: string } | null

function chain() {
  let rows = MESSAGES
  const q: Record<string, unknown> = {
    eq: () => q,
    order: () => q,
    limit: () => q,
    ilike: (col: string, pattern: string) => {
      capturedIlike = { col, pattern }
      const needle = String(pattern).replace(/%/g, '')
      rows = rows.filter((r) => r.sms_conversations.phone.includes(needle))
      return q
    },
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: rows, error: null }).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: () => ({ select: () => chain() }) },
}))

import { GET } from './route'

function req(query: string) {
  return new NextRequest(`https://x.test/api/admin/selena/sms-status?${query}`, {
    headers: { 'x-monitor-key': MONITOR_KEY },
  })
}

describe('GET /api/admin/selena/sms-status — phone filter floor', () => {
  beforeEach(() => {
    process.env.ELCHAPO_MONITOR_KEY = MONITOR_KEY
    capturedIlike = null
  })

  it('does NOT apply an ilike filter for a single-digit phone param (returns unfiltered tenant-scoped set, not a cross-client substring match)', async () => {
    const res = await GET(req(`tenant_id=${TENANT_ID}&phone=1`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(capturedIlike).toBeNull()
    expect(json.total).toBe(2)
  })

  it('does NOT apply an ilike filter for a malformed 7-digit phone param', async () => {
    const res = await GET(req(`tenant_id=${TENANT_ID}&phone=5551234`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(capturedIlike).toBeNull()
    expect(json.total).toBe(2)
  })

  it('CONTROL: still filters when the phone param is a full 10-digit national number', async () => {
    const res = await GET(req(`tenant_id=${TENANT_ID}&phone=2125551234`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(capturedIlike).not.toBeNull()
    expect(json.total).toBe(1)
    expect(json.logs[0].client_id).toBe('client-a')
  })
})
