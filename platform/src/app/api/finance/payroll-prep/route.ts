/**
 * Payroll / 1099 prep — per team member gross pay + hours + payouts,
 * plus annual 1099-flag when year-to-date hits $600.
 *
 * GET /api/finance/payroll-prep?from=YYYY-MM-DD&to=YYYY-MM-DD
 * GET /api/finance/payroll-prep?year=YYYY  (for 1099 year-end)
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const year = url.searchParams.get('year')
    let from: string, to: string
    if (year) {
      from = `${year}-01-01`
      to = `${year}-12-31`
    } else {
      const now = new Date()
      from = url.searchParams.get('from') || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
      to = url.searchParams.get('to') || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
    }
    const toTs = `${to}T23:59:59Z`

    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select('id, name, phone, tax_classification, tax_ein, tax_ssn_last4, tax_business_name, tax_address, tax_city, tax_state, tax_zip')
      .eq('tenant_id', tenantId)
      .neq('active', false)

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, team_member_id, team_member_pay, actual_hours, start_time, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_time', from)
      .lte('start_time', toTs)

    const { data: payouts } = await supabaseAdmin
      .from('team_member_payouts')
      .select('team_member_id, amount_cents, status, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', from)
      .lte('created_at', toTs)

    type Row = {
      team_member_id: string
      name: string
      phone: string | null
      tax_classification: string | null
      tax_ein: string | null
      tax_ssn_last4: string | null
      tax_business_name: string | null
      tax_address_full: string | null
      hours: number
      jobs: number
      gross_pay_cents: number
      paid_out_cents: number
      balance_owed_cents: number
      hits_1099_threshold: boolean
    }

    const rowMap = new Map<string, Row>()
    for (const tm of teamMembers || []) {
      const addr = [tm.tax_address, tm.tax_city, tm.tax_state, tm.tax_zip].filter(Boolean).join(', ')
      rowMap.set(tm.id, {
        team_member_id: tm.id,
        name: tm.name || 'Unknown',
        phone: tm.phone,
        tax_classification: tm.tax_classification,
        tax_ein: tm.tax_ein,
        tax_ssn_last4: tm.tax_ssn_last4,
        tax_business_name: tm.tax_business_name,
        tax_address_full: addr || null,
        hours: 0,
        jobs: 0,
        gross_pay_cents: 0,
        paid_out_cents: 0,
        balance_owed_cents: 0,
        hits_1099_threshold: false,
      })
    }

    for (const b of bookings || []) {
      if (!b.team_member_id) continue
      const row = rowMap.get(b.team_member_id)
      if (!row) continue
      row.hours += Number(b.actual_hours) || 0
      row.jobs += 1
      row.gross_pay_cents += Math.round(Number(b.team_member_pay || 0) * 100)
    }

    for (const p of payouts || []) {
      if (!p.team_member_id) continue
      if (p.status !== 'paid' && p.status !== 'succeeded' && p.status !== 'completed') continue
      const row = rowMap.get(p.team_member_id)
      if (!row) continue
      row.paid_out_cents += Number(p.amount_cents) || 0
    }

    const rows = Array.from(rowMap.values()).map(r => ({
      ...r,
      balance_owed_cents: Math.max(0, r.gross_pay_cents - r.paid_out_cents),
      hits_1099_threshold: r.gross_pay_cents >= 60000, // $600 in cents
    })).sort((a, b) => b.gross_pay_cents - a.gross_pay_cents)

    const totals = {
      total_hours: rows.reduce((a, r) => a + r.hours, 0),
      total_jobs: rows.reduce((a, r) => a + r.jobs, 0),
      total_gross_cents: rows.reduce((a, r) => a + r.gross_pay_cents, 0),
      total_paid_out_cents: rows.reduce((a, r) => a + r.paid_out_cents, 0),
      total_balance_cents: rows.reduce((a, r) => a + r.balance_owed_cents, 0),
      contractors_above_1099_threshold: rows.filter(r => r.hits_1099_threshold).length,
    }

    return NextResponse.json({ period: { from, to }, rows, totals })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/payroll-prep', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
