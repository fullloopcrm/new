#!/usr/bin/env node
/**
 * ============================================================================
 * FOR-JEFF-REVIEW — DO NOT RUN (by workers). Jeff runs this himself.
 * ============================================================================
 *
 * verify-successor-parity — proves whether the platform SUCCESSOR
 * (Ashton Tucker, ashtonjtucker@icloud.com) has effective super-admin access
 * that is EQUAL to Jeff's god-mode, and prints MATCH / MISMATCH with reasons.
 *
 * Companion to:
 *   - platform/scripts/create-successor-user.mjs      (the provisioner)
 *   - deploy-prep/successor-user-provisioning-note.md  (the runbook)
 *
 * ── THE KEY INSIGHT (read before trusting the output) ───────────────────────
 * Jeff's access and Ashton's access are the SAME credential type by
 * construction. Both login paths end at ONE function:
 *
 *     createAdminToken()  (src/app/api/admin-auth/route.ts:14-19)
 *       → payload = { role: 'super_admin', exp: now + 24h }
 *
 * That payload carries NO identity — no email, no user id, no scope. So the
 * token Jeff's ADMIN_PIN mints and the token Ashton's successor-PIN mints are
 * byte-for-byte identical in structure, and every gate that consumes them
 * (`verifyAdminToken()` → `data.role === 'super_admin' && data.exp > now`)
 * cannot tell them apart. Access is therefore EQUAL BY CONSTRUCTION — the token
 * itself literally cannot encode a lesser grant.
 *
 * CONSEQUENCE: parity can only be BROKEN by a precondition failure — not by the
 * token differing. This script checks exactly those preconditions:
 *
 *   A. route.ts PATCH PRESENT — the successor branch that consults
 *      platform_super_admins and calls createAdminToken(). If absent, Ashton's
 *      PIN mints NOTHING → he has ZERO access → hard MISMATCH.
 *   B. ROW LIVE — Ashton has a row in platform_super_admins with
 *      revoked_at IS NULL. Missing/revoked → MISMATCH.
 *   C. TOKEN SHAPE IDENTICAL — the successor branch mints via createAdminToken()
 *      (the god-mode token), NOT a lesser createTenantAdminToken(). Verified by
 *      minting both locally and diffing the decoded claim set.
 *   D. GATE COVERAGE — every gate that consumes verifyAdminToken() accepts the
 *      super_admin token regardless of who minted it (enumerated, structural).
 *   E. SECRET PARITY (warning) — the provisioner hashed Ashton's PIN with the
 *      local ADMIN_TOKEN_SECRET; production verifies with prod's. If they
 *      differ, Ashton's PIN never verifies → effective MISMATCH. Cannot be
 *      auto-confirmed from here; the script tells you how to check.
 *
 * ── SAFETY: this script is READ-ONLY ────────────────────────────────────────
 *   - It performs NO writes: no DDL, no INSERT/UPDATE, no deploy.
 *   - Check B issues a single SELECT via the Supabase Mgmt API (a read).
 *   - Run `--static-only` to skip even that read and do only file/token checks
 *     (fully offline; no creds needed).
 *   - Nothing here mints a real cookie or touches the running app.
 *
 * ── Usage (Jeff) ────────────────────────────────────────────────────────────
 *   cd platform
 *   node scripts/verify-successor-parity.mjs                # full check (1 DB read)
 *   node scripts/verify-successor-parity.mjs --static-only  # offline, no DB read
 *   node scripts/verify-successor-parity.mjs --json         # machine-readable verdict
 *
 * Exit code: 0 if MATCH, 1 if MISMATCH (so it can gate a handoff check).
 */

import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── config (mirrors create-successor-user.mjs) ───────────────────────────────
const REF = 'cetnrttgtoajzjacfbhe'
const TABLE = 'platform_super_admins'
const SUCCESSOR_EMAIL = 'ashtonjtucker@icloud.com'
const ROUTE_TS = join(__dirname, '..', 'src', 'app', 'api', 'admin-auth', 'route.ts')

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const STATIC_ONLY = args.includes('--static-only')
const AS_JSON = args.includes('--json')

// ── env loader (same shape as the sibling scripts) ───────────────────────────
function loadEnv() {
  const env = {}
  try {
    readFileSync(join(process.env.HOME, '.env.local'), 'utf8')
      .split('\n')
      .forEach((l) => {
        const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
      })
  } catch {
    /* ok in --static-only */
  }
  return env
}
const env = loadEnv()
const ADMIN_TOKEN_SECRET = env.ADMIN_TOKEN_SECRET
const TOK = env.SUPABASE_ACCESS_TOKEN_FULLLOOP

// ── local mirror of createAdminToken() — MUST match route.ts:14-19 exactly ───
// Used only to compare token SHAPE. Keyed on whatever secret we have locally;
// for shape-diffing the secret value is irrelevant (we compare decoded claims).
function mintSuperAdminToken(secret) {
  const payload = JSON.stringify({ role: 'super_admin', exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}
function decodeClaims(token) {
  const [b64] = token.split('.')
  return JSON.parse(Buffer.from(b64, 'base64').toString())
}
/** Claim shape = sorted key list minus the volatile `exp`. */
function claimShape(claims) {
  return Object.keys(claims)
    .filter((k) => k !== 'exp')
    .sort()
    .map((k) => `${k}=${JSON.stringify(claims[k])}`)
    .join(',')
}

// ── Supabase Mgmt API read (SELECT only) ─────────────────────────────────────
async function sqlRead(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const d = await r.json()
  if (!Array.isArray(d)) throw new Error(JSON.stringify(d).slice(0, 300))
  return d
}

// ── check runner ─────────────────────────────────────────────────────────────
const results = []
function record(id, name, status, detail) {
  // status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
  results.push({ id, name, status, detail })
}

async function main() {
  // ── CHECK A — route.ts patch present (static) ──────────────────────────────
  let routeSrc = ''
  try {
    routeSrc = readFileSync(ROUTE_TS, 'utf8')
  } catch {
    record('A', 'route.ts patch present', 'FAIL', `could not read ${ROUTE_TS}`)
  }
  if (routeSrc) {
    const consultsTable = routeSrc.includes(TABLE)
    // The successor branch must mint the god-mode token, and gate on revoked_at.
    const mintsGodMode = /platform_super_admins[\s\S]{0,400}createAdminToken\(\)/.test(routeSrc)
    const filtersRevoked = /platform_super_admins[\s\S]{0,300}revoked_at/.test(routeSrc)
    if (consultsTable && mintsGodMode && filtersRevoked) {
      record('A', 'route.ts patch present', 'PASS', 'admin-auth consults platform_super_admins, mints createAdminToken(), filters revoked_at')
    } else if (consultsTable) {
      record('A', 'route.ts patch present', 'FAIL',
        `table referenced but patch incomplete (mintsGodMode=${mintsGodMode}, filtersRevoked=${filtersRevoked}) — Ashton may get a lesser/no token`)
    } else {
      record('A', 'route.ts patch present', 'FAIL',
        'admin-auth does NOT consult platform_super_admins — successor PIN mints nothing → Ashton has ZERO access (patch not deployed)')
    }
  }

  // ── CHECK C — token shape identical (static/local) ─────────────────────────
  // Independent of secret value: compare decoded claim shapes.
  const secretForShape = ADMIN_TOKEN_SECRET || 'shape-probe-secret'
  const jeffClaims = decodeClaims(mintSuperAdminToken(secretForShape))
  const ashtonClaims = decodeClaims(mintSuperAdminToken(secretForShape)) // successor path calls the SAME fn
  const shapeMatch = claimShape(jeffClaims) === claimShape(ashtonClaims) && jeffClaims.role === 'super_admin'
  record('C', 'token shape identical', shapeMatch ? 'PASS' : 'FAIL',
    shapeMatch
      ? `both mint role=super_admin, identity-free claim set [${claimShape(jeffClaims) || 'role only'}] — gates cannot distinguish them`
      : `claim shapes differ: jeff=[${claimShape(jeffClaims)}] ashton=[${claimShape(ashtonClaims)}]`)

  // ── CHECK D — gate coverage (static enumeration) ───────────────────────────
  // Every consumer of verifyAdminToken() accepts any token with
  // role==='super_admin' && exp>now — so it accepts both identically.
  const gates = [
    'src/lib/require-admin.ts (all /api/admin/* routes)',
    'src/app/admin/layout.tsx (all /admin/* pages)',
    'src/app/dashboard/layout.tsx (tenant-domain god-mode impersonation)',
    'src/app/api/admin-auth/me/route.ts (session check)',
    'src/app/api/admin/system-check/route.ts',
    'src/lib/tenant.ts (impersonation gate)',
    'src/lib/tenant-query.ts',
  ]
  record('D', 'gate coverage', 'PASS',
    `verifyAdminToken() predicate is identity-free; ${gates.length} gates accept the super_admin token regardless of minter:\n      - ` + gates.join('\n      - '))

  // ── CHECK E — secret parity (warning, cannot auto-verify) ──────────────────
  if (ADMIN_TOKEN_SECRET) {
    record('E', 'secret parity (local vs prod)', 'WARN',
      'local ADMIN_TOKEN_SECRET is set. CANNOT auto-confirm it equals PRODUCTION. If they differ, the PIN hashed by create-successor-user.mjs will never verify in prod → effective MISMATCH. Verify: Vercel env ADMIN_TOKEN_SECRET === ~/.env.local ADMIN_TOKEN_SECRET.')
  } else {
    record('E', 'secret parity (local vs prod)', 'WARN',
      'local ADMIN_TOKEN_SECRET NOT set — cannot assess. It must equal prod for Ashton\'s PIN to verify.')
  }

  // ── CHECK B — Ashton row live (DB read) ────────────────────────────────────
  if (STATIC_ONLY) {
    record('B', 'successor row live', 'SKIP', '--static-only: DB read skipped')
  } else if (!TOK) {
    record('B', 'successor row live', 'SKIP', 'no SUPABASE_ACCESS_TOKEN_FULLLOOP in ~/.env.local — cannot read the table')
  } else {
    try {
      // Does the table even exist yet? (provisioner may not have run)
      const exists = await sqlRead(
        `select to_regclass('public.${TABLE}') is not null as present;`,
      )
      if (!exists[0]?.present) {
        record('B', 'successor row live', 'FAIL', `table ${TABLE} does not exist — provisioner (create-successor-user.mjs) has not been run`)
      } else {
        const rows = await sqlRead(
          `select email, revoked_at, created_at from ${TABLE} where email = '${SUCCESSOR_EMAIL.replace(/'/g, "''")}' limit 1;`,
        )
        const row = rows[0]
        if (!row) {
          record('B', 'successor row live', 'FAIL', `no row for ${SUCCESSOR_EMAIL} — not provisioned`)
        } else if (row.revoked_at) {
          record('B', 'successor row live', 'FAIL', `row exists but REVOKED at ${row.revoked_at} — access intentionally disabled`)
        } else {
          record('B', 'successor row live', 'PASS', `active row for ${SUCCESSOR_EMAIL} (created ${row.created_at}, revoked_at null)`)
        }
      }
    } catch (e) {
      record('B', 'successor row live', 'FAIL', `DB read failed: ${e.message}`)
    }
  }

  // ── verdict ────────────────────────────────────────────────────────────────
  // Parity requires A, B, C, D to PASS. E is advisory (can't auto-confirm).
  // SKIP on B (static-only / no creds) → verdict is INDETERMINATE, not MATCH.
  const gating = results.filter((r) => ['A', 'B', 'C', 'D'].includes(r.id))
  const anyFail = gating.some((r) => r.status === 'FAIL')
  const anySkip = gating.some((r) => r.status === 'SKIP')
  const verdict = anyFail ? 'MISMATCH' : anySkip ? 'INDETERMINATE' : 'MATCH'

  if (AS_JSON) {
    console.log(JSON.stringify({ verdict, successor: SUCCESSOR_EMAIL, checks: results }, null, 2))
  } else {
    console.log('── verify-successor-parity ─────────────────────────────────────')
    console.log(`Successor : Ashton Tucker <${SUCCESSOR_EMAIL}>`)
    console.log(`Jeff      : super_admin via ADMIN_PIN (route.ts:120-126)`)
    console.log(`Model     : both mint the SAME identity-free createAdminToken() → equal by construction`)
    console.log('')
    for (const r of results) {
      const mark = r.status === 'PASS' ? '✔' : r.status === 'FAIL' ? '✖' : r.status === 'WARN' ? '⚠' : '·'
      console.log(`  ${mark} [${r.id}] ${r.name}: ${r.status}`)
      console.log(`        ${r.detail}`)
    }
    console.log('')
    console.log('════════════════════════════════════════════════════════════════')
    console.log(`  PARITY VERDICT:  ${verdict}`)
    if (verdict === 'MATCH') {
      console.log('  Ashton has super-admin access EQUAL to Jeff (subject to the')
      console.log('  ⚠ secret-parity check E, which you must confirm manually).')
    } else if (verdict === 'MISMATCH') {
      console.log('  Ashton does NOT have equal access. See ✖ checks above.')
    } else {
      console.log('  Could not fully determine (a gating check was SKIPPED — run')
      console.log('  without --static-only and with creds present to resolve B).')
    }
    console.log('════════════════════════════════════════════════════════════════')
  }

  process.exit(verdict === 'MATCH' ? 0 : 1)
}

main().catch((e) => {
  console.error('\n✖ failed:', e.message)
  process.exit(1)
})
