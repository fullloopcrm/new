import { NextResponse } from 'next/server'
import { verifyPortalToken } from '../auth/token'
import { requestClientDeletion, cancelClientDeletion } from '@/lib/gdpr'

// Self-service right-to-be-forgotten request, from the customer portal.
// Opens a 30-day grace window; nothing is erased until cron/gdpr-purge runs.
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { request: deletionRequest, alreadyPending } = await requestClientDeletion(
    auth.tid,
    auth.id,
    'client',
    auth.id
  )

  return NextResponse.json({ request: deletionRequest, alreadyPending })
}

// Cancel within the grace period.
export async function DELETE(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { cancelled } = await cancelClientDeletion(auth.tid, auth.id)

  return NextResponse.json({ cancelled })
}
