import { createClient } from '@supabase/supabase-js'
import { getAuditActor } from './audit-context'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Public client — used for client-side queries (respects RLS)
export const supabase = createClient(url, anonKey)

// Admin client — used for server-side operations (bypasses RLS)
const adminClient = createClient(url, serviceKey)

const AUDITED_ACTIONS = ['insert', 'update', 'upsert', 'delete'] as const
type AuditedAction = (typeof AUDITED_ACTIONS)[number]

// tenant_audit_log is the sink itself; impersonation_events is the older,
// narrower log this one supersedes for write tracking. Never audit writes to
// either — an audit insert auditing itself would recurse the log, not the app.
const AUDIT_EXEMPT_TABLES = new Set(['tenant_audit_log', 'impersonation_events'])

function extractRecordId(data: unknown): string | null {
  if (!data) return null
  const row = Array.isArray(data) ? data[0] : data
  if (row && typeof row === 'object' && 'id' in (row as Record<string, unknown>)) {
    const id = (row as Record<string, unknown>).id
    return id == null ? null : String(id)
  }
  return null
}

async function recordTenantWrite(
  table: string,
  action: AuditedAction,
  result: { data: unknown; error: unknown },
): Promise<void> {
  const actor = getAuditActor()
  if (!actor || result.error) return
  try {
    await adminClient.from('tenant_audit_log').insert({
      actor_kind: actor.actorKind,
      actor_id: actor.actorId,
      actor_role: actor.actorRole,
      tenant_id: actor.tenantId,
      table_name: table,
      action,
      record_id: extractRecordId(result.data),
      path: actor.path,
      method: actor.method,
      ip: actor.ip,
      user_agent: actor.userAgent,
    })
  } catch (e) {
    // Best-effort. Never block a request on audit log failure.
    console.error('[tenant-audit] insert failed:', e)
  }
}

// postgrest-js chain methods (.eq, .select, .single, ...) mutate `this` and
// return the same instance, so patching `.then` as an own property on the
// builder returned by insert/update/upsert/delete survives the rest of the
// chain and fires exactly once, when the caller finally awaits it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function auditBuilder<T extends { then: (...args: any[]) => unknown }>(
  builder: T,
  table: string,
  action: AuditedAction,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalThen = (builder.then as (...args: any[]) => unknown).bind(builder)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(builder as any).then = (onFulfilled?: any, onRejected?: any) => {
    return originalThen(async (result: { data: unknown; error: unknown }) => {
      await recordTenantWrite(table, action, result)
      return onFulfilled ? onFulfilled(result) : result
    }, onRejected)
  }
  return builder
}

const originalFrom = adminClient.from.bind(adminClient)

function auditedFrom(table: string) {
  const qb = originalFrom(table)
  if (AUDIT_EXEMPT_TABLES.has(table)) return qb

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyQb = qb as any
  const { insert, update, upsert, delete: del } = anyQb
  anyQb.insert = (...args: unknown[]) => auditBuilder(insert.apply(anyQb, args), table, 'insert')
  anyQb.update = (...args: unknown[]) => auditBuilder(update.apply(anyQb, args), table, 'update')
  anyQb.upsert = (...args: unknown[]) => auditBuilder(upsert.apply(anyQb, args), table, 'upsert')
  anyQb.delete = (...args: unknown[]) => auditBuilder(del.apply(anyQb, args), table, 'delete')
  return qb
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(adminClient as any).from = auditedFrom

// Every insert/update/upsert/delete made through this client while a
// request-scoped tenant actor is known (see audit-context.ts) is mirrored to
// tenant_audit_log. See src/lib/migrations/2026_07_14_tenant_audit_log_PROPOSED.sql.
export const supabaseAdmin = adminClient
