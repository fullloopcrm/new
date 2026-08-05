import crypto from 'crypto'

// Token helpers for the client portal. Extracted from route.ts because Next 16
// rejects non-standard exports from a route file.

function getSecret(): string {
  const s = process.env.PORTAL_SECRET
  if (!s) {
    throw new Error('PORTAL_SECRET env var is required. Do not fall back to SUPABASE_SERVICE_ROLE_KEY — a leaked portal token would then act as a signature oracle against the service role key.')
  }
  return s
}

export function generateCode(): string {
  // crypto.randomInt is uniformly distributed and cryptographically strong;
  // Math.random was brute-forceable with timing knowledge.
  return String(100000 + crypto.randomInt(0, 900000))
}

const DEFAULT_TTL_MS = 24 * 3600 * 1000

// ttlMs is optional and defaults to the web client-portal's existing 24h
// session — the mobile unified-login resolver (api/mobile/unified-login)
// passes a long-lived override (matches tenant_members' 10-year pattern)
// without changing behavior for the web portal's own PIN-only login.
export function createToken(clientId: string, tenantId: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload = JSON.stringify({ id: clientId, tid: tenantId, exp: Date.now() + ttlMs })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifyPortalToken(token: string): { id: string; tid: string } | null {
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
    if (data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}
