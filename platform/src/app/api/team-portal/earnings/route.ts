import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { etToday, etDayBoundaryUTC, addCalendarDays, calendarDayOfWeek, daysInCalendarMonth, nowNaiveET } from '@/lib/recurring'

// Round to half hour with 10-min grace: under 10 min past = round down, 10+ min = round up
const roundToHalfHour = (hours: number) => {
  const totalMinutes = hours * 60
  const halfHours = Math.floor(totalMinutes / 30)
  const remainder = totalMinutes - halfHours * 30
  return remainder >= 10 ? (halfHours + 1) * 0.5 : halfHours * 0.5
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Support legacy ?period= param as well as full earnings response
  const period = request.nextUrl.searchParams.get('period')

  // Get team member's pay rate
  const { data: member } = await tenantDb(auth.tid)
    .from('team_members')
    .select('pay_rate')
    .eq('id', auth.id)
    .single()

  const hourlyRate = member?.pay_rate || 25

  // Model-agnostic pay: if a job carries an explicit flat pay (team_member_pay,
  // stored in cents — set for per-job/flat trades), use it verbatim regardless of
  // hours. Otherwise fall back to the hourly model (hours × job/member rate).
  const jobPay = (b: { team_member_pay?: number | null; pay_rate?: number | null }, hours: number): number =>
    b.team_member_pay && b.team_member_pay > 0
      ? b.team_member_pay / 100
      : hours * (b.pay_rate || hourlyRate)

  // bookings.start_time is a naive ET wall-clock column — every boundary
  // below was previously computed from the SERVER's local (UTC) clock via
  // now.getFullYear()/getMonth()/getDate()/getDay(), then compared as a real
  // instant against that naive column. Same bug as cron/no-show-check: this
  // morning's jobs silently fell out of "today's earnings" for hours after
  // they'd actually happened. Everything below is anchored to ET's own
  // calendar instead.
  const todayCal = etToday()
  const todayStart = etDayBoundaryUTC(todayCal)
  const todayEnd = etDayBoundaryUTC(addCalendarDays(todayCal, 1))

  // Today's potential earnings (scheduled hours for today)
  const { data: todayJobs } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, start_time, end_time, status, pay_rate, team_member_pay')
    .eq('team_member_id', auth.id)
    .gte('start_time', todayStart.toISOString())
    .lt('start_time', todayEnd.toISOString())
    .neq('status', 'cancelled')

  let todayPotentialHours = 0
  let todayPotentialPay = 0
  for (const job of todayJobs || []) {
    const hours = job.end_time
      ? (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 3600000
      : 0
    todayPotentialHours += hours
    todayPotentialPay += jobPay(job, hours)
  }

  // Weekly earnings (Mon-Sun)
  const dayOfWeek = calendarDayOfWeek(todayCal)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = etDayBoundaryUTC(addCalendarDays(todayCal, mondayOffset))
  const weekEnd = etDayBoundaryUTC(addCalendarDays(todayCal, mondayOffset + 7))

  const { data: weekJobs } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, service_type, start_time, pay_rate, team_member_pay, check_in_time, check_out_time, status')
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString())
    .order('start_time', { ascending: false })

  let weeklyPay = 0
  let weeklyHours = 0
  const weekJobDetails = (weekJobs || []).map((b) => {
    let hours = 0
    if (b.check_in_time && b.check_out_time) {
      const rawHours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      hours = roundToHalfHour(rawHours)
    }
    // Flat per-job pay is earned on completion even without check-in/out times;
    // hourly pay needs the worked hours.
    const pay = jobPay(b, hours)
    weeklyHours += hours
    weeklyPay += pay
    return { ...b, hours: Math.round(hours * 100) / 100, pay: Math.round(pay * 100) / 100 }
  })

  // Monthly earnings
  const firstOfMonth = { ...todayCal, day: 1 }
  const monthStart = etDayBoundaryUTC(firstOfMonth)
  const nextMonthStart = etDayBoundaryUTC(addCalendarDays(firstOfMonth, daysInCalendarMonth(todayCal)))
  const monthEnd = new Date(nextMonthStart.getTime() - 1)

  const { data: monthJobs } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, service_type, start_time, pay_rate, team_member_pay, check_in_time, check_out_time, status')
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', monthStart.toISOString())
    .lte('start_time', monthEnd.toISOString())
    .order('start_time', { ascending: false })

  let monthlyPay = 0
  let monthlyHours = 0
  const monthJobDetails = (monthJobs || []).map((b) => {
    let hours = 0
    if (b.check_in_time && b.check_out_time) {
      const rawHours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      hours = roundToHalfHour(rawHours)
    }
    // Flat per-job pay is earned on completion even without check-in/out times;
    // hourly pay needs the worked hours.
    const pay = jobPay(b, hours)
    monthlyHours += hours
    monthlyPay += pay
    return { ...b, hours: Math.round(hours * 100) / 100, pay: Math.round(pay * 100) / 100 }
  })

  // Year-to-date earnings
  const yearStart = etDayBoundaryUTC({ ...todayCal, month: 0, day: 1 })

  const { data: yearJobs } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, service_type, start_time, pay_rate, team_member_pay, check_in_time, check_out_time, status')
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', yearStart.toISOString())
    .lte('start_time', `${nowNaiveET()}Z`)
    .order('start_time', { ascending: false })

  let yearlyPay = 0
  let yearlyHours = 0
  const yearJobDetails = (yearJobs || []).map((b) => {
    let hours = 0
    if (b.check_in_time && b.check_out_time) {
      const rawHours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      hours = roundToHalfHour(rawHours)
    }
    // Flat per-job pay is earned on completion even without check-in/out times;
    // hourly pay needs the worked hours.
    const pay = jobPay(b, hours)
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
      todayPotentialPay: Math.round(todayPotentialPay * 100) / 100,
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
