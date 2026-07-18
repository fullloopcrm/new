import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySvix } from '@/lib/webhook-verify'

// Sync Clerk user events to platform
export async function POST(request: Request) {
  const rawBody = await request.text()

  if (process.env.CLERK_WEBHOOK_VERIFY !== 'off') {
    const result = verifySvix(request.headers, rawBody, process.env.CLERK_WEBHOOK_SECRET)
    if (!result.valid) {
      console.warn('[clerk webhook] rejected:', result.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let body: { type?: string; data?: Record<string, unknown> }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { type, data } = body as {
    type?: string
    data?: {
      id?: string
      email_addresses?: Array<{ id?: string; email_address?: string }>
      primary_email_address_id?: string
      first_name?: string
      last_name?: string
    }
  }
  if (!type || !data) return NextResponse.json({ ok: true })

  // Clerk delivers via Svix, same at-least-once/retry-on-slow-response
  // semantics already fixed on Telnyx/Telegram/Resend this session (Svix's
  // own docs: retries on any non-2xx or >15s response, svix-id constant
  // across retries of the same logical event). user.updated/user.deleted
  // below are idempotent against an EXACT redelivery (both are plain
  // UPDATE/DELETE to a fixed target state), but not against an OUT-OF-ORDER
  // one: if an earlier user.updated is delayed (queued for retry) past a
  // later one that already applied, the stale retry re-lands last and
  // overwrites the newer email/name. Claiming the svix-id closes that gap
  // the same way the other three surfaces did.
  const svixId = request.headers.get('svix-id')
  if (svixId) {
    const { error: claimErr } = await supabaseAdmin.from('clerk_webhook_events').insert({ event_id: svixId })
    if (claimErr) {
      if (claimErr.code === '23505') {
        return NextResponse.json({ received: true, action: 'duplicate_delivery' })
      }
      console.error('[clerk webhook] event claim failed:', claimErr)
      // Fall through -- an infra hiccup on the dedup table must not silently
      // drop a real Clerk event.
    }
  }

  switch (type) {
    case 'user.created': {
      // New user registered — no action needed beyond Clerk's own tracking
      break
    }

    case 'user.updated': {
      // Sync email/name changes to tenant_members if they exist.
      // email_addresses[0] is NOT guaranteed to be the primary address --
      // Clerk's own User object docs say the array "includes the primary"
      // but order is unspecified; primary_email_address_id is the field
      // that identifies which entry actually is primary. Blindly taking
      // index 0 could sync down a secondary/unverified address instead of
      // the one the user actually uses.
      const primaryEmail = data.primary_email_address_id
        ? data.email_addresses?.find(e => e.id === data.primary_email_address_id)?.email_address
        : data.email_addresses?.[0]?.email_address
      const firstName = data.first_name || ''
      const lastName = data.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()

      if (primaryEmail) {
        const { error } = await supabaseAdmin
          .from('tenant_members')
          .update({
            email: primaryEmail,
            ...(fullName && { name: fullName }),
          })
          .eq('clerk_user_id', data.id)
        if (error) {
          console.error(`[clerk webhook] tenant_members email/name sync failed for clerk_user_id=${data.id}:`, error)
        }
      }
      break
    }

    case 'user.deleted': {
      // Remove tenant memberships for a Clerk user deleted directly from
      // Clerk's own dashboard (not via our /api/admin/users or
      // /api/admin/businesses/:id/users DELETE endpoints, which already
      // hard-delete the tenant_members row locally). This previously wrote
      // `status: 'inactive'` -- tenant_members has never had a `status`
      // column (confirmed against supabase/schema.sql and every migration
      // touching this table) and nothing reads tenant_members.status
      // anywhere in the app (getCurrentTenant()/tenantAuth() resolve
      // membership by clerk_user_id alone) -- so this silently no-op'd
      // (uncaught error, no fallthrough log) on every single Clerk-side user
      // deletion since this handler was written. A member removed directly
      // in Clerk was never cleaned up locally. Delete matches the existing
      // removal semantics used by the app's own admin DELETE endpoints; the
      // one FK (user_preferences.tenant_member_id) is ON DELETE CASCADE.
      const { error } = await supabaseAdmin.from('tenant_members').delete().eq('clerk_user_id', data.id)
      if (error) {
        console.error(`[clerk webhook] tenant_members cleanup failed for deleted clerk_user_id=${data.id}:`, error)
      }
      break
    }

    case 'session.created': {
      // Could track login events here
      break
    }
  }

  return NextResponse.json({ received: true })
}
