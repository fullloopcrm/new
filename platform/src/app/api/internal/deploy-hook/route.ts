/**
 * Vercel deploy webhook → auto re-alias carrying domains.
 *
 * Fires on EVERY production deployment (however it was triggered, including a
 * raw `vercel --prod`). Re-points the *.fullloopcrm.com wildcard + every
 * <slug>.fullloopcrm.com alias at the new deployment, so a manual deploy can
 * never orphan them (DEPLOYMENT_NOT_FOUND). See scripts/post-deploy-alias.sh
 * for the manual equivalent.
 *
 * Security: requires a valid Vercel HMAC-SHA1 signature. Uses VERCEL_DEPLOY_TOKEN
 * — provision a PROJECT-SCOPED token, never the account-wide key, so a runtime
 * compromise can't reach the whole Vercel account.
 *
 * Required env (prod): VERCEL_DEPLOY_HOOK_SECRET, VERCEL_DEPLOY_TOKEN,
 * optional VERCEL_TEAM_ID.
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const VERCEL_API = 'https://api.vercel.com'

export async function POST(req: Request) {
  const secret = process.env.VERCEL_DEPLOY_HOOK_SECRET
  const token = process.env.VERCEL_DEPLOY_TOKEN
  if (!secret || !token) {
    return NextResponse.json({ error: 'deploy-hook not configured' }, { status: 503 })
  }

  const raw = await req.text()
  const sig = req.headers.get('x-vercel-signature') || ''
  const expected = crypto.createHmac('sha1', secret).update(raw).digest('hex')
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const b = body as {
    type?: string
    payload?: { target?: string; deploymentId?: string; deployment?: { id?: string; target?: string } }
  }

  if (b.type !== 'deployment.succeeded') {
    return NextResponse.json({ ok: true, skipped: b.type || 'unknown-event' })
  }
  const target = b.payload?.target ?? b.payload?.deployment?.target
  if (target && target !== 'production') {
    return NextResponse.json({ ok: true, skipped: `target:${target}` })
  }
  const deploymentId = b.payload?.deployment?.id ?? b.payload?.deploymentId
  if (!deploymentId) {
    return NextResponse.json({ error: 'no deployment id in payload' }, { status: 400 })
  }

  const teamQ = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''
  const auth = { Authorization: `Bearer ${token}` }

  // Discover every carrying-domain alias, exclude www + apex.
  const listRes = await fetch(`${VERCEL_API}/v4/aliases?limit=100${teamQ ? '&' + teamQ.slice(1) : ''}`, { headers: auth })
  const listJson = (await listRes.json()) as { aliases?: Array<{ alias: string }> }
  const hosts = new Set<string>(['*.fullloopcrm.com'])
  for (const a of listJson.aliases || []) {
    if (a.alias.endsWith('.fullloopcrm.com') && !a.alias.startsWith('www.') && a.alias !== 'fullloopcrm.com') {
      hosts.add(a.alias)
    }
  }

  const results: Array<{ host: string; ok: boolean; status: number }> = []
  for (const host of hosts) {
    try {
      const r = await fetch(`${VERCEL_API}/v2/deployments/${deploymentId}/aliases${teamQ}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: host }),
      })
      results.push({ host, ok: r.ok, status: r.status })
    } catch {
      results.push({ host, ok: false, status: 0 })
    }
  }

  const okCount = results.filter((r) => r.ok).length
  console.log(`[deploy-hook] re-aliased ${okCount}/${results.length} carrying domains to ${deploymentId}`)
  return NextResponse.json({ ok: true, deploymentId, reAliased: okCount, total: results.length, results })
}
