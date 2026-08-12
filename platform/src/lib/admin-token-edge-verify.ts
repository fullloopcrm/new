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
    if (typeof data.exp !== 'number' || data.exp <= Date.now()) return false
    // Global super-admin token (mirrors verifyAdminToken's role==='super_admin'
    // gate) OR a real signed per-tenant-member token (mirrors
    // verifyTenantAdminToken's role==='tenant_admin' gate, same payload shape
    // and secret — see createTenantAdminToken in admin-auth/route.ts). Was
    // super_admin-only, which meant every tenant_member logging in via their
    // own /fullloop PIN (owner/admin/manager/staff/virtual_assistant — anyone
    // other than the platform super-admin) had a genuinely valid, correctly
    // signed cookie that this edge gate rejected on every single request,
    // redirecting them to /sign-in regardless of the token's actual expiry —
    // found 2026-08-12 investigating a "Session expired" report for a real
    // virtual_assistant login, not a super-admin one. This is still only a
    // coarse signature+expiry check for bypass purposes, same as before — the
    // authoritative per-request check (including instant-revocation via a
    // live tenant_members.is_active re-read) still happens downstream in
    // getTenantForRequest() on the Node side.
    return data.role === 'super_admin' || data.role === 'tenant_admin'
  } catch {
    return false
  }
}
