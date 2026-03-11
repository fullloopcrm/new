import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

// Round up to nearest half hour: 2.25 → 2.5, 2.1 → 2.5, 2.75 → 3.0
const roundToHalfHour = (hours: number) => Math.ceil(hours * 2) / 2

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Support legacy ?period= param as well as full earnings response
  const period = request.nextUrl.searchParams.get('period')

  // Get team member's pay rate
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  const hourlyRate = member?.pay_rate || 25

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Today's potential earnings (scheduled hours for today)
  const { data: todayJobs } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, status')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .gte('start_time', todayStart.toISOString())
    .lt('start_time', todayEnd.toISOString())
    .neq('status', 'cancelled')

  let todayPotentialHours = 0
  for (const job of todayJobs || []) {
    if (job.end_time) {
      const hours = (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 3600000
      todayPotentialHours += hours
    }
  }

  // Weekly earnings (Mon-Sun)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() + mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data: weekJobs } = await supabaseAdmin
    .from('bookings')
    .select('id, service_type, start_time, pay_rate, check_in_time, check_out_time, status')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString())
    .order('start_time', { ascending: false })

  let weeklyPay = 0
  let weeklyHours = 0
  const weekJobDetails = (weekJobs || []).map((b) => {
    let hours = 0
    let pay = 0
    if (b.check_in_time && b.check_out_time) {
      const rawHours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      hours = roundToHalfHour(rawHours)
      pay = hours * (b.pay_rate || hourlyRate)
    }
    weeklyHours += hours
    weeklyPay += pay
    return { ...b, hours: Math.round(hours * 100) / 100, pay: Math.round(pay * 100) / 100 }
  })

  // Monthly earnings
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const { data: monthJobs } = await supabaseAdmin
    .from('bookings')
    .select('id, service_type, start_time, pay_rate, check_in_time, check_out_time, status')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', monthStart.toISOString())
    .lte('start_time', monthEnd.toISOString())
    .order('start_time', { ascending: false })

  let monthlyPay = 0
  let monthlyHours = 0
  const monthJobDetails = (monthJobs || []).map((b) => {
    let hours = 0
    let pay = 0
    if (b.check_in_time && b.check_out_time) {
      const rawHours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      hours = roundToHalfHour(rawHours)
      pay = hours * (b.pay_rate || hourlyRate)
    }
    monthlyHours += hours
    monthlyPay += pay
    return { ...b, hours: Math.round(hours * 100) / 100, pay: Math.round(pay * 100) / 100 }
  })

  // Year-to-date earnings
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const { data: yearJobs } = await supabaseAdmin
    .from('bookings')
    .select('id, service_type, start_time, pay_rate, check_in_time, check_out_time, status')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', yearStart.toISOString())
    .lte('start_time', now.toISOString())
    .order('start_time', { ascending: false })

  let yearlyPay = 0
  let yearlyHours = 0
  const yearJobDetails = (yearJobs || []).map((b) => {
    let hours = 0
    let pay = 0
    if (b.check_in_time && b.check_out_time) {
      const rawHours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      hours = roundToHalfHour(rawHours)
      pay = hours * (b.pay_rate || hourlyRate)
    }
    yearlyHours += hours
    yearlyPay += pay
    return { ...b, hours: Math.round(hours * 100) / 100, pay: Math.round(pay * 100) / 100 }
  })

  // If legacy ?period= param, return backwards-compatible response
  if (period) {
    const jobsMap: Record<string, typeof weekJobDetails> = { week: weekJobDetails, month: monthJobDetails, year: yearJobDetails }
    const hoursMap: Record<string, number> = { week: weeklyHours, month: monthlyHours, year: yearlyHours }
    const payMap: Record<string, number> = { week: weeklyPay, month: monthlyPay, year: yearlyPay }
    return NextResponse.json({
      period,
      total_hours: Math.round((hoursMap[period] || 0) * 100) / 100,
      total_earnings: Math.round((payMap[period] || 0) * 100) / 100,
      jobs: jobsMap[period] || [],
    })
  }

  // Full earnings response (nycmaid parity)
  return NextResponse.json({
    earnings: {
      hourlyRate,
      todayPotentialHours: Math.round(todayPotentialHours * 10) / 10,
      todayPotentialPay: Math.round(todayPotentialHours * hourlyRate * 100) / 100,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      weeklyPay: Math.round(weeklyPay * 100) / 100,
      monthlyHours: Math.round(monthlyHours * 10) / 10,
      monthlyPay: Math.round(monthlyPay * 100) / 100,
      yearlyHours: Math.round(yearlyHours * 10) / 10,
      yearlyPay: Math.round(yearlyPay * 100) / 100,
      weekJobsCount: weekJobs?.length || 0,
      monthJobsCount: monthJobs?.length || 0,
      yearJobsCount: yearJobs?.length || 0,
    },
    // Also include job details per period for the breakdown view
    jobs: {
      week: weekJobDetails,
      month: monthJobDetails,
      year: yearJobDetails,
    },
  })
}
