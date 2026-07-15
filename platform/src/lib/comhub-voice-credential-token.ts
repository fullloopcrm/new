/**
 * Binds a Telnyx per-session softphone credential to the tenant that minted
 * it. Tenants without their own Telnyx account share the platform API key
 * (see comhub-voice-config.ts), so `DELETE /api/admin/comhub/voice/token`
 * could otherwise delete ANY tenant's live credential_id via that shared
 * key — same action-authorization-bypass class as the comhub voice/control
 * customer_call_id hijack. There's no DB table tracking credential
 * ownership, so we HMAC-sign it instead of adding one.
 */
import crypto from 'crypto'

const TTL_MS = 24 * 60 * 60 * 1000 // matches the credential's own Telnyx expiry

function secret(): string {
  const s = process.env.ADMIN_TOKEN_SECRET
  if (!s) throw new Error('ADMIN_TOKEN_SECRET required for voice credential ownership signing')
  return s
}

export function signCredentialOwner(credentialId: string, tenantId: string): string {
  const payload = `${credentialId}.${tenantId}.${Date.now() + TTL_MS}`
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

/** True only if `token` was minted for this exact credentialId + tenantId and hasn't expired. */
export function verifyCredentialOwner(token: string | null | undefined, credentialId: string, tenantId: string): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 4) return false
  const [tokCredId, tokTenantId, exp, sig] = parts
  if (tokCredId !== credentialId || tokTenantId !== tenantId) return false
  const expected = crypto.createHmac('sha256', secret()).update(`${tokCredId}.${tokTenantId}.${exp}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  if (!crypto.timingSafeEqual(a, b)) return false
  if (!Number.isFinite(Number(exp)) || Date.now() > Number(exp)) return false
  return true
}
