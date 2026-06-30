/**
 * POST /api/admin/requests/convert  { id }
 *
 * The Sales spine: turn a won lead (partner_requests) into a tenant.
 *  1. Create a tenant prefilled from the lead (status 'pending').
 *  2. Seed industry defaults via provisionTenant (services, persona, hours…).
 *  3. Link the lead → tenant (converted_tenant_id) and advance it to 'onboarded'.
 *
 * Idempotent: a lead already converted returns its existing tenant.
 * The new tenant lands in Sales → Accounts "Pending Activation"; the existing
 * Activate control promotes it to live.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { provisionTenant } from '@/lib/provision-tenant'

type IndustryKey = 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'

// Best-effort map from a free-text lead service_category to a provisioning preset.
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

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('partner_requests')
    .select('*')
    .eq('id', id)
    .single()
  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // Idempotent — already converted.
  if (lead.converted_tenant_id) {
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, name, status')
      .eq('id', lead.converted_tenant_id)
      .single()
    return NextResponse.json({ tenant: existing, alreadyConverted: true })
  }

  const name: string = lead.business_name || lead.contact_name || 'New tenant'
  const industry = mapIndustry(lead.service_category)

  // Carry the qualifying context onto the tenant so it survives the handoff.
  const convertNote = [
    lead.fit_bucket ? `Fit: ${lead.fit_bucket} (${lead.fit_score ?? '—'})` : '',
    lead.pain_point ? `Pain: ${lead.pain_point}` : '',
    lead.lead_gen_spend ? `Lead-gen spend: ${lead.lead_gen_spend}` : '',
    lead.automation_comfort ? `Automation: ${lead.automation_comfort}` : '',
  ].filter(Boolean).join(' · ')

  // Unique slug — suffix on collision.
  const base = slugify(name) || 'tenant'
  let slug = base
  for (let i = 2; i < 50; i++) {
    const { data: clash } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }

  // Create tenant — 'pending' so it shows in Sales → Accounts "Pending Activation".
  const { data: tenant, error: insErr } = await supabaseAdmin
    .from('tenants')
    .insert({
      name,
      slug,
      industry,
      status: 'pending',
      billing_status: 'setup',
      owner_name: lead.contact_name || null,
      owner_email: lead.email || null,
      owner_phone: lead.phone || null,
      phone: lead.phone || null,
      email: lead.email || null,
      primary_color: '#0d9488',
      ...(convertNote && { admin_notes: `From lead — ${convertNote}` }),
    })
    .select()
    .single()
  if (insErr || !tenant) {
    return NextResponse.json({ error: insErr?.message || 'Tenant create failed' }, { status: 500 })
  }

  // Seed industry defaults. Best-effort — a seeding failure must not orphan the tenant.
  try {
    await provisionTenant({ tenantId: tenant.id, industry })
  } catch (e) {
    console.error('[convert] provision failed:', e)
  }

  // Link lead → tenant. Sales ends at 'sold' (tenant side takes over after).
  await supabaseAdmin
    .from('partner_requests')
    .update({
      converted_tenant_id: tenant.id,
      status: 'sold',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
    })
    .eq('id', id)

  return NextResponse.json({ tenant })
}
