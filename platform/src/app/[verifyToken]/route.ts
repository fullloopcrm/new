import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// seomgr auto-verify — serves the Google Search Console FILE-method
// verification token at the site root (e.g. /google12cfc68677988bb4.html).
//
// Confirmed live 2026-07-16: auto-verify.ts requests a token from Google and
// immediately asks Google to verify it, but nothing ever served that token
// file on the tenant's actual site — every real attempt failed with "The
// necessary verification token could not be found on your site." This route
// is the missing half.
//
// .html paths are excluded from middleware's matcher (see src/middleware.ts
// config.matcher), so this request arrives with the ORIGINAL Host header,
// unrewritten — read it directly rather than relying on any tenant header
// middleware would normally inject.
//
// No tenant-scoping risk: the token is a random Google-issued string stored
// per-property in seo_properties.meta.verify_token by auto-verify.ts right
// before requesting verification (status 'verifying'), so a match here can
// only serve the token that domain's own auto-verify run just requested.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_FILENAME = /^google[a-f0-9]+\.html$/

export async function GET(request: NextRequest, { params }: { params: Promise<{ verifyToken: string }> }) {
  const { verifyToken } = await params
  if (!TOKEN_FILENAME.test(verifyToken)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const hostname = (request.headers.get('host') || '').split(':')[0].replace(/^www\./, '').toLowerCase()
  if (!hostname) return new NextResponse('Not Found', { status: 404 })

  const { data } = await supabaseAdmin.from('seo_properties').select('meta').eq('domain', hostname).maybeSingle()
  const storedToken = (data?.meta as { verify_token?: string } | null)?.verify_token

  if (!storedToken || storedToken !== verifyToken) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(`google-site-verification: ${verifyToken}`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
