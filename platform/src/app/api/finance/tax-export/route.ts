/**
 * Tax-ready CSV export for the accountant.
 * GET /api/finance/tax-export?year=YYYY  → CSV of revenue, expenses, payouts.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { entityIdFromUrl } from '@/lib/entity'

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const entityId = entityIdFromUrl(url)
    const year = url.searchParams.get('year') || String(new Date().getUTCFullYear())
    const from = `${year}-01-01`
    const to = `${year}-12-31T23:59:59Z`

    const bookingsQ = supabaseAdmin
      .from('bookings')
      .select('id, start_time, price, team_member_pay, payment_status, payment_method, payment_date, clients(name)')
      .eq('tenant_id', tenantId)
      .gte('start_time', from)
      .lte('start_time', to)
      .in('payment_status', ['paid', 'partial'])
    let expensesQ = supabaseAdmin
      .from('expenses')
      .select('date, category, subcategory, amount, vendor_name, description, payment_method, tax_deductible')
      .eq('tenant_id', tenantId)
      .gte('date', from.slice(0, 10))
      .lte('date', to.slice(0, 10))
      .order('date', { ascending: true })
    if (entityId) expensesQ = expensesQ.eq('entity_id', entityId)

    const [
      { data: bookings },
      { data: expenses },
      { data: payouts },
    ] = await Promise.all([
      bookingsQ,
      expensesQ,
      supabaseAdmin
        .from('team_member_payouts')
        .select('created_at, amount_cents, status, team_members(name, tax_business_name, tax_ein, tax_ssn_last4)')
        .eq('tenant_id', tenantId)
        .gte('created_at', from)
        .lte('created_at', to)
        .in('status', ['paid', 'succeeded', 'completed'])
        .order('created_at', { ascending: true }),
    ])

    const lines: string[] = []

    lines.push('# REVENUE')
    lines.push(['date', 'booking_id', 'client', 'amount', 'payment_method', 'payment_date'].join(','))
    for (const b of bookings || []) {
      const client = b.clients as { name?: string } | null
      lines.push([
        csvEscape((b.start_time as string).slice(0, 10)),
        csvEscape(b.id),
        csvEscape(client?.name || ''),
        csvEscape((Number(b.price) || 0).toFixed(2)),
        csvEscape(b.payment_method || ''),
        csvEscape(b.payment_date ? (b.payment_date as string).slice(0, 10) : ''),
      ].join(','))
    }

    lines.push('')
    lines.push('# EXPENSES')
    lines.push(['date', 'category', 'subcategory', 'vendor', 'amount', 'payment_method', 'tax_deductible', 'description'].join(','))
    for (const e of expenses || []) {
      lines.push([
        csvEscape(e.date as string),
        csvEscape(e.category as string),
        csvEscape((e as { subcategory?: string }).subcategory || ''),
        csvEscape((e as { vendor_name?: string }).vendor_name || ''),
        csvEscape((Number(e.amount) / 100).toFixed(2)),
        csvEscape((e as { payment_method?: string }).payment_method || ''),
        csvEscape((e as { tax_deductible?: boolean }).tax_deductible !== false ? 'yes' : 'no'),
        csvEscape(e.description as string || ''),
      ].join(','))
    }

    lines.push('')
    lines.push('# CONTRACTOR PAYOUTS (1099)')
    lines.push(['date', 'contractor_name', 'business_name', 'ein_or_ssn_last4', 'amount', 'status'].join(','))
    for (const p of payouts || []) {
      const tm = p.team_members as { name?: string; tax_business_name?: string; tax_ein?: string; tax_ssn_last4?: string } | null
      lines.push([
        csvEscape((p.created_at as string).slice(0, 10)),
        csvEscape(tm?.name || ''),
        csvEscape(tm?.tax_business_name || ''),
        csvEscape(tm?.tax_ein || (tm?.tax_ssn_last4 ? `***-**-${tm.tax_ssn_last4}` : '')),
        csvEscape(((Number(p.amount_cents) || 0) / 100).toFixed(2)),
        csvEscape(p.status as string || ''),
      ].join(','))
    }

    const csv = lines.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tax-export-${year}.csv"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/tax-export', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
