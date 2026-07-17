import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { sendCampaign } from '@/lib/campaign-send'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant: tenantCtx, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError

  try {
    const { tenantId, tenant } = tenantCtx
    const { id } = await params

    const result = await sendCampaign(id, tenantId, tenant)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ sent: result.sent })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
