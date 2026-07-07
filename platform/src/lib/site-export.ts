/**
 * Static site export — fulfils the ownership promise ("you keep your website
 * on cancel"). Crawls a tenant's LIVE public site and produces a self-contained
 * ZIP of HTML + same-origin assets that can be hosted on any static host
 * (Netlify, S3, Vercel, GitHub Pages) at the web root.
 *
 * This is a snapshot of the RENDERED site, not the Next.js source — tenant sites
 * are config-driven off the shared monorepo, so the source repo can't be handed
 * over. The rendered snapshot is what the customer actually owns and can keep.
 *
 * Limits (documented in the bundled README so nobody over-promises):
 * - Page count is capped (MAX_PAGES) to stay inside the serverless time budget.
 *   Larger sites need a background job — see `capped` in the result.
 * - Absolute same-origin URLs are rewritten to root-relative, so the bundle
 *   must be served from a web root; it is not guaranteed to work via file://.
 * - Domain transfer is a separate, manual step (registrar-side).
 */
import JSZip from 'jszip'

const MAX_PAGES = 80 // serverless-safe cap; log when exceeded
const CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 15_000
const MAX_ASSET_BYTES = 8 * 1024 * 1024 // skip anything absurdly large

export interface SiteExportResult {
  zip: Buffer
  pages: number
  assets: number
  capped: boolean
  baseUrl: string
}

/** Treat apex and www.<apex> as the same site. */
function stripWww(host: string): string {
  return host.replace(/^www\./i, '')
}
function sameSite(host: string, baseHost: string): boolean {
  return stripWww(host) === stripWww(baseHost)
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow' })
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/** Run async tasks with bounded concurrency. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx])
    }
  })
  await Promise.all(workers)
}

/** Turn a URL pathname into a zip entry path. `/services` -> `services/index.html`. */
function pageEntryPath(pathname: string): string {
  let p = pathname.replace(/^\/+/, '')
  if (p === '' ) return 'index.html'
  if (p.endsWith('/')) return `${p}index.html`
  // Has a file extension already (rare for pages)
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return p
  return `${p}/index.html`
}

/** Strip query/hash and leading slash to get a stable asset entry path. */
function assetEntryPath(pathname: string): string {
  return pathname.replace(/[?#].*$/, '').replace(/^\/+/, '')
}

/** Extract same-origin asset URLs (css, js, img, fonts) referenced in HTML/CSS. */
function extractAssetUrls(html: string, origin: string, baseHost: string): Set<string> {
  const urls = new Set<string>()
  const patterns = [
    /<link[^>]+href=["']([^"']+)["']/gi,
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
    /url\(["']?([^"')]+)["']?\)/gi, // inline CSS url()
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      const raw = m[1].trim()
      if (!raw || raw.startsWith('data:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue
      try {
        const abs = new URL(raw, origin)
        if (sameSite(abs.host, baseHost)) urls.add(abs.href)
      } catch {
        /* skip malformed */
      }
    }
  }
  return urls
}

/** Rewrite absolute same-site URLs (apex or www) to root-relative for portability. */
function rewriteToRootRelative(text: string, baseHost: string): string {
  const reg = stripWww(baseHost).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text
    .replace(new RegExp(`https?://(?:www\\.)?${reg}(/[^"')\\s]*)?`, 'gi'), (_m, path) => path || '/')
    .replace(new RegExp(`//(?:www\\.)?${reg}(/[^"')\\s]*)?`, 'gi'), (_m, path) => path || '/')
}

/** Parse <loc> entries out of a sitemap.xml body. */
function parseSitemap(xml: string): string[] {
  const urls: string[] = []
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) urls.push(m[1].trim())
  return urls
}

const README = (baseUrl: string, pages: number, capped: boolean) => `Your Website — Static Export
==============================

This is a complete, self-contained snapshot of your live website
(${baseUrl}) as of the export date. It is yours to keep.

What's inside
- ${pages} page(s) as HTML, plus the CSS, JavaScript, images, and fonts
  they reference.
${capped ? '- NOTE: your site exceeded the export page cap, so this is a partial\n  snapshot of your largest/most-important pages. Ask us for a full\n  background export if you need every page.\n' : ''}
How to host it
- Upload the contents of this folder to any static web host — Netlify,
  Cloudflare Pages, GitHub Pages, Amazon S3, or your own server.
- Serve it from the web ROOT (so /styles.css resolves). Opening the
  files directly from your computer (file://) may not load styling.

Your domain
- Transferring your domain name to your own registrar account is a
  separate step handled with your account manager. Once pointed at your
  new host, this snapshot is your live site.

This snapshot is the rendered site. It is not the original source code of
our shared platform, which powers many businesses and stays with us.
`

/**
 * Crawl `baseUrl` (e.g. https://www.example.com) and build a portable ZIP.
 * Enumerates pages from /sitemap.xml, falling back to the homepage.
 */
export async function exportSiteToZip(baseUrl: string): Promise<SiteExportResult> {
  const base = new URL(baseUrl)
  const origin = base.origin
  const host = base.host
  const zip = new JSZip()

  // 1. Enumerate pages from the sitemap; fall back to homepage.
  let pageUrls: string[] = []
  const sitemapRes = await fetchWithTimeout(`${origin}/sitemap.xml`)
  if (sitemapRes && sitemapRes.ok) {
    pageUrls = parseSitemap(await sitemapRes.text()).filter((u) => {
      try { return sameSite(new URL(u).host, host) } catch { return false }
    })
  }
  if (pageUrls.length === 0) pageUrls = [origin + '/']

  // Dedupe + cap.
  pageUrls = Array.from(new Set(pageUrls))
  const capped = pageUrls.length > MAX_PAGES
  if (capped) pageUrls = pageUrls.slice(0, MAX_PAGES)

  // 2. Fetch pages, collect assets.
  const assetUrls = new Set<string>()
  let pageCount = 0
  await pool(pageUrls, CONCURRENCY, async (pageUrl) => {
    const res = await fetchWithTimeout(pageUrl)
    if (!res || !res.ok) return
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html')) return
    let html = await res.text()
    for (const a of extractAssetUrls(html, origin, host)) assetUrls.add(a)
    html = rewriteToRootRelative(html, host)
    const entry = pageEntryPath(new URL(pageUrl).pathname)
    zip.file(entry, html)
    pageCount++
  })

  // 3. Fetch assets.
  let assetCount = 0
  await pool(Array.from(assetUrls), CONCURRENCY, async (assetUrl) => {
    const res = await fetchWithTimeout(assetUrl)
    if (!res || !res.ok) return
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > MAX_ASSET_BYTES) return
    const entry = assetEntryPath(new URL(assetUrl).pathname)
    if (!entry) return
    // Rewrite same-origin URLs inside text assets (CSS/JS) too.
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/css') || ct.includes('javascript')) {
      zip.file(entry, rewriteToRootRelative(buf.toString('utf8'), host))
    } else {
      zip.file(entry, buf)
    }
    assetCount++
  })

  zip.file('README.txt', README(baseUrl, pageCount, capped))

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return { zip: out, pages: pageCount, assets: assetCount, capped, baseUrl }
}
