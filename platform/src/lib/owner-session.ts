import { cookies } from 'next/headers'
import { verifySessionCookie } from '@/lib/nycmaid/auth'

/**
 * Owner/user identity from the signed `admin_session` cookie — the
 * replacement for Clerk's `auth()`. Returns the DB user id, or null if not
 * signed in.
 *
 * Onboarding-model decision (2026-07-28): FullLoop CRM is white-glove, not
 * self-serve, and that's a deliberate choice, not an in-progress migration —
 * Clerk has been fully removed (no @clerk/nextjs dependency anywhere), and
 * there is no self-serve signup flow to wire this onto. In real usage this
 * only resolves to a non-null id via the `admin_users` email/password login
 * at /api/auth/login (legacy, nycmaid-owned `admin_users` table) or the
 * platform-admin PIN fallback in that same route — never via a genuine
 * per-tenant owner signup, because none exists. Every tenant is provisioned
 * by a platform admin (/admin/businesses -> wizard -> provision -> activate,
 * which mints an owner PIN handed to the business out of band), and every
 * real tenant-facing login after that is PIN-based at that tenant's own
 * domain (<domain>/fullloop), not through this function at all. Callers
 * still gated on this (tenant creation in api/tenants, invite-accept in
 * /join/[token]) are effectively unreachable via self-serve as a result —
 * flagged, not changed, since fixing those is a separate decision (see the
 * 2026-07-28 onboarding-model report for the human owner).
 *
 * If self-serve owner signup is ever wanted, this is the function to build
 * a real session onto — today it deliberately is not that.
 */
export async function getOwnerUserId(): Promise<string | null> {
  const cookie = (await cookies()).get('admin_session')?.value
  if (!cookie) return null
  const { valid, userId } = verifySessionCookie(cookie)
  return valid && userId ? userId : null
}
