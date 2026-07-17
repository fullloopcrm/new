/**
 * Client review credits — the $10 write-a-review incentive tracked by
 * `client_reviews` (migration 2026_05_19_ratings_team_bookings.sql). The SMS
 * review engine (lib/nycmaid/review-engine.ts) inserts a 'pending' row and
 * tells the client "your $10 credit will be applied", but until this route
 * existed nothing in the app could ever list, verify, or mark one paid —
 * every credit sat at 'pending' forever with zero operator visibility.
 *
 * GET — list this tenant's review credits, newest first.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('reviews.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('client_reviews')
      .select('*, clients(name), team_members(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ credits: data ?? [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
