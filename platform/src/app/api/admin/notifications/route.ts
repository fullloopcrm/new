import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: notifications } = await supabaseAdmin
    .from('notifications')
    .select('*, tenants(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ notifications })
}
