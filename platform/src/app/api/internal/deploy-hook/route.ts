/**
 * Vercel deploy webhook → auto re-alias every domain on this project.
 *
 * Fires on EVERY production deployment (however it was triggered, including a
 * raw `vercel --prod`). Re-points the *.fullloopcrm.com wildcard + every
 * domain actually attached to this Vercel project (carrying subdomains AND
 * bespoke tenants' own custom domains registered via registerCustomDomain())
 * at the new deployment, so a manual deploy can never orphan them
 * (DEPLOYMENT_NOT_FOUND). Domain discovery is scoped to THIS project (not a
 * `.fullloopcrm.com` suffix heuristic), so a bespoke tenant's domain that
 * still lives on its own standalone Vercel project is never touched.
 *
 * Security: requires a valid Vercel HMAC-SHA1 signature. Uses VERCEL_DEPLOY_TOKEN
 * — provision a PROJECT-SCOPED token, never the account-wide key, so a runtime
 * compromise can't reach the whole Vercel account.
 *
 * Required env (prod): VERCEL_DEPLOY_HOOK_SECRET, VERCEL_DEPLOY_TOKEN,
 * optional VERCEL_PROJECT_ID (defaults 'fullloopcrm', matches vercel-domains.ts),
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

  // Discover every domain attached to THIS Vercel project — the project-
  // scoped domains endpoint, not the old team-wide /v4/aliases list filtered
  // to a *.fullloopcrm.com suffix. That suffix filter silently dropped every
  // bespoke tenant's own custom domain (e.g. floridamaid.com) even when it's
  // registered on this SAME project via registerCustomDomain() in
  // vercel-domains.ts — those are project domains exactly like the carrying
  // subdomains this hook was built to protect, so a manual `vercel --prod`
  // orphans them the same way (DEPLOYMENT_NOT_FOUND) with nothing to catch
  // it. Scoping to this project (rather than widening the suffix filter)
  // also guarantees a bespoke tenant's domain still on its OWN standalone
  // Vercel project can never be touched — this endpoint only returns domains
  // actually attached here. Exclude the platform's own apex/www: those are
  // the git-connected Production Branch domain, which Vercel already
  // re-aliases natively on every production deployment.
  const project = process.env.VERCEL_PROJECT_ID || 'fullloopcrm'
  const domainsRes = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(project)}/domains?limit=100${teamQ ? '&' + teamQ.slice(1) : ''}`,
    { headers: auth },
  )
  const domainsJson = (await domainsRes.json()) as { domains?: Array<{ name: string }> }
  const hosts = new Set<string>(['*.fullloopcrm.com'])
  for (const d of domainsJson.domains || []) {
    if (d.name !== 'fullloopcrm.com' && d.name !== 'www.fullloopcrm.com') {
      hosts.add(d.name)
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
      // 409 = alias already points at this deployment (idempotent no-op) = success.
      results.push({ host, ok: r.ok || r.status === 409, status: r.status })
    } catch {
      results.push({ host, ok: false, status: 0 })
    }
  }

  const okCount = results.filter((r) => r.ok).length
  console.log(`[deploy-hook] re-aliased ${okCount}/${results.length} project domains to ${deploymentId}`)
  return NextResponse.json({ ok: true, deploymentId, reAliased: okCount, total: results.length, results })
}
