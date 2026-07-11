import { cookies } from 'next/headers'
import { verifySessionCookie } from '@/lib/nycmaid/auth'

/**
 * Owner/user identity from the signed session cookie — the replacement for
 * Clerk's `auth()`. Returns the DB user id, or null if not signed in.
 *
 * Owner self-serve login is dormant (moved off Clerk); until it is wired onto
 * the session system in P5, this returns null in practice and the dashboard is
 * reached via admin-PIN impersonation.
 */
export async function getOwnerUserId(): Promise<string | null> {
  const cookie = (await cookies()).get('admin_session')?.value
  if (!cookie) return null
  const { valid, userId } = verifySessionCookie(cookie)
  return valid && userId ? userId : null
}
