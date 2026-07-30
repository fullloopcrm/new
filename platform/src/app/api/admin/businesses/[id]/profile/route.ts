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
import { getTenantProfile } from '@/lib/tenant-profile'
import { computeReadiness } from '@/lib/tenant-readiness'
import { applyProfileWrite } from '@/lib/tenant-profile-write'

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

  try {
    const { saved, ignored } = await applyProfileWrite(id, incoming)
    if (!saved) return NextResponse.json({ error: 'No writable fields', ignored }, { status: 400 })

    const readiness = await computeReadiness(id)
    return NextResponse.json({ saved: true, ignored, readiness })
  } catch (err) {
    console.error('PATCH /api/admin/businesses/[id]/profile', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 })
  }
}
