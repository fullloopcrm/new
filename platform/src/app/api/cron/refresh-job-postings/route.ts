import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { protectCronAPI } from '@/lib/nycmaid/auth'

export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  revalidatePath('/available-nyc-maid-jobs')
  revalidatePath('/available-nyc-maid-jobs/[slug]', 'page')

  return NextResponse.json({
    refreshed: true,
    at: new Date().toISOString(),
  })
}
