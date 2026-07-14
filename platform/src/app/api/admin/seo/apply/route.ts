import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'
import { applyOverride, revertOverride } from '@/lib/seo/overrides'
import { safeEqual } from '@/lib/secret-compare'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Apply (or revert) a Tier-1 title/meta override and revalidate the page so the
// change takes effect immediately instead of on the next 30-day ISR cycle.
// Callable by the system (Bearer CRON_SECRET, e.g. the weekly remediation run)
// or by an admin (session cookie) from the approval UI.
async function authorize(req: Request): Promise<boolean> {
  const bearer = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (bearer && secret && safeEqual(bearer, `Bearer ${secret}`)) return true
  const adminError = await requireAdmin()
  return adminError === null
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    url?: string
    title?: string | null
    description?: string | null
    changeIds?: string[]
    revert?: boolean
  }
  if (!body.url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let pathname = '/'
  try {
    pathname = new URL(body.url).pathname
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  if (body.revert) {
    await revertOverride(body.url)
  } else {
    await applyOverride(body.url, { title: body.title, description: body.description }, body.changeIds ?? [])
  }
  revalidatePath(pathname)

  return NextResponse.json({ ok: true, url: body.url, pathname, reverted: !!body.revert })
}
