/**
 * Year-end package zip — P&L, Trial Balance, General Ledger,
 * Invoices, Expenses, Payouts. One-click download for accountant.
 */
import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'
import { toCsv, buildTrialBalance, buildGeneralLedger, paginateAll } from '@/lib/finance-export'

interface InvoiceRow {
  invoice_number: string
  issued_at: string
  due_date: string | null
  total_cents: number | null
  amount_paid_cents: number | null
  status: string
  contact_name: string | null
  contact_email: string | null
}

interface ExpenseRow {
  date: string
  category: string
  subcategory: string | null
  vendor_name: string | null
  amount: number | null
  description: string | null
  tax_deductible: boolean | null
}

interface PayoutRow {
  created_at: string
  amount_cents: number | null
  status: string
  team_members: unknown
}

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const url = new URL(request.url)
    const year = url.searchParams.get('year') || String(new Date().getUTCFullYear() - 1)
    const entityId = entityIdFromUrl(url)
    const from = `${year}-01-01`
    const to = `${year}-12-31`

    const zip = new JSZip()

    // Trial balance
    const tb = await buildTrialBalance(tenantId, entityId, to)
    zip.file('trial_balance.csv', toCsv(tb.map(r => ({
      code: r.coa_code, name: r.coa_name, type: r.coa_type,
      debits: (r.debits / 100).toFixed(2), credits: (r.credits / 100).toFixed(2),
      balance: ((r.debits - r.credits) / 100).toFixed(2),
    }))))

    // General ledger
    const gl = await buildGeneralLedger(tenantId, entityId, from, to)
    zip.file('general_ledger.csv', toCsv(gl))

    // Invoices/expenses/payouts are paginated — a full year of activity can
    // exceed the project's 1000-row PostgREST cap, which would otherwise
    // silently truncate the year-end package with no error.
    const invoices = await paginateAll<InvoiceRow>((offset, limit) => {
      let q = supabaseAdmin.from('invoices')
        .select('invoice_number, issued_at, due_date, total_cents, amount_paid_cents, status, contact_name, contact_email')
        .eq('tenant_id', tenantId).gte('issued_at', from).lte('issued_at', to)
      if (entityId) q = q.eq('entity_id', entityId)
      return q.range(offset, offset + limit - 1)
    })
    zip.file('invoices.csv', toCsv(invoices.map(r => ({
      number: r.invoice_number, issued: r.issued_at, due: r.due_date,
      total: ((r.total_cents || 0) / 100).toFixed(2),
      paid: ((r.amount_paid_cents || 0) / 100).toFixed(2),
      balance: (((r.total_cents || 0) - (r.amount_paid_cents || 0)) / 100).toFixed(2),
      status: r.status, contact: r.contact_name || r.contact_email,
    }))))

    // Expenses
    const expenses = await paginateAll<ExpenseRow>((offset, limit) => {
      let q = supabaseAdmin.from('expenses')
        .select('date, category, subcategory, vendor_name, amount, description, tax_deductible')
        .eq('tenant_id', tenantId).gte('date', from).lte('date', to).order('date')
      if (entityId) q = q.eq('entity_id', entityId)
      return q.range(offset, offset + limit - 1)
    })
    zip.file('expenses.csv', toCsv(expenses.map(r => ({
      date: r.date, category: r.category, subcategory: r.subcategory || '',
      vendor: r.vendor_name || '', amount: ((r.amount || 0) / 100).toFixed(2),
      description: r.description || '', deductible: r.tax_deductible !== false ? 'yes' : 'no',
    }))))

    // Contractor payouts (1099 summary)
    const payouts = await paginateAll<PayoutRow>((offset, limit) =>
      supabaseAdmin.from('team_member_payouts')
        .select('created_at, amount_cents, status, team_members(name, tax_business_name, tax_ein, tax_ssn_last4)')
        .eq('tenant_id', tenantId).gte('created_at', from).lte('created_at', `${to}T23:59:59Z`)
        .in('status', ['paid','succeeded','completed'])
        .range(offset, offset + limit - 1),
    )
    zip.file('contractor_payouts.csv', toCsv(payouts.map(r => {
      const tm = r.team_members as unknown as { name?: string; tax_business_name?: string; tax_ein?: string; tax_ssn_last4?: string } | null
      return {
        date: (r.created_at as string).slice(0, 10),
        contractor: tm?.name || '',
        business: tm?.tax_business_name || '',
        tax_id: tm?.tax_ein || (tm?.tax_ssn_last4 ? `***-**-${tm.tax_ssn_last4}` : ''),
        amount: ((r.amount_cents || 0) / 100).toFixed(2),
      }
    })))

    // Bank recs: closing balance per bank account via journal lines
    const truncationWarning = (tb.truncated || gl.truncated)
      ? '\n\n*** WARNING: This tenant has more journal activity than this export can include in one pass. trial_balance.csv and/or general_ledger.csv may be INCOMPLETE. Contact support to export a narrower date range or a single entity. ***\n'
      : ''
    if (tb.truncated || gl.truncated) {
      console.error('GET /api/finance/year-end-zip truncated', { tenantId, entityId, year, tbTruncated: !!tb.truncated, glTruncated: !!gl.truncated })
    }
    zip.file('README.txt', `Year-End Package for ${year}\n\nIncludes:\n- trial_balance.csv\n- general_ledger.csv\n- invoices.csv\n- expenses.csv\n- contractor_payouts.csv\n\nGenerated ${new Date().toISOString()}\n${truncationWarning}`)

    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="year-end-${year}.zip"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/year-end-zip', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
