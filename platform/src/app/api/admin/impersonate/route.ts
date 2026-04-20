import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'
import { IMPERSONATE_COOKIE, signImpersonation } from '@/lib/impersonation'

const COOKIE_NAME = IMPERSONATE_COOKIE
const MAX_AGE = 3600 // 1 hour

// Start impersonation
export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenantId } = await request.json()
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
  }

  // Verify tenant exists
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Set impersonation cookie (signed with ADMIN_TOKEN_SECRET).
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, signImpersonation(tenantId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })

  // Log the event
  await logSecurityEvent({
    tenantId,
    type: 'login',
    description: `Admin impersonation started by platform admin`,
  })

  return NextResponse.json({ ok: true, tenant: tenant.name })
}

// Stop impersonation
export async function DELETE() {
  const authError = await requireAdmin()
  if (authError) return authError

  const cookieStore = await cookies()
  const tenantId = cookieStore.get(COOKIE_NAME)?.value

  if (tenantId) {
    await logSecurityEvent({
      tenantId,
      type: 'login',
      description: `Admin impersonation ended by platform admin`,
    })
  }

  cookieStore.delete(COOKIE_NAME)

  return NextResponse.json({ ok: true })
}
