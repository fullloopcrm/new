#!/usr/bin/env node
/**
 * ============================================================================
 * FOR-JEFF-REVIEW — DO NOT RUN. Jeff runs this himself, after reading it.
 * ============================================================================
 *
 * Provision the platform SUCCESSOR (Ashton Tucker, ashtonjtucker@icloud.com —
 * see SUCCESSOR-CONTACT.md) with full-access ("god-mode") equivalent to Jeff's
 * own platform admin access, in a way that is INDIVIDUALLY REVOCABLE without a
 * redeploy.
 *
 * ── READ THIS FIRST: how "Jeff full access" actually works ──────────────────
 * I read the real auth model before writing this. Full access is NOT a user row
 * in any table today — it is a CREDENTIAL. The gate everything hangs off is
 * `verifyAdminToken()`, which only accepts a token whose payload is
 * `{ role: 'super_admin' }`:
 *
 *   - MINTED at src/app/api/admin-auth/route.ts:120-126 — the ONLY live path:
 *       `if (ADMIN_PIN && pin === ADMIN_PIN)` → createAdminToken() (role
 *       'super_admin', god-mode, any tenant, any host). Plain string compare
 *       against the single env var ADMIN_PIN.
 *   - SIGNED/VERIFIED with ADMIN_TOKEN_SECRET (route.ts:11, 14-41).
 *   - GATES: /admin/* pages (src/app/admin/layout.tsx:48-51), every admin API
 *       (src/lib/require-admin.ts:5-14), and tenant-domain /dashboard god-mode
 *       (src/app/dashboard/layout.tsx:32).
 *   - The Clerk path (SUPER_ADMIN_CLERK_ID, src/app/dashboard/layout.tsx:12,43)
 *       is DORMANT: getOwnerUserId() (src/lib/owner-session.ts) returns null in
 *       practice ("moved off Clerk"), and there is no @clerk dependency. Do not
 *       rely on it.
 *   - Per-member tenant PINs (tenant_members.pin_hash → createTenantAdminToken,
 *       route.ts:44-84) are `role: 'tenant_admin'`, scoped to ONE tenant, and
 *       can NEVER pass verifyAdminToken() (route.ts:34-37). Inserting a
 *       tenant_members row therefore does NOT grant equivalent full access.
 *
 * CONSEQUENCE: the only zero-code way to give Ashton equal access today is to
 * hand him the shared ADMIN_PIN — which is shared, unattributed, and can't be
 * revoked for him without locking Jeff out too. This script implements the
 * better option: a DEDICATED super-admin PIN for Ashton, stored hashed in a new
 * `platform_super_admins` table, honored by a ~12-line patch to route.ts.
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │ THE ROW THIS SCRIPT CREATES IS INERT UNTIL THE route.ts PATCH BELOW    │
 *   │ IS DEPLOYED. Until then, Ashton's PIN does nothing. The patch + full   │
 *   │ runbook + rollback are in deploy-prep/successor-user-provisioning-note │
 *   │ .md. This script prints the patch again at the end.                    │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * ── What this script does when Jeff runs it ─────────────────────────────────
 *   1. Loads SUPABASE_ACCESS_TOKEN_FULLLOOP + ADMIN_TOKEN_SECRET from
 *      ~/.env.local (same loader as scripts/reconcile-tenant-config.mjs).
 *   2. CREATE TABLE IF NOT EXISTS platform_super_admins (idempotent).
 *   3. Generates a random 6-digit PIN (or uses --pin=NNNNNN), hashes it with the
 *      EXACT scheme src/lib/admin-pin.ts uses:
 *          HMAC-SHA256( key = ADMIN_TOKEN_SECRET, msg = `tenant-admin-pin:${pin}` )
 *      and upserts Ashton's row. Idempotent on email; use --rotate to re-issue.
 *   4. Prints the PIN ONCE (it is never stored in clear and can't be recovered)
 *      and the route.ts patch.
 *
 * ── CRITICAL correctness note ───────────────────────────────────────────────
 * The ADMIN_TOKEN_SECRET in your ~/.env.local MUST be byte-identical to the
 * ADMIN_TOKEN_SECRET the PRODUCTION server verifies with. hashAdminPin() keys
 * on it; if local ≠ prod, Ashton's PIN will silently never work. Verify before
 * handing off the PIN (the note explains how).
 *
 * ── Usage (Jeff) ────────────────────────────────────────────────────────────
 *   node scripts/create-successor-user.mjs --dry-run     # show plan + DDL, no writes
 *   node scripts/create-successor-user.mjs               # provision (generates a PIN)
 *   node scripts/create-successor-user.mjs --pin=482913  # provision with a chosen PIN
 *   node scripts/create-successor-user.mjs --rotate      # re-issue a new PIN for Ashton
 *
 * READ-ONLY / SAFE: --dry-run performs no writes (no DDL, no insert).
 */

import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── Supabase project (matches scripts/reconcile-tenant-config.mjs) ───────────
const REF = 'cetnrttgtoajzjacfbhe'

// ── Successor identity (SUCCESSOR-CONTACT.md, provided by Jeff 2026-07-12) ───
const SUCCESSOR = {
  name: 'Ashton Tucker',
  email: 'ashtonjtucker@icloud.com',
}

const TABLE = 'platform_super_admins'

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const ROTATE = args.includes('--rotate')
const pinFlag = args.find((a) => a.startsWith('--pin='))
const CHOSEN_PIN = pinFlag ? pinFlag.slice('--pin='.length) : null

// ── env loader (same shape as reconcile-tenant-config.mjs) ───────────────────
function loadEnv() {
  const env = {}
  const path = join(process.env.HOME, '.env.local')
  try {
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((l) => {
        const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
      })
  } catch {
    console.error(`\n✖ Could not read ${path}. This script needs it for creds.`)
    process.exit(1)
  }
  return env
}

const env = loadEnv()
const TOK = env.SUPABASE_ACCESS_TOKEN_FULLLOOP
const ADMIN_TOKEN_SECRET = env.ADMIN_TOKEN_SECRET

if (!TOK) {
  console.error('✖ missing SUPABASE_ACCESS_TOKEN_FULLLOOP in ~/.env.local (Supabase Mgmt API token)')
  process.exit(1)
}
if (!ADMIN_TOKEN_SECRET) {
  // Mirror the app: hashAdminPin() throws without it. Fail closed rather than
  // emit a hash keyed on an empty/guessable secret.
  console.error('✖ missing ADMIN_TOKEN_SECRET in ~/.env.local — cannot hash the PIN.')
  console.error('  It MUST equal the production ADMIN_TOKEN_SECRET or the PIN will never verify.')
  process.exit(1)
}

// ── PIN helpers — MUST match src/lib/admin-pin.ts exactly ────────────────────
/** HMAC-SHA256(secret, `tenant-admin-pin:${pin}`) — identical to hashAdminPin(). */
function hashPin(pin) {
  return crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(`tenant-admin-pin:${pin}`).digest('hex')
}
/** Cryptographically random 6-digit PIN, zero-padded — identical to generateAdminPin(). */
function genPin() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}
function isValidPin(pin) {
  return /^\d{4,8}$/.test(pin)
}

// ── Supabase Management API SQL (same helper as reconcile-tenant-config.mjs) ──
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const d = await r.json()
  if (!Array.isArray(d)) throw new Error('SQL: ' + JSON.stringify(d).slice(0, 300))
  return d
}

// SQL-string escape for a literal (single quotes doubled). Inputs here are
// constants (email/name from SUCCESSOR) + a numeric PIN hash, but escape anyway.
const q = (s) => String(s).replace(/'/g, "''")

const DDL = `
create table if not exists ${TABLE} (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  pin_hash    text not null,
  created_at  timestamptz not null default now(),
  created_by  text,
  revoked_at  timestamptz
);
comment on table ${TABLE} is
  'Additional platform super-admins (successors). pin_hash = hashAdminPin(pin). A non-revoked row grants god-mode via the src/app/api/admin-auth patch. Revoke = set revoked_at (no redeploy).';
`.trim()

const ROUTE_PATCH = `
// ── src/app/api/admin-auth/route.ts ─────────────────────────────────────────
// Add this block RIGHT AFTER the existing global ADMIN_PIN check
// (the \`if (ADMIN_PIN && pin === ADMIN_PIN) { ... }\` block, ~line 126),
// and BEFORE the per-tenant member-PIN block. It reuses createAdminToken() so a
// successor gets the SAME super_admin token as Jeff — genuinely equivalent
// full access — and is revocable by setting revoked_at (no redeploy).

  // 1b) Successor / additional super-admins — individually-revocable god-mode.
  {
    const { data: sa } = await supabaseAdmin
      .from('platform_super_admins')
      .select('id, email')
      .eq('pin_hash', hashAdminPin(pin))
      .is('revoked_at', null)
      .maybeSingle()
    if (sa) {
      const res = NextResponse.json({ success: true, role: 'super_admin' })
      setAdminCookie(res, createAdminToken())
      await sendLoginAlert({ ip, ua, who: \`Super Admin (successor: \${sa.email})\` })
      return res
    }
  }
// hashAdminPin is already imported at the top of route.ts (line 6). No new imports.
`.trim()

async function main() {
  console.log('── create-successor-user ───────────────────────────────────────')
  console.log(`Successor : ${SUCCESSOR.name} <${SUCCESSOR.email}>`)
  console.log(`Project   : ${REF}`)
  console.log(`Mode      : ${DRY_RUN ? 'DRY-RUN (no writes)' : ROTATE ? 'ROTATE' : 'PROVISION'}`)
  console.log('')
  console.log('Auth model (verified): god-mode = super_admin admin_token, minted only')
  console.log('via ADMIN_PIN today (Clerk path dormant). This adds a second, revocable')
  console.log('super-admin credential. THE ROW IS INERT until the route.ts patch ships.')
  console.log('')

  // The PIN we will issue (needed even in dry-run to validate a --pin).
  const pin = CHOSEN_PIN ?? genPin()
  if (!isValidPin(pin)) {
    console.error(`✖ PIN "${pin}" is invalid (must be 4–8 digits).`)
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log('DRY-RUN plan:')
    console.log('  1. ensure table:\n')
    console.log(DDL.replace(/^/gm, '     '))
    console.log('')
    console.log(`  2. upsert row for ${SUCCESSOR.email} (pin_hash withheld in dry-run)`)
    console.log('  3. print the PIN + route.ts patch')
    console.log('\nNo writes performed. Re-run without --dry-run to apply.')
    console.log('\n' + ROUTE_PATCH + '\n')
    return
  }

  // 1) ensure table
  console.log('→ ensuring table exists…')
  await sql(DDL)

  // 2) look up existing row
  const existing = await sql(`select id, email, revoked_at from ${TABLE} where email = '${q(SUCCESSOR.email)}' limit 1;`)
  const row = existing[0]

  if (row && !ROTATE) {
    console.log(`\n• ${SUCCESSOR.email} already provisioned (id=${row.id}, revoked_at=${row.revoked_at ?? 'null'}).`)
    console.log('  No PIN issued. To re-issue a fresh PIN, re-run with --rotate.')
    return
  }

  const pinHash = hashPin(pin)

  if (row && ROTATE) {
    console.log('→ rotating PIN for existing successor row…')
    await sql(
      `update ${TABLE} set pin_hash = '${q(pinHash)}', revoked_at = null, created_at = now() where email = '${q(SUCCESSOR.email)}';`,
    )
  } else {
    console.log('→ inserting successor row…')
    await sql(
      `insert into ${TABLE} (email, name, pin_hash, created_by) ` +
        `values ('${q(SUCCESSOR.email)}', '${q(SUCCESSOR.name)}', '${q(pinHash)}', 'create-successor-user.mjs (Jeff)');`,
    )
  }

  console.log('\n✔ Provisioned.')
  console.log('\n════════════════════════════════════════════════════════════════')
  console.log(`  SUCCESSOR PIN for ${SUCCESSOR.name}:  ${pin}`)
  console.log('  Shown ONCE. Not recoverable. Hand it to Ashton over a secure')
  console.log('  channel, then it is only stored as an irreversible hash.')
  console.log('════════════════════════════════════════════════════════════════')
  console.log('\nNEXT (required — the PIN does nothing until this ships):')
  console.log('  Apply the route.ts patch below, then deploy. See')
  console.log('  deploy-prep/successor-user-provisioning-note.md for the full runbook,')
  console.log('  verification, and rollback.\n')
  console.log(ROUTE_PATCH + '\n')
  console.log('REVOKE later (no redeploy):')
  console.log(`  update ${TABLE} set revoked_at = now() where email = '${SUCCESSOR.email}';\n`)
}

main().catch((e) => {
  console.error('\n✖ failed:', e.message)
  process.exit(1)
})
