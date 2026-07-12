import { headers } from 'next/headers'
import { supabaseAdmin } from './supabase'

/**
 * P9: tenant-write audit logging.
 *
 * Generalizes the impersonation-audit pattern (see logImpersonationEvent in
 * tenant-query.ts) to cover EVERY tenant-write action, by any actor. Where
 * impersonation_events records "an admin touched this tenant while impersonating,"
 * tenant_write_events records "this actor changed this resource, this way."
 *
 * Design contract:
 *   - Best-effort. An audit-insert failure must NEVER block or fail the mutation
 *     it describes. All errors are swallowed and logged to the server console.
 *   - Append-only. Writes go to tenant_write_events via the service-role client;
 *     nothing here reads or mutates existing audit rows.
 *   - Call AFTER the underlying write has succeeded, so the log reflects committed
 *     state, not attempts.
 *
 * NOT yet wired into any route — this is a standalone module ready to be adopted.
 * Backing table DDL: src/lib/migrations/2026_07_12_tenant_write_audit.sql.
 * Full rationale + action taxonomy: docs/design/audit-logging-expansion.md.
 */

const AUDIT_TABLE = 'tenant_write_events'

/** Who performed a tenant-write. Mirrors the check constraint in the migration. */
export type AuditActorKind =
  | 'owner'
  | 'member'
  | 'pin_admin'
  | 'clerk_super_admin'
  | 'jefe'
  | 'system'

export interface TenantWriteAudit {
  /** Tenant whose data changed. */
  tenantId: string
  /** Class of actor. */
  actorKind: AuditActorKind
  /** Stable actor id: Clerk user id, member id, 'admin', 'jefe', or a job name. */
  actorId: string
  /**
   * Dot-namespaced verb: '<resource>.<verb>', e.g. 'job.create',
   * 'customer.update', 'invoice.void'. Keep verbs in the taxonomy documented in
   * docs/design/audit-logging-expansion.md so queries stay predictable.
   */
  action: string
  /** Resource kind, e.g. 'job', 'customer', 'invoice'. */
  resourceType?: string
  /** Affected row id (may be a slug/composite id, hence string). */
  resourceId?: string | null
  /** True when the write happened under an active fl_impersonate cookie. */
  viaImpersonation?: boolean
  /** Free-form context: field diffs, before/after snippets, request ids. */
  meta?: Record<string, unknown>
}

/**
 * Reads request provenance (path/method/ip/user-agent) from the current Next.js
 * request headers. Returns nulls off-request (e.g. background jobs) instead of
 * throwing — this is best-effort context, never a hard requirement.
 */
async function requestProvenance(): Promise<{
  path: string | null
  method: string | null
  ip: string | null
  user_agent: string | null
}> {
  try {
    const h = await headers()
    return {
      path: h.get('x-invoke-path') || h.get('referer') || null,
      method: h.get('x-invoke-method') || null,
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
      user_agent: h.get('user-agent'),
    }
  } catch {
    return { path: null, method: null, ip: null, user_agent: null }
  }
}

/**
 * Append one row to the tenant-write audit log. Never throws.
 *
 * @example
 *   await logTenantWrite({
 *     tenantId: ctx.tenantId,
 *     actorKind: 'owner',
 *     actorId: ctx.userId,
 *     action: 'job.create',
 *     resourceType: 'job',
 *     resourceId: job.id,
 *     meta: { status: job.status },
 *   })
 */
export async function logTenantWrite(event: TenantWriteAudit): Promise<void> {
  try {
    const prov = await requestProvenance()
    await supabaseAdmin.from(AUDIT_TABLE).insert({
      tenant_id: event.tenantId,
      actor_kind: event.actorKind,
      actor_id: event.actorId,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      via_impersonation: event.viaImpersonation ?? false,
      path: prov.path,
      method: prov.method,
      ip: prov.ip,
      user_agent: prov.user_agent,
      meta: event.meta ?? {},
    })
  } catch (e) {
    // Best-effort. Never block a request on audit-log failure.
    console.error('[tenant-write-audit] insert failed:', e)
  }
}

/**
 * Minimal shape of a resolved tenant request context (subset of TenantContext in
 * tenant-query.ts). Declared locally to keep this module free of a circular
 * import — tenant-query.ts may later import from here.
 */
export interface AuditContext {
  tenantId: string
  userId: string
  role: string
}

/**
 * Maps a resolved request context's role to an AuditActorKind. Impersonation and
 * agent writes should pass actorKind explicitly via logTenantWrite instead.
 */
function actorKindForRole(role: string): AuditActorKind {
  return role === 'owner' ? 'owner' : 'member'
}

/**
 * Convenience wrapper around logTenantWrite for the common case: a mutation made
 * by whoever getTenantForRequest() resolved. Derives actorKind from ctx.role.
 */
export async function logTenantWriteFromContext(
  ctx: AuditContext,
  action: string,
  opts: {
    resourceType?: string
    resourceId?: string | null
    viaImpersonation?: boolean
    meta?: Record<string, unknown>
  } = {},
): Promise<void> {
  await logTenantWrite({
    tenantId: ctx.tenantId,
    actorKind: actorKindForRole(ctx.role),
    actorId: ctx.userId,
    action,
    ...opts,
  })
}
