import crypto from 'crypto'

// Referrer portal session tokens. Same HMAC scheme as the team portal
// (src/app/api/team-portal/auth/route.ts) — a base64 payload plus a SHA-256
// HMAC signature — reusing TEAM_PORTAL_SECRET so we don't introduce a second
// signing secret to provision. The `scope: 'ref'` field keeps a referrer token
// from being replayed against team-portal routes and vice-versa.

const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000 // 30 days — referrers check earnings rarely

function getSecret(): string {
  const s = process.env.TEAM_PORTAL_SECRET
  if (!s) {
    throw new Error('TEAM_PORTAL_SECRET env var is required for referrer portal auth.')
  }
  return s
}

export function createReferrerToken(referrerId: string, tenantId: string): string {
  const payload = JSON.stringify({ rid: referrerId, tid: tenantId, scope: 'ref', exp: Date.now() + TOKEN_TTL_MS })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifyReferrerToken(token: string): { rid: string; tid: string } | null {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return null
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
    // Constant-time compare to avoid leaking signature bytes via timing.
    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
    const data = JSON.parse(payload)
    if (data.scope !== 'ref') return null
    if (data.exp < Date.now()) return null
    return { rid: data.rid, tid: data.tid }
  } catch {
    return null
  }
}

// Pull and verify the referrer bearer token off a request.
export function getReferrerAuth(request: Request): { rid: string; tid: string } | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyReferrerToken(token)
}

// Hash an OTP the same way for storage and comparison. SHA-256 with the signing
// secret as salt — codes are short-lived (10 min) and single-use, so this is
// sufficient without a bcrypt round-trip.
export function hashOtp(code: string): string {
  return crypto.createHmac('sha256', getSecret()).update(`otp:${code}`).digest('hex')
}
