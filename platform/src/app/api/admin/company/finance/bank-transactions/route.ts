import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

// GET /api/admin/company/finance/bank-transactions?status=pending|matched|ignored
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const status = new URL(req.url).searchParams.get('status')
  let q = supabaseAdmin
    .from('platform_bank_transactions')
    .select('*')
    .order('txn_date', { ascending: false })
    .limit(500)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data || [] })
}
