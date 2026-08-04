/**
 * Tenant Completion — the distinct, explicit, client-facing "launch" moment
 * (Phase 0 of the automated onboarding pipeline, 2026-08-03).
 *
 * Activation (activate-tenant.ts) is an internal/operator checkpoint: "is this
 * tenant technically ready" — settings seeded, domain live, spine passes. It
 * no longer emails the client. Completion is the one and only point where a
 * client-facing "you're live" message goes out: it issues a fresh owner PIN,
 * sends exactly one consolidated email (login + welcome), and stamps
 * `completed_at`. Only callable once a tenant is actually activated, and only
 * fires the email on the real transition — re-running after completion is a
 * safe no-op, not a re-send.
 */
import { supabaseAdmin } from './supabase'
import { hashAdminPin, generateAdminPin } from './admin-pin'
import { sendTenantLaunchEmail } from './owner-welcome-email'
import { generateTenantSite } from './generate-tenant-site'

export interface CompletionResult {
  ok: boolean
  completed: boolean
  emailSent: boolean
  ownerPin?: string | null
  error?: string
  /** Phase 4 area/job page generation — best-effort, never blocks Completion. */
  siteContent?: { areasProcessed: number; locationPagesWritten: number; jobPagesWritten: number; areaErrors: number }
}

export async function completeTenant(tenantId: string): Promise<CompletionResult> {
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, status, owner_email, completed_at')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    return { ok: false, completed: false, emailSent: false, error: 'Tenant not found' }
  }

  if (tenant.status !== 'active') {
    return { ok: false, completed: false, emailSent: false, error: 'Tenant must be activated before it can be completed' }
  }

  if (tenant.completed_at) {
    return { ok: true, completed: true, emailSent: false, error: 'Already completed — no email re-sent' }
  }

  const { data: owner } = await supabaseAdmin
    .from('tenant_members')
    .select('id, email')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .maybeSingle()

  if (!owner) {
    return { ok: false, completed: false, emailSent: false, error: 'No owner login exists — run Activate first' }
  }

  // Issue a fresh PIN at Completion rather than threading the plaintext PIN
  // through from Activation (which only ever holds it in memory, once).
  const ownerPin = generateAdminPin()
  const { error: pinErr } = await supabaseAdmin
    .from('tenant_members')
    .update({ pin_hash: hashAdminPin(ownerPin), pin_set_at: new Date().toISOString() })
    .eq('id', owner.id)

  if (pinErr) {
    return { ok: false, completed: false, emailSent: false, error: pinErr.message }
  }

  const ownerEmail = owner.email || tenant.owner_email
  const { sent } = await sendTenantLaunchEmail({
    tenantName: tenant.name || 'Business',
    slug: tenant.slug,
    ownerEmail,
    ownerPin,
  })

  // Phase 4 — draft + store AI-personalized area/job page content. Best-
  // effort: a generation failure here must never block Completion itself,
  // same non-blocking contract as every other AI step in this pipeline
  // (generateSiteBrandCopy, draftTailoredServices). Pages fall back to the
  // free procedural content until this succeeds on a later run.
  let siteContent: CompletionResult['siteContent']
  try {
    const site = await generateTenantSite(tenantId)
    siteContent = {
      areasProcessed: site.areasProcessed,
      locationPagesWritten: site.locationPagesWritten,
      jobPagesWritten: site.jobPagesWritten,
      areaErrors: site.areaErrors.length,
    }
  } catch {
    siteContent = undefined
  }

  const { error: upErr } = await supabaseAdmin
    .from('tenants')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (upErr) {
    return { ok: false, completed: false, emailSent: sent, ownerPin, siteContent, error: upErr.message }
  }

  return { ok: true, completed: true, emailSent: sent, ownerPin, siteContent }
}
