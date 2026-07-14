/**
 * Canonical tenant-profile read/write API — Stage 1 foundation.
 *
 * ONE endpoint the redesigned one-form UI sits on. Every field routes to its
 * correct real store via the PROFILE_FIELDS registry (tenant column / default
 * entity / selena_config merge / compliance merge) — no surface hand-maps
 * fragments anymore. Field-level PATCH is what makes the form live-save with no
 * draft/final split.
 *
 *   GET   → { profile: {tenantId,funnel,fields[]}, readiness }
 *   PATCH → { field, value }  |  { values: {key:value,…} }   → applied, fresh readiness
 *
 * Secrets (stripe/resend/telnyx/… keys) are encrypted at rest via
 * encryptTenantSecrets. jsonb stores are read-modify-merged so a single-field
 * save never clobbers sibling keys.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantProfile, routeProfileWrite } from '@/lib/tenant-profile'
import { computeReadiness } from '@/lib/tenant-readiness'
import { ensureDefaultEntity } from '@/lib/entity-provision'
import { encryptTenantSecrets } from '@/lib/secret-crypto'
import { clearSettingsCache } from '@/lib/settings'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const profile = await getTenantProfile(id)
  if (!profile) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  const readiness = await computeReadiness(id)

  return NextResponse.json({
    profile: {
      tenantId: profile.tenantId,
      name: profile.name,
      slug: profile.slug,
      status: profile.status,
      funnel: profile.funnel,
      fields: profile.fields.map((f) => ({
        key: f.key, label: f.label, section: f.section, value: f.value, filled: f.filled,
        tier: f.tier, readonly: !!f.readonly, kind: f.kind || 'text',
        input: f.input || 'text', options: f.options || null, funnels: f.funnels || null,
      })),
    },
    readiness,
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const body = (await req.json().catch(() => ({}))) as { field?: string; value?: unknown; values?: Record<string, unknown> }
  const incoming: Record<string, unknown> =
    body.field ? { [body.field]: body.value } : (body.values && typeof body.values === 'object' ? body.values : {})
  if (Object.keys(incoming).length === 0) {
    return NextResponse.json({ error: 'Provide { field, value } or { values }' }, { status: 400 })
  }

  const { tenantCols, entityCols, selenaKeys, complianceKeys, ignored } = routeProfileWrite(incoming)

  if (!Object.keys(tenantCols).length && !Object.keys(entityCols).length &&
      !Object.keys(selenaKeys).length && !Object.keys(complianceKeys).length) {
    return NextResponse.json({ error: 'No writable fields', ignored }, { status: 400 })
  }

  const db = tenantDb(id)

  try {
    // Entity fields → default entity row (seed it if missing).
    if (Object.keys(entityCols).length) {
      const { data: tRow } = await supabaseAdmin.from('tenants').select('name').eq('id', id).single()
      await ensureDefaultEntity(id, (tRow?.name as string) || 'Main')
      const { error } = await db
        .from('entities')
        .update(entityCols)
        .eq('is_default', true)
      if (error) throw new Error(`entity: ${error.message}`)
    }

    // jsonb stores → read-modify-merge so a single field never clobbers siblings.
    if (Object.keys(selenaKeys).length || Object.keys(complianceKeys).length) {
      const { data: cur } = await supabaseAdmin
        .from('tenants').select('selena_config, compliance').eq('id', id).single()
      if (Object.keys(selenaKeys).length) {
        tenantCols.selena_config = { ...((cur?.selena_config as Record<string, unknown>) || {}), ...selenaKeys }
      }
      if (Object.keys(complianceKeys).length) {
        tenantCols.compliance = { ...((cur?.compliance as Record<string, unknown>) || {}), ...complianceKeys }
      }
    }

    // Tenant columns (+ merged jsonb) → encrypt secrets, then write.
    if (Object.keys(tenantCols).length) {
      const safe = encryptTenantSecrets(tenantCols)
      const { error } = await supabaseAdmin.from('tenants').update(safe).eq('id', id)
      if (error) throw new Error(`tenant: ${error.message}`)
    }

    clearSettingsCache(id)
    const readiness = await computeReadiness(id)
    return NextResponse.json({ saved: true, ignored, readiness })
  } catch (err) {
    console.error('PATCH /api/admin/businesses/[id]/profile', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 })
  }
}
