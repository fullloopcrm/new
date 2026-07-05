/**
 * Onboarding PROFILE wizard — the data-collection flow the tenant owner fills to
 * fully wire their account across every module. Distinct from ../route.ts, which
 * is the go-live task checklist.
 *
 * The wizard is a POPULATOR: on submit each section is written to its existing
 * home rather than a new silo —
 *   - Business identity → the finance `entities` default row (legal_name, ein, …)
 *   - Brand / contact    → tenants columns
 *   - Persona / social / pricing → tenants.selena_config (jsonb merge)
 *   - Licensing + insurance → tenants.compliance (jsonb)
 *
 * GET  → { prefill, draft }  — current saved values + any in-progress draft
 * PUT  → { draft }           — save-for-later (partial form state), resumable
 * POST → { data }            — submit: distribute to every model, clear the draft
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeEntityType } from '@/lib/tenant-profile'

type Json = Record<string, unknown>

/** The flat wizard payload. Every field optional — the tenant fills over time. */
export interface OnboardingProfile {
  // Business identity → entities (default)
  businessName?: string
  legalName?: string
  ein?: string
  entityType?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  fiscalYearStart?: number
  // Contact + brand → tenants
  phone?: string
  email?: string
  websiteUrl?: string
  businessHours?: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  tagline?: string
  // Persona / soft → selena_config
  businessDescription?: string
  businessStory?: string
  googleReviewLink?: string
  // Public social URLs → selena_config.social
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  linkedinUrl?: string
  youtubeUrl?: string
  xUrl?: string
  // Licensing + insurance → tenants.compliance
  licenseNumber?: string
  licenseState?: string
  licenseExpiry?: string
  insuranceCarrier?: string
  insurancePolicy?: string
  insuranceCoverage?: string
  bonded?: boolean
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const [{ data: tenant }, { data: entity }] = await Promise.all([
      supabaseAdmin
        .from('tenants')
        .select('name, phone, email, website_url, business_hours, logo_url, primary_color, secondary_color, tagline, zip_code, compliance, selena_config, onboarding_draft')
        .eq('id', tenantId)
        .single(),
      supabaseAdmin
        .from('entities')
        .select('name, legal_name, ein, entity_type, address, city, state, zip, fiscal_year_start')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .maybeSingle(),
    ])

    const cfg = (tenant?.selena_config as Json) || {}
    const social = (cfg.social as Json) || {}
    const compliance = (tenant?.compliance as Json) || {}

    const prefill: OnboardingProfile = {
      businessName: entity?.name || tenant?.name || undefined,
      legalName: entity?.legal_name || undefined,
      ein: entity?.ein || undefined,
      entityType: entity?.entity_type || undefined,
      address: entity?.address || undefined,
      city: entity?.city || undefined,
      state: entity?.state || undefined,
      zip: entity?.zip || tenant?.zip_code || undefined,
      fiscalYearStart: entity?.fiscal_year_start ?? 1,
      phone: tenant?.phone || undefined,
      email: tenant?.email || undefined,
      websiteUrl: tenant?.website_url || undefined,
      businessHours: tenant?.business_hours || undefined,
      logoUrl: tenant?.logo_url || undefined,
      primaryColor: tenant?.primary_color || undefined,
      secondaryColor: tenant?.secondary_color || undefined,
      tagline: tenant?.tagline || undefined,
      businessDescription: (cfg.business_description as string) || undefined,
      businessStory: (cfg.business_story as string) || undefined,
      googleReviewLink: (cfg.google_review_link as string) || undefined,
      facebookUrl: (social.facebook as string) || undefined,
      instagramUrl: (social.instagram as string) || undefined,
      tiktokUrl: (social.tiktok as string) || undefined,
      linkedinUrl: (social.linkedin as string) || undefined,
      youtubeUrl: (social.youtube as string) || undefined,
      xUrl: (social.x as string) || undefined,
      licenseNumber: (compliance.license_number as string) || undefined,
      licenseState: (compliance.license_state as string) || undefined,
      licenseExpiry: (compliance.license_expiry as string) || undefined,
      insuranceCarrier: (compliance.insurance_carrier as string) || undefined,
      insurancePolicy: (compliance.insurance_policy as string) || undefined,
      insuranceCoverage: (compliance.insurance_coverage as string) || undefined,
      bonded: (compliance.bonded as boolean) || undefined,
    }

    return NextResponse.json({ prefill, draft: (tenant?.onboarding_draft as Json) || null })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dashboard/onboarding/profile', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** Save-for-later: persist the raw in-progress form state so the tenant can resume. */
export async function PUT(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = (await request.json().catch(() => ({}))) as { draft?: Json }
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ onboarding_draft: body.draft ?? {} })
      .eq('id', tenantId)
    if (error) throw error
    return NextResponse.json({ saved: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/dashboard/onboarding/profile', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** Submit: distribute the profile across entities / tenants / selena_config, clear draft. */
export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = (await request.json().catch(() => ({}))) as { data?: OnboardingProfile }
    const d = body.data || {}

    // 1. Business identity → default entity (upsert; one default enforced by index).
    const entityFields = {
      name: str(d.businessName) || str(d.legalName) || 'Business',
      legal_name: str(d.legalName),
      ein: str(d.ein),
      // entity_type is CHECK-constrained lowercase ('llc','s_corp',…). The wizard
      // sends 'LLC'/'S-Corp', which would violate the constraint and silently drop
      // the row. Normalize to a valid enum value.
      entity_type: normalizeEntityType(d.entityType),
      address: str(d.address),
      city: str(d.city),
      state: str(d.state),
      zip: str(d.zip),
      fiscal_year_start: typeof d.fiscalYearStart === 'number' ? d.fiscalYearStart : 1,
    }
    const { data: existingEntity } = await supabaseAdmin
      .from('entities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .maybeSingle()
    if (existingEntity) {
      await supabaseAdmin.from('entities').update(entityFields).eq('id', existingEntity.id)
    } else {
      await supabaseAdmin.from('entities').insert({ tenant_id: tenantId, is_default: true, active: true, ...entityFields })
    }

    // 2. Persona / social → merge into selena_config (never clobber the whole blob).
    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', tenantId)
      .single()
    const cfg = (current?.selena_config as Json) || {}
    const social = (cfg.social as Json) || {}
    const mergedConfig: Json = {
      ...cfg,
      ...(str(d.businessDescription) && { business_description: str(d.businessDescription) }),
      ...(str(d.businessStory) && { business_story: str(d.businessStory) }),
      ...(str(d.googleReviewLink) && { google_review_link: str(d.googleReviewLink) }),
      social: {
        ...social,
        ...(str(d.facebookUrl) && { facebook: str(d.facebookUrl) }),
        ...(str(d.instagramUrl) && { instagram: str(d.instagramUrl) }),
        ...(str(d.tiktokUrl) && { tiktok: str(d.tiktokUrl) }),
        ...(str(d.linkedinUrl) && { linkedin: str(d.linkedinUrl) }),
        ...(str(d.youtubeUrl) && { youtube: str(d.youtubeUrl) }),
        ...(str(d.xUrl) && { x: str(d.xUrl) }),
      },
    }

    // 3. Licensing + insurance → tenants.compliance jsonb.
    const compliance: Json = {
      license_number: str(d.licenseNumber),
      license_state: str(d.licenseState),
      license_expiry: str(d.licenseExpiry),
      insurance_carrier: str(d.insuranceCarrier),
      insurance_policy: str(d.insurancePolicy),
      insurance_coverage: str(d.insuranceCoverage),
      bonded: !!d.bonded,
    }

    // 4. Brand + contact → tenants columns. Clear the draft, stamp completion.
    const tenantUpdate: Json = {
      selena_config: mergedConfig,
      compliance,
      onboarding_draft: null,
      onboarding_completed_at: new Date().toISOString(),
    }
    if (str(d.phone)) tenantUpdate.phone = str(d.phone)
    if (str(d.email)) tenantUpdate.email = str(d.email)
    if (str(d.websiteUrl)) tenantUpdate.website_url = str(d.websiteUrl)
    if (str(d.businessHours)) tenantUpdate.business_hours = str(d.businessHours)
    if (str(d.logoUrl)) tenantUpdate.logo_url = str(d.logoUrl)
    if (str(d.primaryColor)) tenantUpdate.primary_color = str(d.primaryColor)
    if (str(d.secondaryColor)) tenantUpdate.secondary_color = str(d.secondaryColor)
    if (str(d.tagline)) tenantUpdate.tagline = str(d.tagline)
    if (str(d.zip)) tenantUpdate.zip_code = str(d.zip)

    const { error } = await supabaseAdmin.from('tenants').update(tenantUpdate).eq('id', tenantId)
    if (error) throw error

    return NextResponse.json({ submitted: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/dashboard/onboarding/profile', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
