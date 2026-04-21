/**
 * CPA-token-authed year-end ZIP. Read-only, token-scoped, no session.
 */
import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase'
import { toCsv, buildTrialBalance, buildGeneralLedger } from '@/lib/finance-export'

type Params = { params: Promise<{ token: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
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
    zip.file('README.txt', `CPA Package ${year}\nRead-only access via token. Generated ${new Date().toISOString()}\n`)

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
