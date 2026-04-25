#!/usr/bin/env tsx
/**
 * Onboard a standalone Next.js site as a fullloop tenant subtree.
 *
 * v2: import-graph driven. Handles marketing pages, (app) public routes
 * (clients/apply/feedback/referral/login), and all transitive @/ imports.
 *
 * What it does:
 *  1. Validates the source has a `(marketing)` route group
 *  2. Provisions tenants + tenant_domains rows in fullloop's DB (skip with --skip-db)
 *  3. Walks seed route directories from source
 *  4. Recursively follows every `@/` import and queues the file for copy
 *  5. Copies all collected files into  src/app/site/<slug>/{,_components,_lib}/**
 *  6. Copies public assets into        public/sites/<slug>/**
 *  7. Rewrites @/-imports in copied files to point at the per-tenant locations
 *  8. Rewrites references to source public assets to /sites/<slug>/<file>
 *  9. Skips iCloud sync duplicates ("foo 2.tsx", "admin 2/", etc.)
 * 10. Runs `tsc --noEmit` and reports any errors
 *
 * Usage:
 *   tsx scripts/onboard-tenant-site.ts \
 *     --source "/path/to/standalone-nextjs-app" \
 *     --slug   the-florida-maid \
 *     --name   "The Florida Maid" \
 *     --domain thefloridamaid.com \
 *     --industry cleaning \
 *     --phone  "(954) 710-3636"
 *
 * Flags:
 *   --dry-run     Show what would be done; write nothing
 *   --skip-db     Don't insert tenant rows; just copy files
 *   --force       Overwrite existing /site/<slug>/ subtree
 *   --seed-app    Comma-separated (app)-group route names to seed alongside (marketing).
 *                 Default: clients,apply,feedback,referral,login
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------- args
type Args = {
  source: string
  slug: string
  name: string
  domain: string
  industry: string
  phone?: string
  seedApp: string[]
  dryRun: boolean
  skipDb: boolean
  force: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) { args[key] = next; i++ } else { args[key] = true }
  }
  for (const k of ['source', 'slug', 'name', 'domain']) {
    if (typeof args[k] !== 'string') throw new Error(`Missing required --${k}`)
  }
  const seedAppRaw = typeof args['seed-app'] === 'string'
    ? String(args['seed-app'])
    : 'clients,apply,feedback,referral,login'
  return {
    source: path.resolve(String(args.source)),
    slug: String(args.slug),
    name: String(args.name),
    domain: String(args.domain),
    industry: typeof args.industry === 'string' ? args.industry : 'cleaning',
    phone: typeof args.phone === 'string' ? args.phone : undefined,
    seedApp: seedAppRaw.split(',').map((s) => s.trim()).filter(Boolean),
    dryRun: !!args['dry-run'],
    skipDb: !!args['skip-db'],
    force: !!args.force,
  }
}

// ---------------------------------------------------------------- paths
const PLATFORM = path.resolve(__dirname, '..')
const ICLOUD_DUP = / 2(?=\.[tj]sx?$|$)/
function shouldSkip(name: string): boolean {
  return ICLOUD_DUP.test(name) || name === '.DS_Store' || name === 'node_modules'
}

// ---------------------------------------------------------------- fs helpers
async function exists(p: string): Promise<boolean> {
  try { await fs.stat(p); return true } catch { return false }
}
async function isDir(p: string): Promise<boolean> {
  try { return (await fs.stat(p)).isDirectory() } catch { return false }
}
async function isFile(p: string): Promise<boolean> {
  try { return (await fs.stat(p)).isFile() } catch { return false }
}
async function readDir(dir: string): Promise<string[]> {
  try { return await fs.readdir(dir) } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
}
async function ensureDir(dir: string, dryRun: boolean) {
  if (dryRun) return
  await fs.mkdir(dir, { recursive: true })
}
async function writeOrCopy(from: string, to: string, content: string | null, dryRun: boolean) {
  if (dryRun) return
  if (content !== null) await fs.writeFile(to, content, 'utf8')
  else await fs.copyFile(from, to)
}
async function walk(dir: string, base: string = dir): Promise<string[]> {
  const out: string[] = []
  for (const name of await readDir(dir)) {
    if (shouldSkip(name)) continue
    const full = path.join(dir, name)
    if (await isDir(full)) out.push(...(await walk(full, base)))
    else if (await isFile(full)) out.push(path.relative(base, full))
  }
  return out
}

// ---------------------------------------------------------------- import resolver
const AT_IMPORT_RE = /(?:from|import)\s*\(?\s*['"]@\/([^'"]+)['"]/g
const REL_IMPORT_RE = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g

async function resolveAtImport(source: string, atPath: string): Promise<string | null> {
  // atPath = "components/AddressAutocomplete" or "lib/seo/content"
  const candidates = [
    `${atPath}.ts`, `${atPath}.tsx`, `${atPath}.js`, `${atPath}.jsx`,
    `${atPath}/index.ts`, `${atPath}/index.tsx`,
  ]
  for (const c of candidates) {
    const full = path.join(source, 'src', c)
    if (await isFile(full)) return full
  }
  return null
}

async function resolveRelImport(fromFile: string, relPath: string): Promise<string | null> {
  const dir = path.dirname(fromFile)
  const base = path.resolve(dir, relPath)
  const candidates = [
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    `${base}/index.ts`, `${base}/index.tsx`,
    base, // bare path (e.g., a static asset import — rare in TS but possible)
  ]
  for (const c of candidates) {
    if (await isFile(c)) return c
  }
  return null
}

function extractAtImports(content: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  AT_IMPORT_RE.lastIndex = 0
  while ((m = AT_IMPORT_RE.exec(content))) out.push(m[1])
  return out
}

function extractRelImports(content: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  REL_IMPORT_RE.lastIndex = 0
  while ((m = REL_IMPORT_RE.exec(content))) out.push(m[1])
  return out
}

// ---------------------------------------------------------------- target mapping
type CopyEntry = {
  from: string         // absolute source path
  to: string           // absolute target path inside platform
  rewrite: boolean     // whether to rewrite imports/asset paths
  importKey?: string   // for @/X imports, the original `X` (e.g. "components/AddressAutocomplete")
}

function importKeyToTargetRel(slug: string, importKey: string, ext: string): string {
  // @/components/X → src/app/site/<slug>/_components/X
  // @/lib/X       → src/app/site/<slug>/_lib/X
  // anything else → src/app/site/<slug>/_misc/X (fallback, shouldn't happen for app code)
  if (importKey.startsWith('components/')) {
    return path.join('src/app/site', slug, '_components', importKey.slice('components/'.length) + ext)
  }
  if (importKey.startsWith('lib/')) {
    return path.join('src/app/site', slug, '_lib', importKey.slice('lib/'.length) + ext)
  }
  if (importKey.startsWith('app/')) {
    return path.join('src/app/site', slug, '_app', importKey.slice('app/'.length) + ext)
  }
  return path.join('src/app/site', slug, '_misc', importKey + ext)
}

function importKeyToNewAtPath(slug: string, importKey: string): string {
  if (importKey.startsWith('components/')) return `app/site/${slug}/_components/${importKey.slice('components/'.length)}`
  if (importKey.startsWith('lib/')) return `app/site/${slug}/_lib/${importKey.slice('lib/'.length)}`
  if (importKey.startsWith('app/')) return `app/site/${slug}/_app/${importKey.slice('app/'.length)}`
  return `app/site/${slug}/_misc/${importKey}`
}

// ---------------------------------------------------------------- rewriter
function rewriteImports(content: string, slug: string, publicAssets: Set<string>): string {
  let out = content

  // Rewrite every @/X import to its per-tenant location
  out = out.replace(/((?:from|import)\s*\(?\s*['"])@\/([^'"]+)(['"])/g, (_match, pre, key, post) => {
    return `${pre}@/${importKeyToNewAtPath(slug, key)}${post}`
  })

  // Public asset references: rewrite "/foo.ext" only when "foo.ext" exactly matches
  // a file shipped in source's public/. Avoids touching route paths like "/services".
  for (const asset of publicAssets) {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(['"\`])\\/${escaped}(['"\`])`, 'g')
    out = out.replace(re, `$1/sites/${slug}/${asset}$2`)
  }

  return out
}

// ---------------------------------------------------------------- discovery
async function buildCopyPlan(args: Args): Promise<{ entries: CopyEntry[]; publicAssets: string[] }> {
  const { source, slug } = args

  const entries: CopyEntry[] = []
  const targetByFromPath = new Map<string, string>()  // dedupe

  // Seed: marketing route group
  const marketingRoot = path.join(source, 'src/app/(marketing)')
  if (!(await isDir(marketingRoot))) {
    throw new Error(`Source missing src/app/(marketing): ${marketingRoot}`)
  }

  function addEntry(e: CopyEntry) {
    if (targetByFromPath.has(e.from)) return
    targetByFromPath.set(e.from, e.to)
    entries.push(e)
  }

  // Seed marketing files → src/app/site/<slug>/<rel>
  for (const rel of await walk(marketingRoot)) {
    addEntry({
      from: path.join(marketingRoot, rel),
      to: path.join(PLATFORM, 'src/app/site', slug, rel),
      rewrite: /\.(tsx?|jsx?)$/.test(rel),
    })
  }

  // Seed (app) public-facing routes → also under src/app/site/<slug>/<route-name>/...
  // These are pages users land on (book, login, apply, etc.). Internal navigation
  // from /site/<slug>/page.tsx → /clients/collect lands here under /site/<slug>/clients/collect.
  for (const routeName of args.seedApp) {
    const r = path.join(source, 'src/app/(app)', routeName)
    if (!(await isDir(r))) continue
    for (const rel of await walk(r)) {
      addEntry({
        from: path.join(r, rel),
        to: path.join(PLATFORM, 'src/app/site', slug, routeName, rel),
        rewrite: /\.(tsx?|jsx?)$/.test(rel),
      })
    }
  }

  // BFS over import graph (both @/ and relative imports)
  const queue: string[] = entries.filter((e) => e.rewrite).map((e) => e.from)
  // Build initial entry-by-source for relative-import target derivation
  const entryByFrom = new Map<string, CopyEntry>()
  for (const e of entries) entryByFrom.set(e.from, e)

  function deriveTargetForResolvedSource(resolved: string): string {
    // Convert resolved source path → equivalent @/-import key, then to target.
    // This unifies @/-import and relative-import handling.
    const srcRoot = path.join(source, 'src') + path.sep
    const ext = path.extname(resolved)
    if (resolved.startsWith(srcRoot)) {
      const restNoExt = resolved.slice(srcRoot.length).replace(/\.(tsx?|jsx?)$/, '')
      return path.join(PLATFORM, importKeyToTargetRel(slug, restNoExt, ext))
    }
    // Outside src/ — fallback to _misc
    return path.join(PLATFORM, 'src/app/site', slug, '_misc', path.basename(resolved))
  }

  while (queue.length) {
    const file = queue.shift()!
    let content: string
    try { content = await fs.readFile(file, 'utf8') } catch { continue }

    // @/-imports
    for (const key of extractAtImports(content)) {
      const resolved = await resolveAtImport(source, key)
      if (!resolved) continue
      if (targetByFromPath.has(resolved)) continue
      const target = deriveTargetForResolvedSource(resolved)
      const e: CopyEntry = {
        from: resolved,
        to: target,
        rewrite: /\.(tsx?|jsx?)$/.test(resolved),
        importKey: key,
      }
      addEntry(e)
      entryByFrom.set(e.from, e)
      queue.push(resolved)
    }

    // relative imports
    for (const rel of extractRelImports(content)) {
      const resolved = await resolveRelImport(file, rel)
      if (!resolved) continue
      if (targetByFromPath.has(resolved)) continue
      const target = deriveTargetForResolvedSource(resolved)
      const e: CopyEntry = {
        from: resolved,
        to: target,
        rewrite: /\.(tsx?|jsx?)$/.test(resolved),
      }
      addEntry(e)
      entryByFrom.set(e.from, e)
      queue.push(resolved)
    }
  }

  // Public assets
  const publicRoot = path.join(source, 'public')
  const publicAssets = (await isDir(publicRoot)) ? await walk(publicRoot) : []

  return { entries, publicAssets }
}

// ---------------------------------------------------------------- execute
async function executePlan(args: Args, entries: CopyEntry[], publicAssets: string[]) {
  const { slug, dryRun } = args

  const targetSubtree = path.join(PLATFORM, 'src/app/site', slug)
  if (!dryRun && !args.force && (await isDir(targetSubtree))) {
    const existing = await readDir(targetSubtree)
    if (existing.length > 0) {
      throw new Error(`Target ${targetSubtree} already exists and is not empty. Use --force to overwrite.`)
    }
  }

  const publicSet = new Set(publicAssets)

  console.log(`Copying ${entries.length} source files`)
  for (const e of entries) {
    await ensureDir(path.dirname(e.to), dryRun)
    if (e.rewrite) {
      const src = await fs.readFile(e.from, 'utf8')
      const out = rewriteImports(src, slug, publicSet)
      await writeOrCopy(e.from, e.to, out, dryRun)
    } else {
      await writeOrCopy(e.from, e.to, null, dryRun)
    }
  }

  console.log(`Copying ${publicAssets.length} public assets → public/sites/${slug}/`)
  for (const rel of publicAssets) {
    const from = path.join(args.source, 'public', rel)
    const to = path.join(PLATFORM, 'public/sites', slug, rel)
    await ensureDir(path.dirname(to), dryRun)
    await writeOrCopy(from, to, null, dryRun)
  }
}

// ---------------------------------------------------------------- DB
async function provisionTenant(args: Args) {
  if (args.skipDb) {
    console.log('--skip-db set; not provisioning tenant row')
    return
  }
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !supaKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required for DB provisioning. Use --skip-db to skip.')
  }
  if (args.dryRun) {
    console.log(`[DRY] Would upsert tenants row: slug=${args.slug} name="${args.name}" domain=${args.domain}`)
    return
  }
  const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } })

  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .upsert(
      {
        slug: args.slug,
        name: args.name,
        domain: args.domain,
        domain_name: args.domain,
        industry: args.industry,
        status: 'active',
        phone: args.phone,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()

  if (tErr || !tenant) throw new Error(`Tenant upsert failed: ${tErr?.message}`)
  console.log(`Tenant row OK: id=${tenant.id} slug=${tenant.slug}`)

  const { error: dErr } = await supabase
    .from('tenant_domains')
    .upsert(
      { tenant_id: tenant.id, domain: args.domain, is_primary: true, active: true },
      { onConflict: 'domain' }
    )
  if (dErr) console.warn(`tenant_domains warn: ${dErr.message}`)
  else console.log(`tenant_domains OK: ${args.domain}`)
}

// ---------------------------------------------------------------- typecheck
function runTypecheck(): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
      cwd: PLATFORM,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    proc.stdout.on('data', (c) => (out += c.toString()))
    proc.stderr.on('data', (c) => (out += c.toString()))
    proc.on('close', (code) => resolve({ ok: code === 0, output: out }))
  })
}

// ---------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('--- Onboard tenant site (v2) ---')
  console.log(`source:   ${args.source}`)
  console.log(`slug:     ${args.slug}`)
  console.log(`name:     ${args.name}`)
  console.log(`domain:   ${args.domain}`)
  console.log(`industry: ${args.industry}`)
  console.log(`phone:    ${args.phone ?? '(none)'}`)
  console.log(`seed-app: ${args.seedApp.join(',')}`)
  console.log(`dry-run:  ${args.dryRun}`)
  console.log(`skip-db:  ${args.skipDb}`)
  console.log(`force:    ${args.force}`)
  console.log('')

  const { entries, publicAssets } = await buildCopyPlan(args)
  console.log(`PLAN: ${entries.length} source files, ${publicAssets.length} public assets`)

  await provisionTenant(args)
  await executePlan(args, entries, publicAssets)

  if (args.dryRun) {
    console.log('\nDRY RUN complete — no files written, no DB rows created.')
    return
  }

  console.log('\nRunning typecheck...')
  const tc = await runTypecheck()
  if (tc.ok) {
    console.log('Typecheck PASSED.')
  } else {
    console.log('Typecheck FAILED. Output:')
    console.log(tc.output.split('\n').slice(0, 120).join('\n'))
    process.exitCode = 1
  }

  console.log('\nDONE.')
  console.log(`  Tenant subtree: src/app/site/${args.slug}/`)
  console.log(`  Public assets:  public/sites/${args.slug}/`)
  console.log(`  Domain:         ${args.domain}`)
}

main().catch((err) => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
