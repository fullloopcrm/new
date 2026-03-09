import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']
const COOKIE_NAME = 'fl_impersonate'
const MAX_AGE = 3600 // 1 hour

// Start impersonation
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  // Set impersonation cookie
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, tenantId, {
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
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
