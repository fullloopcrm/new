/**
 * CPA-token-authed year-end ZIP. Read-only, token-scoped, no session.
 */
import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase'
import { toCsv, buildTrialBalance, buildGeneralLedger } from '@/lib/finance-export'
import { rateLimitDb } from '@/lib/rate-limit-db'

type Params = { params: Promise<{ token: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    // Public, unauthenticated (token-auth, no session) — same class as the
    // sibling quotes/invoices/documents public/[token] routes hardened this
    // session, but missed by that pass. Token is 192-bit (randomBytes(24) per
    // /api/finance/cpa-tokens), so not brute-forceable, but every call still
    // builds a full trial balance + general ledger for the year and zips it —
    // real, uncapped compute cost a caller holding one valid link could
    // script-retry with zero limit. Cap per-IP, matching that established
    // pattern.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`cpa-year-end-zip:${ip}`, 10, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { token } = await params
    const url = new URL(request.url)
    const year = url.searchParams.get('year') || String(new Date().getUTCFullYear() - 1)

    const { data: tok } = await supabaseAdmin
      .from('cpa_access_tokens')
      .select('tenant_id, entity_id, expires_at, revoked_at')
      .eq('token', token)
      .maybeSingle()
    if (!tok) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    if (tok.revoked_at) return NextResponse.json({ error: 'Revoked' }, { status: 403 })
    if (tok.expires_at && new Date(tok.expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'Expired' }, { status: 403 })
    }

    // Increment use_count atomically. Reading-then-writing would race on
     // concurrent downloads; the RPC handles the +1 server-side.
    await supabaseAdmin.rpc('cpa_token_bump_usage', { p_token: token })

    const tenantId = tok.tenant_id
    const entityId = tok.entity_id
    const from = `${year}-01-01`
    const to = `${year}-12-31`

    const zip = new JSZip()
    const tb = await buildTrialBalance(tenantId, entityId, to)
    zip.file('trial_balance.csv', toCsv(tb.map(r => ({
      code: r.coa_code, name: r.coa_name, type: r.coa_type,
      debits: (r.debits / 100).toFixed(2), credits: (r.credits / 100).toFixed(2),
    }))))
    const gl = await buildGeneralLedger(tenantId, entityId, from, to)
    zip.file('general_ledger.csv', toCsv(gl))
    const truncationWarning = (tb.truncated || gl.truncated)
      ? '\n*** WARNING: This tenant has more journal activity than this export can include in one pass. trial_balance.csv and/or general_ledger.csv may be INCOMPLETE. Ask the tenant to export a narrower date range or a single entity from their dashboard. ***\n'
      : ''
    if (tb.truncated || gl.truncated) {
      console.error('GET /api/cpa/[token]/year-end-zip truncated', { tenantId, entityId, year, tbTruncated: !!tb.truncated, glTruncated: !!gl.truncated })
    }
    zip.file('README.txt', `CPA Package ${year}\nRead-only access via token. Generated ${new Date().toISOString()}\n${truncationWarning}`)

    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cpa-${year}.zip"`,
      },
    })
  } catch (err) {
    console.error('GET /api/cpa/[token]/year-end-zip', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
