import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Temporary route to get your Clerk user ID
// DELETE THIS after setting SUPER_ADMIN_CLERK_ID
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in. Go to /sign-in first.' })
  }
  return NextResponse.json({
    clerk_user_id: userId,
    instruction: 'Set SUPER_ADMIN_CLERK_ID to this value in .env.local and Vercel env vars',
  })
}
