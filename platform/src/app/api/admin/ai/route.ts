import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { askSelena } from '@/lib/selena'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { message, tenantId, conversationId } = await request.json()

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  try {
    const response = await askSelena(
      tenantId,
      'web',
      message,
      conversationId || 'admin-test',
    )
    return NextResponse.json({ response })
  } catch (e) {
    console.error('Selena AI error:', e)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
