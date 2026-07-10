import crypto from 'crypto'

// Token helpers for the field-staff (team) portal. Extracted from route.ts
// because Next 16 rejects non-standard exports from a route file.

function getSecret(): string {
  const s = process.env.TEAM_PORTAL_SECRET
  if (!s) {
    throw new Error('TEAM_PORTAL_SECRET env var is required. Do not fall back to SUPABASE_SERVICE_ROLE_KEY — a leaked team portal token would then act as a signature oracle against the service role key.')
  }
  return s
}

export function createToken(memberId: string, tenantId: string, payRate?: number | null, role?: string | null): string {
  const payload = JSON.stringify({ id: memberId, tid: tenantId, pr: payRate || 0, r: role || 'worker', exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

// role is the field-staff portal tier (worker/lead/manager). Legacy tokens
// minted before tiers existed carry no `r` → treated as least-privilege 'worker'.
export function verifyToken(token: string): { id: string; tid: string; role: string } | null {
  try {
    const [payloadB64, sig] = token.split('.')
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
    if (sig !== expected) return null
    const data = JSON.parse(payload)
    if (data.exp < Date.now()) return null
    return { id: data.id, tid: data.tid, role: data.r || 'worker' }
  } catch {
    return null
  }
}
