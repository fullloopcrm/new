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
        select: (columns = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) =>
          base.select(columns as '*', opts).eq('tenant_id', tenantId),

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
