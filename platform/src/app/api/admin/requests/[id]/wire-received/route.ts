/**
 * POST /api/admin/requests/:id/wire-received
 *
 * Admin confirms the $25,000 setup-fee wire landed. This is the real trigger
 * for tenant creation now — not the Stripe subscription checkout, which only
 * starts recurring billing. Creates the tenant shell (login + onboarding
 * link auto-sent via createTenantFromLead), does NOT activate it — go-live
 * stays gated on the onboarding questionnaire.
 *
 * Idempotent: a lead already converted returns its existing tenant.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { createTenantFromLead } from '@/lib/create-tenant-from-lead'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const wireReceivedAt = new Date().toISOString()

  await supabaseAdmin
    .from('partner_requests')
    .update({ wire_received_at: wireReceivedAt })
    .eq('id', id)
    .is('wire_received_at', null)

  const result = await createTenantFromLead(id, { status: 'new', setupFeePaidAt: wireReceivedAt })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Tenant creation failed' }, { status: 500 })
  }

  return NextResponse.json({
    tenant: result.tenant,
    alreadyConverted: result.alreadyConverted,
    ownerPin: result.ownerPin,
  })
}
