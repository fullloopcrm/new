/**
 * Shared "apply a profile write" executor — the impure half of
 * routeProfileWrite (tenant-profile.ts stays a pure router: no DB, no
 * encryption, by design). Extracted from api/admin/businesses/[id]/profile
 * so the admin PATCH route and the tenant-facing /api/tenant-profile route
 * (session OR signed-token auth) apply writes through the exact same path —
 * one place that upserts the default entity, jsonb-merges selena_config /
 * compliance, and encrypts secret columns, instead of two hand-rolled copies
 * that could drift (and one of them silently forgetting encryption).
 */
import { supabaseAdmin } from './supabase'
import { tenantDb } from './tenant-db'
import { routeProfileWrite } from './tenant-profile'
import { ensureDefaultEntity } from './entity-provision'
import { encryptTenantSecrets } from './secret-crypto'
import { clearSettingsCache } from './settings'

export interface ApplyProfileWriteResult {
  saved: boolean
  ignored: string[]
}

/** Apply an incoming {key: value} map (already filtered to whatever the
 * caller is allowed to write) to its real stores. Throws on DB error. */
export async function applyProfileWrite(
  tenantId: string,
  incoming: Record<string, unknown>,
): Promise<ApplyProfileWriteResult> {
  const { tenantCols, entityCols, selenaKeys, complianceKeys, ignored } = routeProfileWrite(incoming)

  if (!Object.keys(tenantCols).length && !Object.keys(entityCols).length &&
      !Object.keys(selenaKeys).length && !Object.keys(complianceKeys).length) {
    return { saved: false, ignored }
  }

  const db = tenantDb(tenantId)

  // Entity fields → default entity row (seed it if missing).
  if (Object.keys(entityCols).length) {
    const { data: tRow } = await supabaseAdmin.from('tenants').select('name').eq('id', tenantId).single()
    await ensureDefaultEntity(tenantId, (tRow?.name as string) || 'Main')
    const { error } = await db.from('entities').update(entityCols).eq('is_default', true)
    if (error) throw new Error(`entity: ${error.message}`)
  }

  // jsonb stores → read-modify-merge so a single field never clobbers siblings.
  if (Object.keys(selenaKeys).length || Object.keys(complianceKeys).length) {
    const { data: cur } = await supabaseAdmin
      .from('tenants').select('selena_config, compliance').eq('id', tenantId).single()
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
    const { error } = await supabaseAdmin.from('tenants').update(safe).eq('id', tenantId)
    if (error) throw new Error(`tenant: ${error.message}`)
  }

  clearSettingsCache(tenantId)
  return { saved: true, ignored }
}
