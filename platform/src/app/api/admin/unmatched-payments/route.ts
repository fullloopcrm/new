import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantClient } from '@/lib/tenant-supabase'

// GET /api/admin/unmatched-payments
// Lists open `unmatched_stripe_payment` admin_tasks for the current tenant —
// real Stripe money that came in but couldn't be auto-matched to a booking
// (see src/app/api/webhooks/stripe/route.ts's NYC Maid parity fallback).
// Backs a banner on the bookings close-out panel so this money never sits
// invisible in a text message no one saw.
export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError
  const { tenantId } = tenant

  const { data, error } = await (await tenantClient(tenantId))
    .from('admin_tasks')
    .select('id, title, description, priority, status, metadata, created_at')
    .eq('tenant_id', tenantId)
    .eq('type', 'unmatched_stripe_payment')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data || [] })
}
