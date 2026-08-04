import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isEmploymentType, isHrStatus, isCompType, isPayPeriod } from '@/lib/company-team'

// GET /api/admin/company/team
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('platform_team_members')
    .select('*')
    .order('hr_status', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data || [] })
}

// POST /api/admin/company/team  { name, email?, phone?, title?, department?, employment_type?, hr_status?, hire_date?, comp_type?, pay_rate_cents?, pay_period?, notes? }
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const payload = await req.json().catch(() => null) as Record<string, unknown> | null
  const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const employment_type = typeof payload?.employment_type === 'string' && isEmploymentType(payload.employment_type)
    ? payload.employment_type : 'contractor_1099'
  const hr_status = typeof payload?.hr_status === 'string' && isHrStatus(payload.hr_status)
    ? payload.hr_status : 'active'
  const comp_type = typeof payload?.comp_type === 'string' && isCompType(payload.comp_type)
    ? payload.comp_type : 'per_job'
  const pay_period = typeof payload?.pay_period === 'string' && isPayPeriod(payload.pay_period)
    ? payload.pay_period : 'per_job'
  const pay_rate_cents = Number.isInteger(payload?.pay_rate_cents) ? (payload!.pay_rate_cents as number) : null

  const { data, error } = await supabaseAdmin
    .from('platform_team_members')
    .insert({
      name,
      email: (payload?.email as string) || null,
      phone: (payload?.phone as string) || null,
      title: (payload?.title as string) || null,
      department: (payload?.department as string) || null,
      employment_type,
      hr_status,
      hire_date: (payload?.hire_date as string) || null,
      comp_type,
      pay_rate_cents,
      pay_period,
      notes: (payload?.notes as string) || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
