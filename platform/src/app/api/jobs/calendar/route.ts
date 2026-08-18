/**
 * Sold Projects (jobs table) scoped to a date range, shaped for the calendar's
 * client-fetched views (Timeline, mobile day list) — the Month/Week/Day grid
 * gets jobs server-merged in /api/schedule/calendar instead. Read-only,
 * tenant-scoped, excludes cancelled.
 *
 * GET ?from=YYYY-MM-DD&to=YYYY-MM-DD → { jobs: [...] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = request.nextUrl
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const db = tenantDb(tenantId)
    const { data, error } = await db
      .from('jobs')
      .select('id, title, status, total_cents, starts_on, clients(name)')
      .gte('starts_on', from)
      .lt('starts_on', to)
      .neq('status', 'cancelled')

    if (error) {
      console.error('GET /api/jobs/calendar', error)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    const jobs = (data ?? []).map((j: Record<string, unknown>) => ({
      id: j.id as string,
      title: (j.title as string) || 'Project',
      status: j.status as string,
      client_name: ((j.clients as unknown as { name?: string } | null)?.name) || 'Unknown',
      starts_on: j.starts_on as string,
      total_cents: Number(j.total_cents || 0),
    }))

    return NextResponse.json({ jobs })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs/calendar', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
