#!/usr/bin/env node
/**
 * Post-deploy live-domain re-probe. Per deploy-prep/gated-wave-plan.md WAVE 5:
 * "Re-probe all 22 live domains post-deploy (pre-merge green does NOT carry
 * forward)." Pre-merge CI green only proves the build compiles -- it says
 * nothing about DNS, TLS, tenant resolution, or middleware routing on the
 * actual live hostnames. This hits each live tenant domain's /api/health and
 * /api/tenant/public over HTTPS and reports any non-200 response.
 *
 * READ-ONLY. GET requests only, against live URLs -- no DB access, no writes.
 *
 * Usage:
 *   node scripts/reprobe-live-domains.mjs
 *   node scripts/reprobe-live-domains.mjs --domains-file ./custom-domains.json
 *   node scripts/reprobe-live-domains.mjs --timeout 15000
 *
 * Exit code: 0 if every confirmed domain returns 200 on both endpoints,
 * 1 otherwise (skipped/unconfirmed domains do not affect exit code but are
 * printed so they aren't mistaken for a clean run).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = { domainsFile: join(REPO, 'scripts', 'live-tenant-domains.json'), timeoutMs: 10000 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--domains-file' && argv[i + 1]) args.domainsFile = argv[++i]
    if (argv[i] === '--timeout' && argv[i + 1]) args.timeoutMs = Number(argv[++i])
  }
  return args
}

const ENDPOINTS = ['/api/health', '/api/tenant/public']

async function probeOne(domain, path, timeoutMs) {
  const url = `https://${domain}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    return { url, ok: res.status === 200, status: res.status, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { url, ok: false, status: null, error: message }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const { domainsFile, timeoutMs } = parseArgs(process.argv.slice(2))

  let config
  try {
    config = JSON.parse(readFileSync(domainsFile, 'utf8'))
  } catch (err) {
    console.error(`could not read/parse domains file at ${domainsFile}: ${err.message}`)
    process.exit(1)
  }

  const entries = config.domains || []
  const confirmed = entries.filter((e) => e.confirmed && e.domain)
  const skipped = entries.filter((e) => !e.confirmed || !e.domain)

  console.log(`Re-probing ${confirmed.length} live tenant domain(s), ${ENDPOINTS.length} endpoint(s) each, timeout ${timeoutMs}ms...\n`)

  const results = []
  for (const entry of confirmed) {
    const perDomain = await Promise.all(
      ENDPOINTS.map((path) => probeOne(entry.domain, path, timeoutMs))
    )
    results.push({ entry, checks: perDomain })
    const line = perDomain
      .map((c) => (c.ok ? `${c.url} -> 200` : `${c.url} -> ${c.status ?? 'ERR'}${c.error ? ` (${c.error})` : ''}`))
      .join('  |  ')
    const allOk = perDomain.every((c) => c.ok)
    console.log(`${allOk ? '✅' : '❌'} ${entry.slug} (${entry.domain})  ${line}`)
  }

  const failures = results.filter((r) => r.checks.some((c) => !c.ok))

  console.log(`\n${confirmed.length - failures.length}/${confirmed.length} confirmed domains fully green.`)

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped ${skipped.length} unconfirmed/no-domain entr${skipped.length === 1 ? 'y' : 'ies'} (not counted above):`)
    for (const e of skipped) {
      console.log(`   • ${e.slug}${e.note ? ` -- ${e.note}` : ' -- no confirmed domain on file'}`)
    }
  }

  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} domain(s) with a non-200 response:`)
    for (const f of failures) {
      for (const c of f.checks.filter((c) => !c.ok)) {
        console.log(`   • ${f.entry.slug}: ${c.url} -> ${c.status ?? 'ERR'}${c.error ? ` (${c.error})` : ''}`)
      }
    }
    process.exit(1)
  }

  console.log('\n✅ All confirmed live domains returned 200 on both endpoints.')
}

main()
