import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

// Self-service profile: everything the /apply form collects that also has a
// real column on team_members, editable by the team member themselves once
// hired. Deliberately excludes phone (separate token-verified change flow,
// see /api/team-portal/update-phone) and referral_source/references (one-time
// hiring-vetting info with no team_members column to persist to).
const PROFILE_COLUMNS = 'name, email, address, avatar_url, preferred_language, service_zones, has_car, labor_only, max_travel_minutes'

export const GET = withMobileCors(async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: member, error } = await tenantDb(auth.tid)
    .from('team_members')
    .select(PROFILE_COLUMNS)
    .eq('id', auth.id)
    .single()

  if (error || !member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ profile: member })
})

export const PUT = withMobileCors(async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json()
  const allowed = ['name', 'email', 'address', 'avatar_url', 'preferred_language', 'service_zones', 'has_car', 'labor_only', 'max_travel_minutes'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await tenantDb(auth.tid)
    .from('team_members')
    .update(updates)
    .eq('id', auth.id)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
})
