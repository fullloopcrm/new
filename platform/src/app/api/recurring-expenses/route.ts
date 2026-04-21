/**
 * Recurring expenses (rent, insurance, software subs, etc.)
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('recurring_expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('next_due_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    return NextResponse.json({ recurring_expenses: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/recurring-expenses', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    if (!body.label || !body.amount_cents || !body.frequency) {
      return NextResponse.json({ error: 'label, amount_cents, frequency required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('recurring_expenses')
      .insert({
        tenant_id: tenantId,
        label: body.label,
        category: body.category || null,
        amount_cents: Number(body.amount_cents),
        frequency: body.frequency,
        start_date: body.start_date || new Date().toISOString().slice(0, 10),
        end_date: body.end_date || null,
        next_due_date: body.next_due_date || body.start_date || new Date().toISOString().slice(0, 10),
        notes: body.notes || null,
        active: body.active !== false,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ recurring_expense: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/recurring-expenses', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
