/**
 * Edge-Runtime-safe verification of the super-admin token, for use in
 * middleware.ts. Must stay byte-for-byte compatible with the Node-side
 * signer/verifier in src/app/api/admin-auth/route.ts (createAdminToken /
 * verifyAdminToken) — Node's `crypto` module is unavailable in the Edge
 * Runtime, so this reuses the pure-JS HMAC-SHA256 in tenant-header-sig.ts,
 * already proven byte-identical to Node's crypto.createHmac output
 * (tenant-header-sig.test.ts).
 *
 * Token shape: base64(JSON payload) + '.' + hex HMAC-SHA256(payload).
 */
import { hmacSha256, bytesToHex } from './tenant-header-sig'

interface AdminTokenPayload {
  role?: string
  exp?: number
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function verifyAdminTokenEdge(token: string | undefined | null, secret: string | undefined): boolean {
  if (!token || !secret) return false
  try {
    const dot = token.indexOf('.')
    if (dot === -1) return false
    const payloadB64 = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    if (!sig) return false

    // atob is a Web-standard global available in both the Edge Runtime and
    // Node — Buffer is Node-only and unavailable in middleware's Edge Runtime.
    const payload = atob(payloadB64)
    const expected = bytesToHex(hmacSha256(secret, payload))
    if (!timingSafeStringEqual(sig, expected)) return false

    const data = JSON.parse(payload) as AdminTokenPayload
    // Only the global super-admin token satisfies this check — mirrors
    // verifyAdminToken's role==='super_admin' gate (tenant-admin tokens are a
    // separate, tenant-bound check not reachable through this middleware path).
    return data.role === 'super_admin' && typeof data.exp === 'number' && data.exp > Date.now()
  } catch {
    return false
  }
}
