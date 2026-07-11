import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * SSRF guard for fetches whose target URL derives from tenant/user input
 * (tenant domains, SEO properties, site-audit targets). Blocks requests that
 * would reach the loopback interface, RFC-1918/ULA private networks,
 * link-local ranges, or the cloud metadata endpoint (169.254.169.254).
 *
 * Residual limitation: this validates the DNS resolution at check time, then
 * fetch() resolves again — a determined attacker could DNS-rebind between the
 * two. For that reason safeFetch() re-validates every redirect hop, which
 * closes the far more common redirect-to-internal vector; full rebind
 * protection would require pinning the connection to the validated IP.
 */
export class SsrfError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SsrfError'
  }
}

function ipv4IsPrivate(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true // malformed → treat as unsafe
  }
  const [a, b] = parts
  if (a === 0) return true // "this" network
  if (a === 10) return true // RFC1918
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true // RFC1918
  if (a === 192 && b === 168) return true // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a >= 224) return true // multicast + reserved
  return false
}

function ipv6IsPrivate(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::1' || s === '::') return true // loopback / unspecified
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/) // IPv4-mapped
  if (mapped) return ipv4IsPrivate(mapped[1])
  if (s.startsWith('fe80')) return true // link-local
  if (s.startsWith('fc') || s.startsWith('fd')) return true // unique-local (fc00::/7)
  return false
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return ipv4IsPrivate(ip)
  if (version === 6) return ipv6IsPrivate(ip)
  return true // not a recognizable IP → unsafe
}

/**
 * Parse `raw`, require an http(s) scheme, and ensure the host does not resolve
 * to a private/internal address. Throws SsrfError on any violation. Returns the
 * parsed URL on success.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new SsrfError(`invalid URL: ${raw}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError(`scheme not allowed: ${url.protocol}`)
  }
  const host = url.hostname.replace(/^\[|\]$/g, '') // strip IPv6 brackets

  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new SsrfError(`blocked private address: ${host}`)
    return url
  }

  let addrs: { address: string }[]
  try {
    addrs = await lookup(host, { all: true })
  } catch {
    throw new SsrfError(`DNS resolution failed: ${host}`)
  }
  if (!addrs.length) throw new SsrfError(`no DNS records: ${host}`)
  for (const a of addrs) {
    if (isPrivateAddress(a.address)) {
      throw new SsrfError(`blocked private address: ${host} -> ${a.address}`)
    }
  }
  return url
}

const MAX_REDIRECTS = 5

/**
 * fetch() wrapper that validates the target resolves to a public address and
 * re-validates every redirect hop, so a public URL cannot 3xx into the private
 * network. Use for any fetch whose URL derives from tenant/user input.
 *
 * Redirects are followed manually (redirect is forced to 'manual'); any other
 * init options are passed through to each hop.
 */
export async function safeFetch(raw: string, init: RequestInit = {}): Promise<Response> {
  let target = raw
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(target)
    const res = await fetch(target, { ...init, redirect: 'manual' })
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) return res
    target = new URL(location, target).toString()
  }
  throw new SsrfError('too many redirects')
}
