import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  // Check Supabase connection
  try {
    const { error } = await supabaseAdmin.from('tenants').select('id').limit(1)
    checks.database = error ? 'error' : 'ok'
  } catch {
    checks.database = 'error'
  }

  // Check environment variables
  checks.clerk = process.env.CLERK_SECRET_KEY ? 'ok' : 'error'
  checks.supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'error'

  const allOk = Object.values(checks).every(v => v === 'ok')

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || '1.0.0',
  }, { status: allOk ? 200 : 503 })
}
