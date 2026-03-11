import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Try to load guidelines from tenant settings
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('settings')
      .eq('id', auth.tid)
      .single()

    if (tenant?.settings) {
      const settings = typeof tenant.settings === 'string'
        ? JSON.parse(tenant.settings)
        : tenant.settings

      if (settings.team_guidelines) {
        return NextResponse.json({ sections: settings.team_guidelines })
      }
    }
  } catch {
    // Fall through to default
  }

  // Return empty so the page uses its built-in defaults
  return NextResponse.json({ sections: null })
}
