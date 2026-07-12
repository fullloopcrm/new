import { NextRequest, NextResponse } from 'next/server'
import { verifyPortalToken } from '../auth/token'
import { checkPortalAvailability } from '@/lib/availability'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date')
  const duration = parseInt(request.nextUrl.searchParams.get('duration') || '2')

  if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 })

  const slots = await checkPortalAvailability(auth.tid, date, duration)

  return NextResponse.json({ slots })
}
