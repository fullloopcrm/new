/**
 * Tenant-scoped domain notes (per-domain admin notes).
 * Ported from nycmaid. Auth: settings.view/settings.edit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('settings.view')
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('domain_notes')
    .select('*')
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notes: Record<string, string> = {}
  data?.forEach(row => {
    notes[row.domain] = row.notes || ''
  })
  return NextResponse.json({ notes })
}

export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  try {
    const { domain, notes } = await request.json()
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('domain_notes')
      .upsert(
        { tenant_id: tenant.tenantId, domain, notes: notes || '', updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id,domain' },
      )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[domain-notes] save failed:', err)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}
