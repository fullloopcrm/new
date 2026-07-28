/**
 * Accept an existing-tenant team invite (created by /api/admin/invites,
 * emailed as /join/{token}). Mints a real, working credential the same way
 * every other white-glove-onboarded operator gets one: a per-tenant PIN on
 * tenant_members (see /api/admin/users, /api/admin/businesses/[id]/users),
 * verified at login via /api/admin-auth against tenant_members.pin_hash.
 *
 * The invitee never gets a Clerk-style session — there isn't one. This
 * replaces the dead getOwnerUserId()-dependent accept flow (see
 * lib/owner-session.ts) that could never actually complete for a fresh
 * invitee, since no self-serve session mechanism exists to satisfy it.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { hashAdminPin, generateAdminPin } from '@/lib/admin-pin'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { logSecurityEvent } from '@/lib/security'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rl = await rateLimitDb(`join-accept:${ip}`, 10, 15 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const { name } = await request.json().catch(() => ({}))
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data: invite } = await supabaseAdmin
    .from('tenant_invites')
    .select('*, tenants(id, name, domain, slug)')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'This invite link is not valid.' }, { status: 404 })
  }
  if (invite.accepted) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 400 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your admin to send a new one.' }, { status: 400 })
  }

  const db = tenantDb(invite.tenant_id)

  // Generate a per-tenant-unique 6-digit PIN (same mechanism + collision
  // retry as /api/admin/users and /api/admin/businesses/[id]/users).
  let pin = generateAdminPin()
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await db
      .from('tenant_members')
      .select('id')
      .eq('pin_hash', hashAdminPin(pin))
      .maybeSingle()
    if (!clash) break
    pin = generateAdminPin()
  }
  const pinHash = hashAdminPin(pin)
  const pinSetAt = new Date().toISOString()

  // Re-invite of an existing member (e.g. an expired invite resent): reuse
  // their row and just issue a fresh PIN instead of creating a duplicate.
  const { data: existingMember } = await db
    .from('tenant_members')
    .select('id')
    .eq('email', invite.email)
    .maybeSingle()

  let memberId: string
  if (existingMember) {
    memberId = existingMember.id as string
    const { error: updateError } = await db
      .from('tenant_members')
      .update({ name: name.trim(), role: invite.role || 'owner', pin_hash: pinHash, pin_set_at: pinSetAt })
      .eq('id', memberId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  } else {
    const { data: created, error: insertError } = await db
      .from('tenant_members')
      .insert({
        name: name.trim(),
        email: invite.email,
        role: invite.role || 'owner',
        pin_hash: pinHash,
        pin_set_at: pinSetAt,
      })
      .select('id')
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    memberId = created.id as string
  }

  await db.from('tenant_invites').update({ accepted: true }).eq('id', invite.id)

  // First real member on a freshly-provisioned tenant flips it live.
  await supabaseAdmin
    .from('tenants')
    .update({ status: 'active' })
    .eq('id', invite.tenant_id)
    .eq('status', 'setup')

  await logSecurityEvent({
    tenantId: invite.tenant_id,
    type: 'member_added',
    description: `${name.trim()} (${invite.email}) accepted their invite and joined as ${invite.role || 'owner'}`,
  })

  const loginUrl = tenantSiteUrl(invite.tenants) + '/fullloop'

  return NextResponse.json({
    memberId,
    pin,
    tenantName: invite.tenants?.name || 'your business',
    loginUrl,
  })
}
