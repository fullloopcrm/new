import crypto from 'crypto'

/**
 * Signed unsubscribe tokens. A token is a signed pair (client_id, tenant_id,
 * channel). Required by /api/unsubscribe POST so an attacker can't
 * opt-out arbitrary clients by guessing UUIDs.
 *
 * Reusable (no nonce) so the same token from an email remains valid for
 * re-clicks; if ever a revoke path is needed, add `issued_at` + an
 * `unsubscribe_token_revocations` table.
 */

function secret(): string {
  const s = process.env.PORTAL_SECRET || process.env.ADMIN_TOKEN_SECRET
  if (!s) {
    throw new Error('PORTAL_SECRET (or ADMIN_TOKEN_SECRET fallback) is required for unsubscribe token signing')
  }
  return s
}

export type UnsubscribePayload = {
  clientId: string
  tenantId: string
  channel: 'email' | 'sms'
}

export function signUnsubscribeToken(p: UnsubscribePayload): string {
  const body = `${p.clientId}.${p.tenantId}.${p.channel}`
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('hex')
  return Buffer.from(body).toString('base64url') + '.' + sig
}

export function verifyUnsubscribeToken(token: string | null | undefined): UnsubscribePayload | null {
  if (!token) return null
  const idx = token.lastIndexOf('.')
  if (idx < 0) return null
  const bodyB64 = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  let body: string
  try {
    body = Buffer.from(bodyB64, 'base64url').toString('utf8')
  } catch {
    return null
  }
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('hex')
  if (expected.length !== sig.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) return null
  } catch {
    return null
  }
  const [clientId, tenantId, channel] = body.split('.')
  if (!clientId || !tenantId || !channel) return null
  if (channel !== 'email' && channel !== 'sms') return null
  return { clientId, tenantId, channel }
}

export function unsubscribeUrl(origin: string, p: UnsubscribePayload): string {
  const t = signUnsubscribeToken(p)
  return `${origin.replace(/\/$/, '')}/unsubscribe?t=${encodeURIComponent(t)}`
}
