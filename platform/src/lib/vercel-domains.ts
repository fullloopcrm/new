/**
 * Auto-register a tenant's carrying domain (`<slug>.fullloopcrm.com`) as a
 * Vercel PROJECT domain.
 *
 * Why a project domain and not a `vercel alias`: a project domain auto-follows
 * every production deployment, so it never strands. A pinned alias points at one
 * immutable deployment and 404s the moment a new `vercel --prod` ships — which is
 * exactly what took every carrying domain down on 2026-07-04. This closes that
 * root cause for all future tenants.
 *
 * Safe by design: no-ops (logged) when Vercel env isn't configured, treats
 * "already exists" as success, and never throws — it must not block activation.
 */

const CARRYING_SUFFIX = '.fullloopcrm.com'

export interface RegisterDomainResult {
  ok: boolean
  domain: string
  status: 'created' | 'exists' | 'skipped' | 'error'
  detail?: string
}

interface VercelError {
  error?: { code?: string; message?: string }
}

function vercelEnv(): { token?: string; project: string; teamId?: string } {
  return {
    token: process.env.VERCEL_API_TOKEN,
    project: process.env.VERCEL_PROJECT_ID || 'fullloopcrm',
    teamId: process.env.VERCEL_TEAM_ID,
  }
}

export async function registerCarryingDomain(slug: string): Promise<RegisterDomainResult> {
  const domain = `${slug}${CARRYING_SUFFIX}`

  const { token, project, teamId } = vercelEnv()

  if (!token || !teamId) {
    console.warn(`[vercel-domains] skipped ${domain} — VERCEL_API_TOKEN / VERCEL_TEAM_ID not set in env`)
    return { ok: false, domain, status: 'skipped', detail: 'vercel env not configured' }
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains?teamId=${encodeURIComponent(teamId)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain }),
      },
    )

    if (res.ok) return { ok: true, domain, status: 'created' }

    const body = (await res.json().catch(() => ({}))) as VercelError
    const code = body.error?.code
    // Already attached to the project = the desired end state, treat as success.
    if (res.status === 409 || code === 'domain_already_exists' || code === 'domain_already_in_use') {
      return { ok: true, domain, status: 'exists' }
    }

    console.error(`[vercel-domains] failed ${domain}: ${res.status} ${code ?? ''} ${body.error?.message ?? ''}`)
    return { ok: false, domain, status: 'error', detail: `${res.status} ${code ?? 'unknown'}` }
  } catch (err) {
    console.error(`[vercel-domains] error ${domain}:`, err)
    return { ok: false, domain, status: 'error', detail: err instanceof Error ? err.message : 'unknown' }
  }
}

/**
 * Remove a domain from the Vercel project. Used by tenant deletion so a deleted
 * tenant doesn't leave `<slug>.fullloopcrm.com` (or a custom domain) attached and
 * serving the fallback marketing site. Best-effort — never throws; a missing
 * domain (404) is treated as already-gone (success).
 */
export async function removeDomain(name: string): Promise<{ ok: boolean; name: string; status: 'removed' | 'not_found' | 'skipped' | 'error'; detail?: string }> {
  const { token, project, teamId } = vercelEnv()
  if (!token || !teamId) return { ok: false, name, status: 'skipped', detail: 'vercel env not configured' }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(name)}?teamId=${encodeURIComponent(teamId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.ok) return { ok: true, name, status: 'removed' }
    if (res.status === 404) return { ok: true, name, status: 'not_found' }
    const body = (await res.json().catch(() => ({}))) as VercelError
    return { ok: false, name, status: 'error', detail: `${res.status} ${body.error?.code ?? 'unknown'}` }
  } catch (err) {
    return { ok: false, name, status: 'error', detail: err instanceof Error ? err.message : 'unknown' }
  }
}

/** A DNS record the tenant must create at their registrar. */
export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT'
  name: string
  value: string
}

export interface CustomDomainResult {
  ok: boolean
  domain: string
  status: 'created' | 'exists' | 'skipped' | 'error'
  /** True once Vercel confirms the domain resolves to the project. */
  verified: boolean
  /** Records the tenant sets at their registrar to point the domain here. */
  records: DnsRecord[]
  detail?: string
}

// The apex + www records every Vercel custom domain uses. Vercel may ALSO
// require a one-time TXT challenge (returned in `records` when present) if the
// domain is already attached to another Vercel account.
function baseRecords(domain: string): DnsRecord[] {
  const apex = domain.replace(/^www\./, '')
  return [
    { type: 'A', name: apex, value: '76.76.21.21' },
    { type: 'CNAME', name: `www.${apex}`, value: 'cname.vercel-dns.com' },
  ]
}

/**
 * Register a tenant's own custom domain on the Vercel project and report what
 * DNS the tenant must set + whether it's verified yet. Adds both apex and www.
 * Never throws — a failure surfaces as status:'error' so activation continues.
 */
export async function registerCustomDomain(rawDomain: string): Promise<CustomDomainResult> {
  const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const records = baseRecords(domain)

  const { token, project, teamId } = vercelEnv()
  if (!token || !teamId) {
    return { ok: false, domain, status: 'skipped', verified: false, records, detail: 'vercel env not configured' }
  }

  const qs = `teamId=${encodeURIComponent(teamId)}`
  const addUrl = `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains?${qs}`

  try {
    // Add apex + www (idempotent — 409/already-exists is the desired end state).
    let status: CustomDomainResult['status'] = 'created'
    for (const name of [domain.replace(/^www\./, ''), `www.${domain.replace(/^www\./, '')}`]) {
      const res = await fetch(addUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as VercelError
        const code = body.error?.code
        if (res.status === 409 || code === 'domain_already_exists' || code === 'domain_already_in_use') {
          status = 'exists'
        } else {
          return { ok: false, domain, status: 'error', verified: false, records, detail: `${res.status} ${code ?? 'unknown'}` }
        }
      }
    }

    // Read verification state + any required TXT challenge for the apex.
    let verified = false
    const apex = domain.replace(/^www\./, '')
    const cfg = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(apex)}?${qs}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (cfg.ok) {
      const data = (await cfg.json().catch(() => ({}))) as {
        verified?: boolean
        verification?: Array<{ type: string; domain: string; value: string }>
      }
      verified = data.verified === true
      for (const v of data.verification ?? []) {
        if (v.type?.toUpperCase() === 'TXT') {
          records.push({ type: 'TXT', name: v.domain, value: v.value })
        }
      }
    }

    return { ok: true, domain, status, verified, records }
  } catch (err) {
    return { ok: false, domain, status: 'error', verified: false, records, detail: err instanceof Error ? err.message : 'unknown' }
  }
}
