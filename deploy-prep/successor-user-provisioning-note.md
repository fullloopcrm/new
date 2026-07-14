# Successor User Provisioning — Runbook (FOR JEFF)

> Companion to `platform/scripts/create-successor-user.mjs` (**FOR-JEFF-REVIEW, DO NOT RUN** by workers — Jeff runs it).
> Goal: give the platform successor **Ashton Tucker** (`ashtonjtucker@icloud.com`, per `SUCCESSOR-CONTACT.md`) full-access equal to Jeff's, in a way Jeff can revoke for Ashton alone without a redeploy.
> Authored by W4 2026-07-12. **Not executed** — W4 is read-only and does not run DB writes, patch auth code, or deploy. Every step below is Jeff's to run.

---

## 0. The one thing you must understand first

**"Jeff full access" is not a user row anywhere. It is a credential.** I verified the auth model in code before writing this:

| Fact | Where |
|---|---|
| God-mode = an `admin_token` cookie whose payload is `role: 'super_admin'`, checked by `verifyAdminToken()` | `platform/src/app/api/admin-auth/route.ts:21-41` |
| The **only live** way to mint it: submit the single env `ADMIN_PIN` at admin login (`pin === ADMIN_PIN` → `createAdminToken()`) | `route.ts:120-126`, mint at `:14-19` |
| Token is signed/verified with `ADMIN_TOKEN_SECRET` | `route.ts:11` |
| It gates: all `/admin/*` pages, every admin API, and tenant-domain `/dashboard` god-mode | `src/app/admin/layout.tsx:48-51`, `src/lib/require-admin.ts:5-14`, `src/app/dashboard/layout.tsx:32` |
| The Clerk super-admin path (`SUPER_ADMIN_CLERK_ID`) is **dormant** — `getOwnerUserId()` returns null ("moved off Clerk"), no `@clerk` dep | `src/app/dashboard/layout.tsx:12,43`, `src/lib/owner-session.ts` |
| Per-member tenant PINs are `role: 'tenant_admin'`, scoped to ONE tenant, and can **never** pass the super-admin gate | `route.ts:34-37,44-84` |

**So inserting a row into any existing table does not grant god-mode.** Nothing existing is consulted for it.

---

## 1. Your three real options (pick one)

| # | Option | Grants equal access? | Individually revocable? | Code change? | Effort |
|---|---|---|---|---|---|
| **A** | Give Ashton the **existing `ADMIN_PIN`** | ✅ Yes, immediately | ❌ No — rotating it locks Jeff out too; no attribution | None | 1 min |
| **B1** | Add a **second super-admin PIN via a new env var** (e.g. `ADMIN_PIN_SUCCESSOR`) and check it alongside `ADMIN_PIN` | ✅ Yes | ⚠️ Revoke = unset env + redeploy | ~2 lines in `route.ts` + 1 env var | 10 min + deploy |
| **B2** | **This script's path**: dedicated hashed PIN in `platform_super_admins`, honored by a route.ts patch | ✅ Yes | ✅ Yes — `set revoked_at`, **no redeploy** | ~12 lines in `route.ts` + 1 table | 20 min + deploy |

**Recommendation: B2.** A successor credential should be attributable to Ashton and revocable without collateral damage to Jeff. A shared PIN (A) fails both; B1 needs a redeploy to revoke. B2 is what `create-successor-user.mjs` implements. The rest of this runbook is B2; A and B1 fallbacks are in §6.

---

## 2. What B2 access actually grants Ashton

Once live, Ashton's PIN mints the **same `super_admin` token as Jeff's** (`createAdminToken()`), so he gets **identical god-mode**:

- Full `/admin/*` platform admin (all tenants: businesses, sales, ComHub, security, settings, tenant chats, monitoring…).
- Every admin API (anything behind `requireAdmin()`).
- Impersonate any tenant's `/dashboard` (the `admin_token` satisfies both the platform gate and the tenant-domain gate).

It is **equivalent**, not lesser. The only difference from Jeff is the credential is a separate PIN in a table row you can revoke on its own.

---

## 3. Pre-flight (do this before running anything)

1. **`ADMIN_TOKEN_SECRET` must match production.** The script hashes the PIN with `HMAC-SHA256(ADMIN_TOKEN_SECRET, "tenant-admin-pin:<pin>")` (identical to `src/lib/admin-pin.ts`). The **production** server verifies the login PIN with the same function, so if the `ADMIN_TOKEN_SECRET` in your `~/.env.local` differs from prod, **Ashton's PIN will silently never work.** Confirm they're the same value (check Vercel env → `ADMIN_TOKEN_SECRET` vs your `~/.env.local`).
2. **`~/.env.local` has `SUPABASE_ACCESS_TOKEN_FULLLOOP`** (Supabase Mgmt API token — same one `reconcile-tenant-config.mjs` uses).
3. **Dry run first:**
   ```bash
   cd platform
   node scripts/create-successor-user.mjs --dry-run
   ```
   This writes nothing. It prints the table DDL, the plan, and the route.ts patch. Read them.

---

## 4. Provision (B2)

### Step 1 — create the table + Ashton's row
```bash
cd platform
node scripts/create-successor-user.mjs
```
- Creates `platform_super_admins` if missing (idempotent DDL — safe to re-run).
- Inserts Ashton's row with a freshly generated 6-digit PIN.
- **Prints the PIN once.** It is only stored as an irreversible hash — copy it now, hand it to Ashton over a secure channel (not email/SMS in the clear).
- Idempotent: re-running with the row present issues **no** new PIN. To re-issue: `--rotate`. To pick the PIN: `--pin=NNNNNN`.

> **DDL note / worker-lane rule:** the script runs the `create table if not exists` itself via the Supabase Mgmt API when *you* run it. If you'd rather the DDL go through the leader's prod-DDL approval flow instead, run this SQL first, then the script only inserts:
> ```sql
> create table if not exists platform_super_admins (
>   id uuid primary key default gen_random_uuid(),
>   email text not null unique,
>   name text,
>   pin_hash text not null,
>   created_at timestamptz not null default now(),
>   created_by text,
>   revoked_at timestamptz
> );
> ```

### Step 2 — apply the route.ts patch (makes the row live)
The row does **nothing** until `admin-auth` consults the table. In `platform/src/app/api/admin-auth/route.ts`, **immediately after** the existing `if (ADMIN_PIN && pin === ADMIN_PIN) { … }` block (~line 126) and **before** the per-tenant member-PIN block, insert:

```ts
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
      await sendLoginAlert({ ip, ua, who: `Super Admin (successor: ${sa.email})` })
      return res
    }
  }
```
- `hashAdminPin`, `supabaseAdmin`, `createAdminToken`, `setAdminCookie`, `sendLoginAlert` are **already imported/defined** in that file — no new imports.
- This is a **security-sensitive auth change.** Review it yourself; it should go through normal review + typecheck (`npx tsc --noEmit`) + the code-review gate before deploy.

### Step 3 — deploy
Deploy the patched `route.ts` the normal way. Until this deploy lands, Ashton cannot log in.

---

## 5. Verify (do not skip — an unverified auth grant is worthless)

1. In an incognito window, go to the admin login (`/admin-login`).
2. Enter **Ashton's** PIN. Expect: redirect into `/admin`, full platform admin visible.
3. Confirm you received a login alert reading `Super Admin (successor: ashtonjtucker@icloud.com)` (from `sendLoginAlert`) — proves the successor branch fired, not the shared-PIN branch.
4. Confirm **Jeff's** own `ADMIN_PIN` still works (the patch is additive; it must not have broken the original path).
5. Negative check: set `revoked_at` (see §7), retry Ashton's PIN → expect **rejected** (401). Then unset to restore. This proves revocation works before you rely on it.

---

## 6. Fallbacks (if you choose A or B1 instead)

- **A — share `ADMIN_PIN`:** nothing to run. Just give Ashton the current `ADMIN_PIN`. Accept: shared secret, no attribution, and rotating it (to remove his access) also changes Jeff's login. Skip this script entirely.
- **B1 — second env PIN:** in `route.ts`, change the check to also accept a second secret, e.g.:
  ```ts
  const ADMIN_PIN_SUCCESSOR = process.env.ADMIN_PIN_SUCCESSOR || ''
  if (ADMIN_PIN && pin === ADMIN_PIN) { /* …existing… */ }
  if (ADMIN_PIN_SUCCESSOR && pin === ADMIN_PIN_SUCCESSOR) {
    const res = NextResponse.json({ success: true, role: 'super_admin' })
    setAdminCookie(res, createAdminToken())
    await sendLoginAlert({ ip, ua, who: 'Super Admin (successor)' })
    return res
  }
  ```
  Set `ADMIN_PIN_SUCCESSOR` in Vercel env, deploy. Revoke = unset env + redeploy. No table, no script.

---

## 7. Rollback / revoke

| To undo… | Do this |
|---|---|
| **Revoke Ashton's access (B2), keep everything** | `update platform_super_admins set revoked_at = now() where email = 'ashtonjtucker@icloud.com';` — instant, **no redeploy** (the patch filters `revoked_at is null`). |
| **Re-issue Ashton a new PIN** | `node scripts/create-successor-user.mjs --rotate` |
| **Fully remove the feature** | Revert the `route.ts` patch + deploy; then optionally `drop table platform_super_admins;`. Reverting the patch alone (without dropping the table) already disables it — the table becomes inert again. |
| **Undo B1** | Unset `ADMIN_PIN_SUCCESSOR` in Vercel, revert the `route.ts` lines, redeploy. |
| **Undo A** | Rotate `ADMIN_PIN` (also changes Jeff's PIN — coordinate). |

---

## 8. Security notes

- The PIN is shown once and stored only as an HMAC hash keyed on `ADMIN_TOKEN_SECRET` — not reversible without the server secret.
- Rate limiting on `/api/admin-auth` (5 / 15 min per IP, `route.ts:106-109`) applies to the successor PIN too — brute-force is bounded.
- Login alerts fire for the successor branch, so you have an audit trail of successor logins.
- Treat `platform_super_admins` as sensitive: any non-revoked row = god-mode. If the DB is ever compromised the hashes are useless without `ADMIN_TOKEN_SECRET`, but a writer could insert their own row — so restrict who holds the Supabase service role / Mgmt token (already the case).
