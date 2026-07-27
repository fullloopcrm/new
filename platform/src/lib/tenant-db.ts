// Tenant-scoped database wrapper.
//
// The platform runs every query through the service_role key, which BYPASSES
// Row-Level Security. That means cross-tenant isolation currently depends on
// each route remembering to add `.eq('tenant_id', …)` — one forgotten filter is
// a data leak (see SECURITY-AUDIT). This wrapper makes the safe path the default:
//
//   const db = tenantDb(ctx.tenantId)
//   const { data } = await db.from('bookings').select('*').eq('status', 'completed')
//
// select/update/delete are auto-filtered by tenant_id; insert auto-stamps it.
// Callers keep chaining the normal PostgREST builder (.order/.single/.eq/…).
//
// Use this for TENANT-SCOPED tables only. Platform tables that have no tenant_id
// (e.g. `tenants`, `inquiries`, `leads`, `platform_settings`) must still use
// supabaseAdmin directly — those are cross-tenant by design.
//
// This is the app-layer half of defense-in-depth. The DB-layer half (positive
// RLS policies + a non-superuser role) lands separately; until then this wrapper
// is the primary guard.

import { supabaseAdmin } from './supabase'
import { reportTenantIsolationBreach } from './tenant-isolation-alert'

type Row = Record<string, unknown>

function stamp(rows: Row | Row[], tenantId: string): Row | Row[] {
  if (Array.isArray(rows)) return rows.map((r) => ({ ...r, tenant_id: tenantId }))
  return { ...rows, tenant_id: tenantId }
}

/** Strips tenant_id from an UPDATE payload so a caller can never re-tenant a row it owns. */
function stripTenantId(values: Row): Row {
  const { tenant_id: _dropped, ...rest } = values
  return rest
}

function rowIdOf(row: Row): string | number {
  return typeof row.id === 'string' || typeof row.id === 'number' ? row.id : '(no id)'
}

/**
 * Walks a result row (and, shallowly, any embedded relations like
 * `client_properties(*)` or `team_members(*)`) looking for a tenant_id that
 * doesn't match the tenant this query was scoped to. Embedded relations are
 * the documented leak pattern in this codebase (see the FK-ownership comments
 * in api/bookings/route.ts) — PostgREST embeds aren't auto-filtered by the
 * parent's .eq('tenant_id', ...), so a dangling foreign key on the row leaks
 * the related tenant's data through the embed even when the top-level row is
 * correctly scoped. Depth-capped at 3 — plenty for FK embeds, cheap enough to
 * run on every request.
 */
function collectTenantIdMismatches(
  value: unknown,
  tenantId: string,
  depth: number,
  out: { leakedTenantId: string; rowId: string | number }[],
): void {
  if (depth > 3 || value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectTenantIdMismatches(item, tenantId, depth, out)
    return
  }
  const row = value as Row
  if (typeof row.tenant_id === 'string' && row.tenant_id !== tenantId) {
    out.push({ leakedTenantId: row.tenant_id, rowId: rowIdOf(row) })
  }
  for (const key of Object.keys(row)) {
    const v = row[key]
    if (v && typeof v === 'object') collectTenantIdMismatches(v, tenantId, depth + 1, out)
  }
}

// PostgrestBuilder instances are thenables where every filter method (.eq,
// .order, .single, .range, ...) mutates internal state and returns `this` —
// only .then() actually executes the request. Shadowing .then() as an own
// property therefore survives whatever the caller chains afterward, without
// touching the public chainable API at all.
//
// No generic constraint on T here deliberately — constraining T to `{ then:
// ... }` breaks structural assignability against PostgrestBuilder's real
// (much more specific) `then` overload at every call site across the app,
// turning every downstream `.eq()`/`.order()`/`.single()` chained off
// tenantDb().select() into a type error. An unconstrained `<T>` sidesteps
// that entirely: T is inferred as whatever the caller passed in, untouched.
function withTenantGuard<T>(builder: T, tenantId: string, table: string): T {
  const thenable = builder as unknown as { then?: unknown }
  // Some test doubles (e.g. tenant-db.test.ts's recording mock) don't
  // implement a real `.then` at all since those tests never await the
  // builder — skip the guard rather than crash on `undefined.bind`.
  if (typeof thenable.then !== 'function') return builder
  const originalThen = (thenable.then as (...args: unknown[]) => unknown).bind(thenable)
  thenable.then = (
    onfulfilled?: (v: unknown) => unknown,
    onrejected?: (e: unknown) => unknown,
  ) =>
    originalThen((result: { data: unknown; error?: unknown }) => {
      if (!result?.error && result?.data) {
        const rows = Array.isArray(result.data) ? (result.data as Row[]) : [result.data as Row]
        const mismatches: { leakedTenantId: string; rowId: string | number }[] = []
        for (const row of rows) collectTenantIdMismatches(row, tenantId, 0, mismatches)

        if (mismatches.length > 0) {
          const byLeakedTenant = new Map<string, (string | number)[]>()
          for (const m of mismatches) {
            if (!byLeakedTenant.has(m.leakedTenantId)) byLeakedTenant.set(m.leakedTenantId, [])
            byLeakedTenant.get(m.leakedTenantId)!.push(m.rowId)
          }
          for (const [leakedTenantId, rowIds] of byLeakedTenant) {
            // Fire-and-forget — never block or delay the response over this.
            reportTenantIsolationBreach({ requestedTenantId: tenantId, leakedTenantId, table, rowIds }).catch(() => {})
          }
        }
      }
      return onfulfilled ? onfulfilled(result) : result
    }, onrejected)
  return builder
}

export function tenantDb(tenantId: string) {
  if (!tenantId) throw new Error('tenantDb requires a tenantId')

  return {
    /** Scoped query entry point for a tenant-owned table. */
    from(table: string) {
      const base = supabaseAdmin.from(table)
      return {
        /**
         * SELECT auto-filtered to this tenant.
         *
         * `columns` is cast to `'*'` for TYPING ONLY — the real column string is
         * still passed to PostgREST at runtime. Two reasons this is deliberate:
         *   1. Widening the literal to `string` makes supabase's parser resolve the
         *      row to `GenericStringError` (a compile error on every `.data` field).
         *   2. Making the wrapper generic over the column literal makes tsc's
         *      conditional-type machinery blow up (heap OOM) against the untyped
         *      service_role client.
         * The tradeoff: callers get `data: any` from the wrapper instead of a
         * column-narrowed shape. Acceptable — the service_role client is already
         * untyped, and tenant-safety (not row typing) is this wrapper's job.
         */
        select: (columns = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => {
          // Cast to the '*' overload for TYPING ONLY — the real column string still
          // reaches PostgREST unchanged. Without this, TS resolves the generic
          // string-select overload and collapses every result to GenericStringError,
          // breaking named-field access at every call site (see p1-w1/p1-w2).
          //
          // Force tenant_id into the fetched columns so the isolation guard
          // below works even for narrow selects like .select('price') that
          // wouldn't otherwise return it. Deliberately NOT stripped back off
          // afterward — real PostgREST only returns what was actually
          // requested (so this is a no-op against production for callers who
          // didn't ask for it), and several tests in this codebase share a
          // fake (src/test/tenant-isolation-harness.ts) that always returns
          // full rows regardless of requested columns, so stripping here
          // would fight that fake instead of the guard staying inert either way.
          const hasTenantId =
            /(^|,)\s*\*\s*(,|$)/.test(columns) || /(^|,)\s*tenant_id\s*(,|$)/.test(columns)
          const widened = hasTenantId ? columns : `${columns},tenant_id`
          const builder = base.select(widened as '*', opts).eq('tenant_id', tenantId)
          // head:true returns no rows (count only) — nothing to verify.
          if (opts?.head) return builder
          return withTenantGuard(builder, tenantId, table)
        },

        /** INSERT with tenant_id stamped on every row (overrides any caller value). */
        insert: (rows: Row | Row[]) => base.insert(stamp(rows, tenantId)),

        /**
         * UPDATE auto-filtered to this tenant. tenant_id is stripped from the
         * payload (not honored even if present) so a caller spreading a raw
         * request body can never re-tenant a row it owns into another tenant.
         */
        update: (values: Row) => base.update(stripTenantId(values)).eq('tenant_id', tenantId),

        /** DELETE auto-filtered to this tenant. */
        delete: () => base.delete().eq('tenant_id', tenantId),

        /** UPSERT with tenant_id stamped; pass an onConflict target as usual. */
        upsert: (rows: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) =>
          base.upsert(stamp(rows, tenantId), opts),
      }
    },
  }
}

export type TenantDb = ReturnType<typeof tenantDb>
