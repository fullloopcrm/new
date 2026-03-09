import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']

export async function GET() {
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('*, tenant_members(id)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ tenants })
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, status } = await request.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
