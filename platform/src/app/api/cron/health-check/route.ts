import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const issues: string[] = []

  // 1. Check Supabase connectivity
  try {
    const { error } = await supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true })
    if (error) issues.push(`Supabase query failed: ${error.message}`)
  } catch (e) {
    issues.push(`Supabase unreachable: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 2. Check for error spikes
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentErrors } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('type', 'error')
      .gte('created_at', oneHourAgo)

    if (recentErrors && recentErrors.length >= 10) {
      issues.push(`Error spike: ${recentErrors.length} errors in the last hour`)
    }
  } catch {
    // Non-critical
  }

  // 3. Check critical env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) issues.push('SUPABASE_URL missing')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) issues.push('SUPABASE_SERVICE_ROLE_KEY missing')

  // 4. Check tenant health — any tenants with missing critical config
  try {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, status')
      .eq('status', 'active')

    if (tenants && tenants.length === 0) {
      issues.push('No active tenants found')
    }
  } catch {
    // Non-critical
  }

  if (issues.length > 0) {
    await supabaseAdmin.from('notifications').insert({
      type: 'error',
      title: 'Health Check Failed',
      message: issues.join('; ').slice(0, 200)
    })

    return NextResponse.json({ healthy: false, issues })
  }

  return NextResponse.json({ healthy: true })
}
