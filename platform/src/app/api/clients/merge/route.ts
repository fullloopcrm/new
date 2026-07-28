/**
 * Merge two duplicate client records into one.
 *
 * Duplicate detection already exists at client-creation time (POST
 * /api/clients warns + requires force=true) but there was no way to
 * reconcile two client records that already exist. This closes that gap.
 *
 * Reassigns every real foreign-key reference to the client being merged away
 * (`merge_id`) onto the surviving client (`keep_id`), across every table in
 * the live schema that carries a client_id column (confirmed via a live
 * read-only schema query against prod on 2026-07-28 — not guessed from grep,
 * which would risk silently missing a table and leaving orphaned rows). Then
 * soft-deactivates the merged-away client (no hard delete — same "no
 * destructive action without a way back" pattern as block_client's
 * do_not_service flag) so its history stays inspectable.
 *
 * Each table is reassigned independently and failures are collected, not
 * swallowed — a unique-constraint collision on one table (e.g. both clients
 * already have a client_properties row for the same address) must not hide
 * behind a false "success" on the rest.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'

// Every public.* table with a client_id column, per a live schema query
// against prod (information_schema.columns). Keep in sync if the schema
// changes — this list is the whole point of the feature being safe.
const CLIENT_ID_TABLES = [
  'admin_tasks', 'booking_notes', 'bookings', 'campaign_recipients',
  'client_contacts', 'client_feedback', 'client_properties', 'client_reviews',
  'client_sms_messages', 'comhub_contacts', 'connect_channels', 'deals',
  'invoices', 'jobs', 'marketing_opt_out_log', 'outreach_log', 'payments',
  'portal_auth_codes', 'portal_contact_verify_codes', 'portal_leads',
  'projects', 'property_changes', 'push_subscriptions', 'quotes', 'ratings',
  'recurring_schedules', 'renurture_log', 'reviews', 'schedule_issues',
  'selena_memory', 'sms_conversations', 'waitlist', 'yinez_memory',
] as const

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.delete')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)

    const body = await request.json().catch(() => ({}))
    const keepId = body.keep_id as string | undefined
    const mergeId = body.merge_id as string | undefined
    if (!keepId || !mergeId) {
      return NextResponse.json({ error: 'keep_id and merge_id are required' }, { status: 400 })
    }
    if (keepId === mergeId) {
      return NextResponse.json({ error: 'keep_id and merge_id must be different clients' }, { status: 400 })
    }

    // Both must belong to THIS tenant — tenantDb scopes both lookups, so a
    // foreign client_id (either side) resolves to nothing rather than
    // silently reassigning another tenant's data onto this tenant's client.
    const [{ data: keepClient }, { data: mergeClient }] = await Promise.all([
      db.from('clients').select('id, name, notes').eq('id', keepId).maybeSingle(),
      db.from('clients').select('id, name, notes').eq('id', mergeId).maybeSingle(),
    ])
    if (!keepClient) return NextResponse.json({ error: 'keep_id not found' }, { status: 404 })
    if (!mergeClient) return NextResponse.json({ error: 'merge_id not found' }, { status: 404 })

    const results: Record<string, { reassigned: number; error: string | null }> = {}
    for (const table of CLIENT_ID_TABLES) {
      const { data, error } = await db
        .from(table)
        .update({ client_id: keepId })
        .eq('client_id', mergeId)
        .select('client_id')
      results[table] = { reassigned: data?.length || 0, error: error?.message || null }
    }

    const failedTables = Object.entries(results).filter(([, r]) => r.error)

    const note = `[MERGED into ${keepId} (${(keepClient as { name?: string }).name || 'unknown'}) on ${new Date().toISOString().slice(0, 10)}]`
    await db
      .from('clients')
      .update({
        active: false,
        do_not_service: true,
        notes: mergeClient.notes ? `${mergeClient.notes}\n${note}` : note,
      })
      .eq('id', mergeId)

    await audit({
      tenantId,
      action: 'client.merged',
      entityType: 'client',
      entityId: keepId,
      details: { merged_from: mergeId, table_results: results },
    })

    return NextResponse.json({
      ok: failedTables.length === 0,
      keep_id: keepId,
      merge_id: mergeId,
      reassigned: Object.fromEntries(Object.entries(results).map(([t, r]) => [t, r.reassigned])),
      failed_tables: failedTables.length ? Object.fromEntries(failedTables) : undefined,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('POST /api/clients/merge', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
