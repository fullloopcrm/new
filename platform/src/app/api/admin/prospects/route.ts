/**
 * Super-admin prospect review.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  let q = supabaseAdmin.from('prospects').select('*').order('created_at', { ascending: false }).limit(200)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data || [] })
}
