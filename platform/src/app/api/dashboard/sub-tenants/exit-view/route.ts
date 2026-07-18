// Stop viewing a location, back to the head tenant's own dashboard. Not
// scoped to any [id] — clearing your own impersonation cookie is safe by
// construction, so no auth check beyond "you have this cookie" is needed.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { IMPERSONATE_COOKIE } from '@/lib/impersonation'

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATE_COOKIE)
  return NextResponse.json({ ok: true })
}
