/**
 * Sub-tenant creation — the "add a location / franchise unit" door under an
 * existing head tenant. Seeds visual + service defaults from the parent row
 * as a one-time starting point (not a live sync — the sub-tenant is free to
 * diverge from there). Everything identity/contact/billing/credential-shaped
 * stays independent per location by construction: this function never reads
 * or copies the parent's owner_*, address, phone, email, billing_status,
 * monthly_rate, stripe_*, telnyx_*, or resend_* columns.
 *
 * Creation only — activation is unchanged. The new row funnels through the
 * SAME activateTenant() every tenant uses; head/sub is a data relationship,
 * not a different activation path.
 */
import { supabaseAdmin } from './supabase'
export { wouldCreateCycle } from './tenant-hierarchy'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export interface CreateSubTenantInput {
  parentTenantId: string
  name: string
  ownerEmail?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  address?: string | null
  zipCode?: string | null
  phone?: string | null
  email?: string | null
}

export interface CreateSubTenantResult {
  ok: boolean
  tenant?: { id: string; slug: string; name: string }
  error?: string
}

export async function createSubTenant(input: CreateSubTenantInput): Promise<CreateSubTenantResult> {
  const { data: parent, error: parentErr } = await supabaseAdmin
    .from('tenants')
    .select('id, industry, primary_category_id, timezone, logo_url, primary_color, secondary_color, tagline, website_content, selena_config')
    .eq('id', input.parentTenantId)
    .single()

  if (parentErr || !parent) return { ok: false, error: 'Head tenant not found' }

  const baseSlug = slugify(input.name)
  let slug = baseSlug
  let suffix = 1
  // Slugs are unique across all tenants; disambiguate on collision rather
  // than fail the whole creation.
  for (;;) {
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('tenants')
    .insert({
      name: input.name,
      slug,
      parent_tenant_id: input.parentTenantId,
      status: 'pending',
      // Seeded from the head tenant — the starting point, not a lock-in.
      // industry/primary_category_id are the exception: there is no input
      // path to override them, so every sub-tenant is locked to its head's
      // trade by construction (the territory model's "one trade per head").
      industry: parent.industry,
      primary_category_id: parent.primary_category_id,
      timezone: parent.timezone,
      logo_url: parent.logo_url,
      primary_color: parent.primary_color,
      secondary_color: parent.secondary_color,
      tagline: parent.tagline,
      website_content: parent.website_content,
      selena_config: parent.selena_config,
      // Independent per location — never inherited from the head.
      owner_email: input.ownerEmail ?? null,
      owner_name: input.ownerName ?? null,
      owner_phone: input.ownerPhone ?? null,
      address: input.address ?? null,
      zip_code: input.zipCode ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
    })
    .select('id, slug, name')
    .single()

  if (insertErr || !created) return { ok: false, error: insertErr?.message || 'Insert failed' }

  return { ok: true, tenant: created }
}
