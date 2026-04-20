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

    const baseSelect = 'price, team_member_pay, team_member_paid'

    const [{ data: weekBookings }, { data: monthBookings }, { data: yearBookings }, { data: pendingBookings }, { data: recentPayments }] = await Promise.all([
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', weekStart.toISOString()).lt('start_time', weekEnd.toISOString()),
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', monthStart.toISOString()).lte('start_time', monthEnd.toISOString()),
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', yearStart.toISOString()).lte('start_time', yearEnd.toISOString()),
      supabaseAdmin.from('bookings').select('price, team_member_pay, payment_status, team_member_paid').eq('tenant_id', tenantId).eq('status', 'completed').or('payment_status.neq.paid,team_member_paid.neq.true'),
      supabaseAdmin.from('bookings').select('id, team_member_paid_at, team_member_pay, actual_hours, start_time, clients(name), team_members(name)').eq('tenant_id', tenantId).eq('status', 'completed').eq('team_member_paid', true).not('team_member_paid_at', 'is', null).order('team_member_paid_at', { ascending: false }).limit(20),
    ])

    const sum = (arr: { price?: number | null; team_member_pay?: number | null; team_member_paid?: boolean | null }[] | null, key: 'price' | 'team_member_pay') =>
      (arr || []).reduce((s, b) => s + (b[key] || 0), 0)
    const sumPaidLabor = (arr: { team_member_pay?: number | null; team_member_paid?: boolean | null }[] | null) =>
      (arr || []).filter(b => b.team_member_paid).reduce((s, b) => s + (b.team_member_pay || 0), 0)

    const weekRevenue = sum(weekBookings, 'price')
    const weekLabor = sum(weekBookings, 'team_member_pay')
    const weekLaborPaid = sumPaidLabor(weekBookings)

    const monthRevenue = sum(monthBookings, 'price')
    const monthLabor = sum(monthBookings, 'team_member_pay')
    const monthLaborPaid = sumPaidLabor(monthBookings)

    const yearRevenue = sum(yearBookings, 'price')
    const yearLabor = sum(yearBookings, 'team_member_pay')
    const yearLaborPaid = sumPaidLabor(yearBookings)

    const pendingClientPayments = (pendingBookings || []).filter(b => b.payment_status !== 'paid').reduce((s, b) => s + (b.price || 0), 0)
    const pendingCleanerPayments = (pendingBookings || []).filter(b => !b.team_member_paid).reduce((s, b) => s + (b.team_member_pay || 0), 0)

    const [{ data: monthCommissions }, { data: yearCommissions }, { data: cleanerPayroll }, { data: monthStripePayments }, { data: monthPayouts }] = await Promise.all([
      supabaseAdmin.from('referral_commissions').select('commission_amount').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
      supabaseAdmin.from('referral_commissions').select('commission_amount').eq('tenant_id', tenantId).gte('created_at', yearStart.toISOString()).lte('created_at', yearEnd.toISOString()),
      supabaseAdmin.from('bookings').select('team_member_id, team_member_pay, team_members(name)').eq('tenant_id', tenantId).eq('status', 'completed').or('team_member_paid.is.null,team_member_paid.eq.false').not('team_member_pay', 'is', null),
      supabaseAdmin.from('payments').select('amount, tip, method').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
      supabaseAdmin.from('team_member_payouts').select('amount, instant').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
    ])

    const monthReferralCommissions = (monthCommissions || []).reduce((s, c) => s + (c.commission_amount || 0), 0)
    const yearReferralCommissions = (yearCommissions || []).reduce((s, c) => s + (c.commission_amount || 0), 0)

    const cleanerTotals: Record<string, { name: string; total: number; count: number }> = {}
    for (const b of cleanerPayroll || []) {
      if (!b.team_member_id) continue
      const cleaner = b.team_members as unknown as { name: string } | null
      if (!cleanerTotals[b.team_member_id]) cleanerTotals[b.team_member_id] = { name: cleaner?.name || 'Unknown', total: 0, count: 0 }
      cleanerTotals[b.team_member_id].total += b.team_member_pay || 0
      cleanerTotals[b.team_member_id].count++
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
      cleanerTotals: Object.entries(cleanerTotals).map(([id, d]) => ({ team_member_id: id, name: d.name, total: d.total, count: d.count })),
      monthTips,
      payments: { collected: stripeCollected, paidOut: stripePaidOut, instantPayouts, totalPayouts, byMethod: { stripe: monthStripe, zelle: monthZelle, venmo: monthVenmo } },
      stripe: { collected: stripeCollected, paidOut: stripePaidOut, instantPayouts, totalPayouts },
      recentPayments: (recentPayments || []).map(b => {
        const client = b.clients as unknown as { name: string } | null
        const cleaner = b.team_members as unknown as { name: string } | null
        return {
          id: b.id,
          team_member_paid_at: b.team_member_paid_at,
          team_member_pay: b.team_member_pay || 0,
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
