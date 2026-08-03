/**
 * Records an immutable backup of a tenant's completed onboarding submission
 * — one row per final submit, never updated, independent of the live
 * `tenants` columns applyProfileWrite writes into. Called once, from
 * POST /api/tenant-profile after a successful submit.
 *
 * The DB row (the real backup) is written FIRST and does not depend on PDF
 * rendering succeeding — a render failure never costs the raw answers.
 */
import { supabaseAdmin } from './supabase'
import { buildOnboardingSnapshotPdf } from './onboarding-snapshot-pdf'

export const ONBOARDING_SNAPSHOTS_BUCKET = 'onboarding-snapshots'

export async function recordOnboardingSnapshot(opts: {
  tenantId: string
  tenantName: string
  data: Record<string, unknown>
}): Promise<void> {
  const { tenantId, tenantName, data } = opts
  const submittedAt = new Date().toISOString()

  const { data: row, error: insertErr } = await supabaseAdmin
    .from('tenant_onboarding_submissions')
    .insert({ tenant_id: tenantId, submitted_at: submittedAt, data })
    .select('id')
    .single()

  if (insertErr || !row) {
    console.error('[onboarding-snapshot] failed to record submission for', tenantId, insertErr)
    return
  }

  // PDF rendering/upload is best-effort — the row above is the real backup.
  try {
    const bytes = await buildOnboardingSnapshotPdf({ tenantName, submittedAt, data })
    const path = `${tenantId}/${row.id}.pdf`
    const { error: upErr } = await supabaseAdmin.storage
      .from(ONBOARDING_SNAPSHOTS_BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true })
    if (upErr) throw upErr
    await supabaseAdmin.from('tenant_onboarding_submissions').update({ pdf_path: path }).eq('id', row.id)
  } catch (e) {
    console.error('[onboarding-snapshot] PDF render/upload failed for', tenantId, e)
  }
}
