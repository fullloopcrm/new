/**
 * GET /api/admin/businesses/:id/selena-preview
 *
 * Returns the full system prompt Selena will use for this tenant. Use to
 * verify persona fields are actually injected without running a live
 * conversation.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { buildSystemPromptForPreview } from '@/lib/selena'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  try {
    const prompt = await buildSystemPromptForPreview(id)
    return NextResponse.json({ tenant_id: id, prompt, length: prompt.length })
  } catch (err) {
    console.error('[selena-preview]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Preview failed' }, { status: 500 })
  }
}
