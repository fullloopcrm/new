import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// seomgr — serves Google Search Console FILE-method verification tokens.
// A `next.config` rewrite maps `/:file(google[\\w-]+\\.html)` here (added at
// deploy time — the routing config files are shared, so the rewrite is applied
// in the deploy worktree, not the working tree).
//
// GUARDRAIL: only serves a token that seomgr itself issued and stored on a
// property (meta.verify_token). Arbitrary `google*.html` requests 404 — we never
// echo back a token we didn't mint, which would let a third party verify our
// domains in their own Search Console.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (!/^google[\w-]+\.html$/.test(file)) {
    return new NextResponse('Not found', { status: 404 })
  }
  const { data, error } = await supabaseAdmin
    .from('seo_properties')
    .select('property')
    .eq('meta->>verify_token', file)
    .limit(1)
  if (error || !data || data.length === 0) {
    return new NextResponse('Not found', { status: 404 })
  }
  return new NextResponse(`google-site-verification: ${file}`, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
