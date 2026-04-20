import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const now = new Date()

    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

    const baseSelect = 'price, cleaner_pay, cleaner_paid'

    const [{ data: weekBookings }, { data: monthBookings }, { data: yearBookings }, { data: pendingBookings }, { data: recentPayments }] = await Promise.all([
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', weekStart.toISOString()).lt('start_time', weekEnd.toISOString()),
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', monthStart.toISOString()).lte('start_time', monthEnd.toISOString()),
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', yearStart.toISOString()).lte('start_time', yearEnd.toISOString()),
      supabaseAdmin.from('bookings').select('price, cleaner_pay, payment_status, cleaner_paid').eq('tenant_id', tenantId).eq('status', 'completed').or('payment_status.neq.paid,cleaner_paid.neq.true'),
      supabaseAdmin.from('bookings').select('id, cleaner_paid_at, cleaner_pay, actual_hours, start_time, clients(name), team_members(name)').eq('tenant_id', tenantId).eq('status', 'completed').eq('cleaner_paid', true).not('cleaner_paid_at', 'is', null).order('cleaner_paid_at', { ascending: false }).limit(20),
    ])

    const sum = (arr: { price?: number | null; cleaner_pay?: number | null; cleaner_paid?: boolean | null }[] | null, key: 'price' | 'cleaner_pay') =>
      (arr || []).reduce((s, b) => s + (b[key] || 0), 0)
    const sumPaidLabor = (arr: { cleaner_pay?: number | null; cleaner_paid?: boolean | null }[] | null) =>
      (arr || []).filter(b => b.cleaner_paid).reduce((s, b) => s + (b.cleaner_pay || 0), 0)

    const weekRevenue = sum(weekBookings, 'price')
    const weekLabor = sum(weekBookings, 'cleaner_pay')
    const weekLaborPaid = sumPaidLabor(weekBookings)

    const monthRevenue = sum(monthBookings, 'price')
    const monthLabor = sum(monthBookings, 'cleaner_pay')
    const monthLaborPaid = sumPaidLabor(monthBookings)

    const yearRevenue = sum(yearBookings, 'price')
    const yearLabor = sum(yearBookings, 'cleaner_pay')
    const yearLaborPaid = sumPaidLabor(yearBookings)

    const pendingClientPayments = (pendingBookings || []).filter(b => b.payment_status !== 'paid').reduce((s, b) => s + (b.price || 0), 0)
    const pendingCleanerPayments = (pendingBookings || []).filter(b => !b.cleaner_paid).reduce((s, b) => s + (b.cleaner_pay || 0), 0)

    const [{ data: monthCommissions }, { data: yearCommissions }, { data: cleanerPayroll }, { data: monthStripePayments }, { data: monthPayouts }] = await Promise.all([
      supabaseAdmin.from('referral_commissions').select('commission_amount').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
      supabaseAdmin.from('referral_commissions').select('commission_amount').eq('tenant_id', tenantId).gte('created_at', yearStart.toISOString()).lte('created_at', yearEnd.toISOString()),
      supabaseAdmin.from('bookings').select('cleaner_id, cleaner_pay, team_members(name)').eq('tenant_id', tenantId).eq('status', 'completed').or('cleaner_paid.is.null,cleaner_paid.eq.false').not('cleaner_pay', 'is', null),
      supabaseAdmin.from('payments').select('amount, tip, method').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
      supabaseAdmin.from('cleaner_payouts').select('amount, instant').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
    ])

    const monthReferralCommissions = (monthCommissions || []).reduce((s, c) => s + (c.commission_amount || 0), 0)
    const yearReferralCommissions = (yearCommissions || []).reduce((s, c) => s + (c.commission_amount || 0), 0)

    const cleanerTotals: Record<string, { name: string; total: number; count: number }> = {}
    for (const b of cleanerPayroll || []) {
      if (!b.cleaner_id) continue
      const cleaner = b.team_members as unknown as { name: string } | null
      if (!cleanerTotals[b.cleaner_id]) cleanerTotals[b.cleaner_id] = { name: cleaner?.name || 'Unknown', total: 0, count: 0 }
      cleanerTotals[b.cleaner_id].total += b.cleaner_pay || 0
      cleanerTotals[b.cleaner_id].count++
    }

    const allPayments = monthStripePayments || []
    const stripeCollected = allPayments.reduce((s, p) => s + (p.amount || 0), 0)
    const monthTips = allPayments.reduce((s, p) => s + (p.tip || 0), 0)
    const monthZelle = allPayments.filter(p => p.method === 'zelle').reduce((s, p) => s + (p.amount || 0), 0)
    const monthVenmo = allPayments.filter(p => p.method === 'venmo').reduce((s, p) => s + (p.amount || 0), 0)
    const monthStripe = allPayments.filter(p => p.method === 'stripe').reduce((s, p) => s + (p.amount || 0), 0)
    const stripePaidOut = (monthPayouts || []).reduce((s, p) => s + (p.amount || 0), 0)
    const instantPayouts = (monthPayouts || []).filter(p => p.instant).length
    const totalPayouts = (monthPayouts || []).length

    return NextResponse.json({
      weekRevenue, monthRevenue, yearRevenue,
      weekLabor, monthLabor, yearLabor,
      weekLaborPaid, monthLaborPaid, yearLaborPaid,
      weekLaborOwed: weekLabor - weekLaborPaid,
      monthLaborOwed: monthLabor - monthLaborPaid,
      yearLaborOwed: yearLabor - yearLaborPaid,
      weekJobs: weekBookings?.length || 0,
      monthJobs: monthBookings?.length || 0,
      yearJobs: yearBookings?.length || 0,
      pendingClientPayments, pendingCleanerPayments,
      monthReferralCommissions, yearReferralCommissions,
      cleanerTotals: Object.entries(cleanerTotals).map(([id, d]) => ({ cleaner_id: id, name: d.name, total: d.total, count: d.count })),
      monthTips,
      payments: { collected: stripeCollected, paidOut: stripePaidOut, instantPayouts, totalPayouts, byMethod: { stripe: monthStripe, zelle: monthZelle, venmo: monthVenmo } },
      stripe: { collected: stripeCollected, paidOut: stripePaidOut, instantPayouts, totalPayouts },
      recentPayments: (recentPayments || []).map(b => {
        const client = b.clients as unknown as { name: string } | null
        const cleaner = b.team_members as unknown as { name: string } | null
        return {
          id: b.id,
          cleaner_paid_at: b.cleaner_paid_at,
          cleaner_pay: b.cleaner_pay || 0,
          actual_hours: b.actual_hours || 0,
          start_time: b.start_time,
          client_name: client?.name || 'Unknown',
          cleaner_name: cleaner?.name || 'Unknown',
        }
      }),
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
