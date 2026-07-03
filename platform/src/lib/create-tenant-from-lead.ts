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
import { provisionTenant } from './provision-tenant'
import { seedOnboardingTasks } from './onboarding-tasks'
import { computeMonthly } from './billing-pricing'
import { zipToTimezone } from './timezone'
import { hashAdminPin } from './admin-pin'
import crypto from 'crypto'

type IndustryKey = 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'

function mapIndustry(raw: string | null | undefined): IndustryKey {
  const s = (raw || '').toLowerCase()
  if (/clean|maid|janitor|housekeep/.test(s)) return 'cleaning'
  if (/landscap|lawn|garden|tree|snow|mulch/.test(s)) return 'landscaping'
  if (/hvac|heating|cooling|\bair\b/.test(s)) return 'hvac'
  if (/plumb|drain|water heater/.test(s)) return 'plumbing'
  if (/handy|repair/.test(s)) return 'handyman'
  if (/electric/.test(s)) return 'electrical'
  if (/pest|extermin|waste|removal|junk/.test(s)) return 'pest'
  return 'general'
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export interface CreateFromLeadOptions {
  /** 'new' for paid proposals, 'pending' for a comp/manual override. */
  status?: string
  /** Override seat counts; defaults to the lead's accepted proposal. */
  admins?: number
  teamMembers?: number
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
      billing_status: 'setup',
      monthly_rate: monthly,
      admin_seats: admins,
      team_seats: teamMembers,
      owner_name: lead.contact_name || null,
      owner_email: lead.email || null,
      owner_phone: lead.phone || null,
      phone: lead.phone || null,
      email: lead.email || null,
      address: lead.billing_address || null,
      primary_color: '#0d9488',
      ...(adminNotes && { admin_notes: adminNotes }),
    })
    .select('id, slug, name, status')
    .single()
  if (insErr || !tenant) return { ok: false, error: insErr?.message || 'Tenant create failed' }

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
  let ownerPin: string | null = null
  try {
    ownerPin = String(crypto.randomInt(100000, 1000000)) // 6-digit
    await supabaseAdmin.from('tenant_members').insert({
      tenant_id: tenant.id,
      email: lead.email || null,
      name: lead.contact_name || lead.business_name || 'Owner',
      role: 'owner',
      pin_hash: hashAdminPin(ownerPin),
      pin_set_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[create-tenant-from-lead] owner member/PIN failed:', e)
    ownerPin = null
  }

  return { ok: true, tenant, ownerPin }
}
