import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * admin/comhub/voice/token DELETE — cross-tenant credential-deletion guard.
 *
 * BUG (fixed here): tenants without their own Telnyx account share the
 * platform's TELNYX_API_KEY (comhub-voice-config.ts) — same fact pattern
 * already fixed for voice/control's customer_call_id hijack (P22). DELETE
 * took a caller-supplied `credential_id` and deleted it via that shared key
 * with no check the CALLING tenant is the one who minted it — any admin on
 * the shared account could kill another tenant's live softphone session by
 * supplying its credential_id.
 *
 * FIX: POST now returns a `credential_owner_token` (HMAC-bound to
 * credentialId + the minting tenant's id). DELETE requires it and verifies
 * it against the CALLER's own tenantId before ever calling Telnyx; a
 * missing/foreign/tampered token no-ops instead of deleting.
 */

process.env.ADMIN_TOKEN_SECRET = 'test-voice-token-route-secret'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ tenantId: 'tid-a' }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => holder.tenantId) }))
vi.mock('@/lib/admin-member', () => ({ getActiveAdminMemberId: vi.fn(async () => 'admin-1') }))
vi.mock('@/lib/comhub-voice-config', () => ({
  resolveTenantVoiceConfig: vi.fn(async () => ({
    apiKey: 'shared-platform-telnyx-key', // same key for every tenant — the whole point of the bug
    voiceConnectionId: 'conn-1',
    telephonyCredentialId: 'shared-default-cred',
    credentialConnectionId: 'ccred-1',
    fromNumber: '+18885551234',
  })),
}))

import { POST, DELETE } from './route'
import { signCredentialOwner } from '@/lib/comhub-voice-credential-token'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  holder.tenantId = TENANT_A
  fetchMock = vi.fn(async (url: string) => {
    const u = String(url)
    if (u.endsWith('/token')) {
      return { ok: true, json: async () => ({}), text: async () => 'mock-login-token' }
    }
    if (u.endsWith('/telephony_credentials')) {
      // POST create
      return { ok: true, json: async () => ({ data: { id: 'cred-a-session', sip_username: 'user-a', sip_password: 'pw-a' } }), text: async () => '' }
    }
    // DELETE .../telephony_credentials/{id}
    return { ok: true, json: async () => ({}), text: async () => '' }
  })
  vi.stubGlobal('fetch', fetchMock)
})

function postReq() {
  return new NextRequest('http://t/api/admin/comhub/voice/token', {
    method: 'POST',
    body: JSON.stringify({ session_id: 'sess-1' }),
  })
}

function deleteReq(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/voice/token', {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/voice/token — cross-tenant credential-ownership guard', () => {
  it('CONTROL: tenant A can delete its own just-minted credential with its own owner token', async () => {
    const created = await POST(postReq())
    const { credential_id, credential_owner_token } = await created.json()
    expect(credential_id).toBe('cred-a-session')
    expect(credential_owner_token).toBeTruthy()

    fetchMock.mockClear()
    const res = await DELETE(deleteReq({ credential_id, credential_owner_token }))
    const json = await res.json()
    expect(json.deleted).toBe('cred-a-session')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('cred-a-session')
  })

  it('BLOCKED: tenant B replaying tenant A\'s owner token as tenant B never deletes', async () => {
    holder.tenantId = TENANT_A
    const created = await POST(postReq())
    const { credential_id, credential_owner_token } = await created.json()

    holder.tenantId = TENANT_B
    fetchMock.mockClear()
    const res = await DELETE(deleteReq({ credential_id, credential_owner_token }))
    const json = await res.json()
    expect(json.note).toBe('not owned by this tenant, not deleted')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: tenant B guessing tenant A\'s credential_id with no token never deletes', async () => {
    holder.tenantId = TENANT_B
    fetchMock.mockClear()
    const res = await DELETE(deleteReq({ credential_id: 'cred-a-session' }))
    const json = await res.json()
    expect(json.note).toBe('not owned by this tenant, not deleted')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: a forged/tampered owner token never deletes', async () => {
    holder.tenantId = TENANT_A
    const forged = signCredentialOwner('cred-a-session', TENANT_A).slice(0, -4) + 'dead'
    fetchMock.mockClear()
    const res = await DELETE(deleteReq({ credential_id: 'cred-a-session', credential_owner_token: forged }))
    const json = await res.json()
    expect(json.note).toBe('not owned by this tenant, not deleted')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('CONTROL: the shared default credential id still no-ops without needing a token (unchanged behavior)', async () => {
    holder.tenantId = TENANT_B
    fetchMock.mockClear()
    const res = await DELETE(deleteReq({ credential_id: 'shared-default-cred' }))
    const json = await res.json()
    expect(json.note).toBe('shared credential, not deleted')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
