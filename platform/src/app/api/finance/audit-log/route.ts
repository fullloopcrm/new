/**
 * Searchable audit log across all tracked tables.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { entityIdFromUrl } from '@/lib/entity'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const entityId = entityIdFromUrl(url)
    const tableName = url.searchParams.get('table')
    const rowId = url.searchParams.get('row_id')
    const event = url.searchParams.get('event')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 100)

    let q = supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (tableName) q = q.eq('table_name', tableName)
    if (rowId) q = q.eq('row_id', rowId)
    if (event) q = q.eq('event', event)
    if (entityId) q = q.eq('entity_id', entityId)
    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ log: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
