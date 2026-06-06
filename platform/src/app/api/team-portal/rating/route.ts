import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamMemberId = searchParams.get('team_member_id') || searchParams.get('cleaner_id')
  if (!teamMemberId) {
    return NextResponse.json({ error: 'Missing team_member_id' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('avg_rating, rating_count')
    .eq('id', teamMemberId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    avg: data?.avg_rating != null ? Number(data.avg_rating) : null,
    count: data?.rating_count || 0,
  })
}
