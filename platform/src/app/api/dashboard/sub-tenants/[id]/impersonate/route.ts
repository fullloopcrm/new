// Head tenant "view this location" — sets the same signed impersonation
// cookie the admin path uses, but gated on a real ancestry check instead of
// a platform-admin token: the caller must already be authenticated AS a
// tenant that is a verified ancestor of [id] (walks parent_tenant_id, see
// tenant-hierarchy.ts). getCurrentTenant/getTenantForRequest then honor this
// cookie ONLY for that same descendant relationship — see
// resolveDescendantImpersonation, the single shared check both use.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { isDescendantOfTenant } from '@/lib/tenant-hierarchy'
import { IMPERSONATE_COOKIE, signImpersonation } from '@/lib/impersonation'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_AGE = 3600 // 1 hour, matches the admin impersonation cookie lifetime

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, role } = await getTenantForRequest()
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the tenant owner can view a location' }, { status: 403 })
    }
    const { id: targetId } = await params

    const isDescendant = await isDescendantOfTenant(targetId, tenantId)
    if (!isDescendant) {
      return NextResponse.json({ error: 'Not a location under this tenant' }, { status: 403 })
    }

    const { data: target } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', targetId)
      .single()
    if (!target) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const cookieStore = await cookies()
    cookieStore.set(IMPERSONATE_COOKIE, signImpersonation(targetId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ ok: true, tenant: target.name })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
