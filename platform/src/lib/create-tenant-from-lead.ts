/**
 * Single path that turns a won lead (partner_requests) into a tenant.
 * Used by BOTH the manual comp override (/api/admin/requests/convert) and the
 * paid-proposal path (Phase 2 payment webhook) so a tenant is always created
 * the same way — prefilled, provisioned, seats + billing set, notes carried,
 * lead linked and marked 'sold'.
 *
 * Idempotent: a lead already converted returns its existing tenant.
 */
import { supabaseAdmin } from './supabase'
import { provisionTenant, mapIndustry } from './provision-tenant'
import { seedOnboardingTasks } from './onboarding-tasks'
import { computeMonthly } from './billing-pricing'
import { zipToTimezone } from './timezone'
import { hashAdminPin } from './admin-pin'
import crypto from 'crypto'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export interface CreateFromLeadOptions {
  /** 'new' for paid proposals, 'pending' for a comp/manual override. */
  status?: string
  /** Override seat counts; defaults to the lead's accepted proposal. */
  admins?: number
  teamMembers?: number
  /**
   * Stripe subscription id from the paid proposal checkout. When set, the tenant
   * is born billing-active with the subscription linked, so seat changes on the
   * board re-sync per-seat quantities. Omitted for manual/comp conversions.
   */
  stripeSubscriptionId?: string | null
}

export interface CreateFromLeadResult {
  ok: boolean
  tenant?: { id: string; slug: string; name: string; status: string }
  alreadyConverted?: boolean
  /** Plaintext owner PIN, returned ONCE at creation for the admin to relay. */
  ownerPin?: string | null
  error?: string
}

export async function createTenantFromLead(
  leadId: string,
  opts: CreateFromLeadOptions = {}
): Promise<CreateFromLeadResult> {
  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('partner_requests')
    .select('*')
    .eq('id', leadId)
    .single()
  if (leadErr || !lead) return { ok: false, error: 'Lead not found' }

  // Idempotent — already converted.
  if (lead.converted_tenant_id) {
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, name, status')
      .eq('id', lead.converted_tenant_id)
      .single()
    return { ok: true, tenant: existing || undefined, alreadyConverted: true }
  }

  const name: string = lead.business_name || lead.contact_name || 'New tenant'
  const industry = mapIndustry(lead.service_category)
  const admins = opts.admins ?? lead.proposal_admins ?? 1
  const teamMembers = opts.teamMembers ?? lead.proposal_team_members ?? 0
  const monthly = computeMonthly(admins, teamMembers)
  const status = opts.status || 'pending'

  // Carry the full sales thread (notes + qualifying context) onto the tenant.
  const fitContext = [
    lead.fit_bucket ? `Fit: ${lead.fit_bucket} (${lead.fit_score ?? '—'})` : '',
    lead.pain_point ? `Pain: ${lead.pain_point}` : '',
    lead.lead_gen_spend ? `Lead-gen spend: ${lead.lead_gen_spend}` : '',
    lead.automation_comfort ? `Automation: ${lead.automation_comfort}` : '',
  ].filter(Boolean).join(' · ')
  const salesNotes = (lead.admin_notes || '').trim()
  const adminNotes = [salesNotes, fitContext ? `From lead — ${fitContext}` : ''].filter(Boolean).join('\n\n')

  // ── Territory reservation (atomicity rule #1) ───────────────────────────
  // Lock the contended resource (territory × category) BEFORE creating the
  // tenant. If it's already claimed we abort here — no orphaned "paid but
  // unclaimed" tenant. Reserve with tenant_id=null, then attach the tenant
  // once it exists (and release the reservation if tenant creation fails).
  let reservedClaimId: string | null = null
  if (lead.territory_id && lead.category_id) {
    const priceCents =
      lead.proposal_monthly != null ? Math.round(Number(lead.proposal_monthly) * 100) : null
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from('territory_claims')  // tenant-scope-ok: territory reservation created pre-tenant; tenant_id set after tenant creation
      .insert({
        territory_id: lead.territory_id,
        category_id: lead.category_id,
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        price_cents: priceCents,
        billing_interval: 'monthly',
        stripe_subscription_id: opts.stripeSubscriptionId ?? null,
      })
      .select('id')
      .single()
    if (claimErr) {
      // 23505 = the unique (territory, category) lock. Reclaim an abandoned
      // reservation (tenant_id IS NULL) from a prior failed run; otherwise the
      // territory is genuinely taken and the sale cannot complete.
      if (claimErr.code === '23505') {
        const { data: existing } = await supabaseAdmin
          .from('territory_claims')
          .select('id, tenant_id')
          .eq('territory_id', lead.territory_id)
          .eq('category_id', lead.category_id)
          .maybeSingle()
        if (existing && existing.tenant_id == null) {
          reservedClaimId = existing.id as string
        } else {
          return { ok: false, error: 'Territory already claimed for that category — cannot convert.' }
        }
      } else {
        return { ok: false, error: `Territory reservation failed: ${claimErr.message}` }
      }
    } else {
      reservedClaimId = claim!.id as string
    }
  }

  // Unique slug — suffix on collision.
  const base = slugify(name) || 'tenant'
  let slug = base
  for (let i = 2; i < 50; i++) {
    const { data: clash } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }

  const { data: tenant, error: insErr } = await supabaseAdmin
    .from('tenants')
    .insert({
      name,
      slug,
      industry,
      status,
      timezone: zipToTimezone(lead.billing_zip),
      // Paid proposal (subscription linked) → billing-active so seat edits sync to
      // Stripe. Manual/comp conversions stay in setup until billing is wired.
      billing_status: opts.stripeSubscriptionId ? 'active' : 'setup',
      monthly_rate: monthly,
      admin_seats: admins,
      team_seats: teamMembers,
      ...(opts.stripeSubscriptionId && { stripe_subscription_id: opts.stripeSubscriptionId }),
      ...(lead.category_id && { primary_category_id: lead.category_id }),
      ...(lead.territory_id && { home_territory_id: lead.territory_id }),
      owner_name: lead.contact_name || null,
      owner_email: lead.email || null,
      owner_phone: lead.phone || null,
      phone: lead.phone || null,
      email: lead.email || null,
      address: lead.billing_address || null,
      ...(adminNotes && { admin_notes: adminNotes }),
    })
    .select('id, slug, name, status')
    .single()
  if (insErr || !tenant) {
    // Tenant creation failed — release the territory reservation so it doesn't
    // stay locked to a tenant that never existed (atomicity: both or neither).
    if (reservedClaimId) {
      await supabaseAdmin.from('territory_claims').delete().eq('id', reservedClaimId)
    }
    return { ok: false, error: insErr?.message || 'Tenant create failed' }
  }

  // Bust tenant-lookup.ts's negatively-cached slug entry for this exact slug,
  // if one exists. getTenantBySlug() caches a "no tenant" result for the full
  // 5-minute TTL on ANY miss (a bot/crawler wildcard-subdomain scan, an admin
  // previewing the URL before conversion, a prior failed conversion attempt
  // that reused this business name) — invalidateTenantCache() can't reach that
  // entry (it only sweeps POSITIVE entries, matched by tenant id, which a
  // negative cache row has none of). Same class already fixed on tenant
  // deletion (admin/businesses/[id]/route.ts DELETE ->
  // invalidateSlugCache(doomed.slug)) but never wired into either
  // tenant-creation path — without this, a brand-new tenant's own subdomain
  // can keep resolving to "no tenant" on a warm edge isolate for up to the
  // rest of the TTL immediately after this function reports the paid/comp
  // conversion as complete.
  const { invalidateSlugCache } = await import('./tenant-lookup')
  invalidateSlugCache(slug)

  // Attach the reserved territory to the now-created tenant (completes the claim).
  if (reservedClaimId) {
    await supabaseAdmin
      .from('territory_claims')
      .update({ tenant_id: tenant.id })
      .eq('id', reservedClaimId)
  }

  // Seed industry defaults. Best-effort — a seeding failure must not orphan the tenant.
  try {
    await provisionTenant({ tenantId: tenant.id, industry })
  } catch (e) {
    console.error('[create-tenant-from-lead] provision failed:', e)
  }

  // Seed the onboarding checklist (Stripe/Telnyx/Resend/DNS/10DLC/Google) so the
  // sold tenant has an actionable path to go live. Best-effort — never orphan.
  try {
    await seedOnboardingTasks(tenant.id)
  } catch (e) {
    console.error('[create-tenant-from-lead] onboarding seed failed:', e)
  }

  // Carry the lead's note thread onto the tenant (timestamps preserved).
  const { data: leadNotes } = await supabaseAdmin
    .from('crm_notes')
    .select('body, image_urls, author, created_at')
    .eq('subject_type', 'lead')
    .eq('subject_id', leadId)
  if (leadNotes && leadNotes.length) {
    await supabaseAdmin.from('crm_notes').insert(
      leadNotes.map(n => ({
        subject_type: 'tenant', subject_id: tenant.id,
        body: n.body, image_urls: n.image_urls, author: n.author, created_at: n.created_at,
      }))
    )
  }

  // Link lead → tenant. Sales ends at 'sold'; the tenant side takes over after.
  await supabaseAdmin
    .from('partner_requests')
    .update({
      converted_tenant_id: tenant.id,
      status: 'sold',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
    })
    .eq('id', leadId)

  // Owner login: create an owner member with a PIN so they can sign in on the
  // PIN pad — no email, no password. The plaintext PIN is returned ONCE for the
  // admin to relay (pin_hash is one-way; it can't be recovered later).
  //
  // error checked explicitly (not discarded): the insert's own returned
  // `error` was never read, only exceptions were caught — but supabase-js
  // resolves DB errors (RLS deny, constraint violation) into that `error`
  // field rather than throwing. A genuine failure there used to leave
  // `ownerPin` set to a real-looking PIN with no matching tenant_members row,
  // returned as if provisioning succeeded. The one caller that surfaces this
  // to a human (admin/sales/LeadsPanel.tsx) displays exactly that dead PIN
  // for the admin to relay to the owner, who could never log in with it —
  // silently, since this path returns `ok:true` regardless.
  let ownerPin: string | null = null
  try {
    ownerPin = String(crypto.randomInt(100000, 1000000)) // 6-digit
    const { error: memberInsertError } = await supabaseAdmin.from('tenant_members').insert({
      tenant_id: tenant.id,
      email: lead.email || null,
      name: lead.contact_name || lead.business_name || 'Owner',
      role: 'owner',
      pin_hash: hashAdminPin(ownerPin),
      pin_set_at: new Date().toISOString(),
    })
    if (memberInsertError) {
      console.error('[create-tenant-from-lead] owner member/PIN insert error:', memberInsertError.message)
      ownerPin = null
    }
  } catch (e) {
    console.error('[create-tenant-from-lead] owner member/PIN failed:', e)
    ownerPin = null
  }

  return { ok: true, tenant, ownerPin }
}
