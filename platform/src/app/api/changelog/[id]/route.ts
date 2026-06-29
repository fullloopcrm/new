import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

// Single published update — backs the /dashboard/changelog/[id] detail page
// (the "what's coming" page each banner notice links to).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getTenantForRequest() // auth check
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { id } = await params
  const { data: entry } = await supabaseAdmin
    .from('platform_announcements')
    .select('id, title, body, type, priority, created_at')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()

  if (!entry) return NextResponse.json({ error: 'Update not found' }, { status: 404 })
  return NextResponse.json({ entry })
}
