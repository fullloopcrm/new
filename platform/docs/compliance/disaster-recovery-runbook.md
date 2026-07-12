# Disaster Recovery & Backup Runbook

**Date:** July 12, 2026 · **Author:** W6 · **Status:** Draft runbook — NOT
exercised. No restore drill has been run.
**Purpose:** How Full Loop CRM backs up data and recovers from data loss or a
provider outage. This is the **DR runbook that the P12 backup-restore drill ties
to** (JEFF-MORNING-QUEUE: "P12 (GATE): Backup restore drill — needs prod backup
access; ties to DR runbook"). The drill itself is Jeff-gated; this document is
its prerequisite.

> **Honesty flags:**
> - **No restore has ever been tested against this.** A backup you have not
>   restored is a *hope*, not a backup. The single most important open item
>   (§7) is running the drill.
> - I do **not** have prod access from this worktree. Backup cadence, retention,
>   and PITR window below are **⟪what to confirm in the Supabase/Vercel
>   dashboards⟫**, not verified facts. Every ⟪PLACEHOLDER⟫ is a real unknown.
> - RTO/RPO targets here are **proposals** for Jeff to set, not commitments the
>   platform currently meets.

---

## 1. What we're protecting (assets & where they live)

| Asset | Lives in | Loss impact |
|-------|----------|-------------|
| **Application database** (all tenant/client/job/finance records) | Supabase (Postgres, AWS US) | Catastrophic — the business. |
| **Stored files / documents** | Supabase Storage buckets | High — invoices, documents. |
| **Per-tenant secrets** (encrypted) | DB rows, envelope-encrypted via `SECRET_ENCRYPTION_KEY` | High — and see §5 key caveat. |
| **Application code / config** | Git (GitHub) + Vercel deploys | Recoverable from git. |
| **Environment secrets** | Vercel env + `~/.claude/access.json` pointers + `.env.local` | High — losing signing keys breaks all sessions. |
| **Payment data** | **Stripe** (system of record for transactions) | Recoverable from Stripe; we hold only metadata. |
| **Provider-held comms logs** | Telnyx/Twilio, Resend | Partially recoverable from providers. |

The **database + storage + signing secrets** are the irreplaceable core. Code is
git-recoverable; payment truth lives at Stripe.

---

## 2. Backup posture (confirm each in dashboard)

| Backup | Mechanism | Cadence ⟪confirm⟫ | Retention ⟪confirm⟫ |
|--------|-----------|-------------------|---------------------|
| **DB automated backups** | Supabase managed backups | ⟪daily?⟫ | ⟪7/14/30 days?⟫ |
| **Point-in-time recovery (PITR)** | Supabase PITR (plan-dependent) | continuous WAL | ⟪enabled? window?⟫ |
| **DB logical dump** | `pg_dump` (manual/scheduled) | **⟪none today?⟫** | — |
| **Storage buckets** | ⟪Supabase storage backup / none?⟫ | ⟪?⟫ | ⟪?⟫ |
| **Code** | GitHub | per commit | full history |
| **Secrets** | Vercel env (no version history) + local `.env.local` | manual | **no automatic backup — single copy risk** |

> **Likely gaps to confirm:** (a) whether PITR is enabled (it's plan-gated on
> Supabase); (b) whether **storage buckets** are backed up at all (often NOT
> covered by DB backups); (c) an **off-provider** copy — all backups today
> presumably live inside Supabase, so a Supabase-account-level failure/lockout
> has no external escape hatch. A periodic `pg_dump` to independent storage
> closes (c).

---

## 3. Recovery targets (Jeff to set)

| Metric | Meaning | Proposed | Rationale |
|--------|---------|----------|-----------|
| **RPO** (max data loss) | How much recent data we can afford to lose | ≤ ⟪1h with PITR / 24h without⟫ | Bookings/payments are time-sensitive. |
| **RTO** (max downtime) | How fast we must be back | ≤ ⟪4h⟫ | Multi-tenant — outage hits every tenant's business. |

Without PITR, RPO is bounded by the last daily backup (up to ~24h loss). Decide
whether that's acceptable; if not, enable PITR.

---

## 4. Recovery procedures

### 4.1 Accidental data deletion / bad migration (most likely)
1. **Stop the bleeding** — pause the offending process; do not run more writes.
2. If a migration caused it, use the **per-migration rollback SQL**
   (`deploy-prep/rollback-note-per-migration.md`, W1) to reverse.
3. If data is gone, restore via **PITR** to a timestamp just before the event
   (if enabled) or the latest daily backup.
4. **Jeff-gated:** any restore that overwrites prod is a destructive prod action
   — Jeff authorizes and runs it. Prefer restoring to a **new** instance and
   diffing before cutover.

### 4.2 Full database loss
1. Provision a fresh Supabase project (or restore backup into one).
2. Restore latest backup / PITR.
3. Re-apply any migrations after the backup point.
4. Repoint `DATABASE_URL` / service-role env in Vercel; redeploy.
5. Verify tenant resolution + a per-tenant smoke (booking/login) before
   announcing recovery.

### 4.3 Storage bucket loss
Restore from storage backup if one exists (§2 gap). If none, documents/invoices
may be **unrecoverable** — this is the biggest silent gap; confirm coverage.

### 4.4 Provider outage (Supabase / Vercel down, not data loss)
- No failover today (single-region, single-provider). Recovery = wait for
  provider + status-page comms to tenants. Document tenant-comms template.
- Stripe/Telnyx/Resend outages degrade payments/comms but don't lose our data.

### 4.5 Signing-secret loss or compromise
- Losing `PORTAL_SECRET`/`TEAM_PORTAL_SECRET`/`ADMIN_TOKEN_SECRET` → mint new,
  redeploy; **all existing sessions invalidate** (users re-auth). Recoverable.
- See §5 for the encryption-key special case.

---

## 5. The `SECRET_ENCRYPTION_KEY` special case (critical)

Per `deploy-prep/secrets-at-rest-audit.md`:
- Stored tenant secrets are envelope-encrypted with `SECRET_ENCRYPTION_KEY`.
- **There is no key-id in the envelope and no re-encrypt script.** If this key is
  **lost**, every encrypted tenant secret is **unrecoverable** — a DB backup does
  NOT save you, because the ciphertext is undecryptable without the key.
- Therefore this key needs its **own** durable, redundant backup **separate from
  the database**, and its loss is a distinct disaster class from DB loss.
- Also: if the key is ever absent at runtime, secrets fall back to **silent
  plaintext** — a restore into a mis-configured env could quietly downgrade
  security. Verify the key is present post-restore.

**Action:** confirm `SECRET_ENCRYPTION_KEY` (and all signing secrets) are backed
up in a secure, redundant store (password manager / secret vault), not only in
Vercel env.

---

## 6. Communication during a DR event

- Multi-tenant: an outage affects **every tenant's** business. Have a tenant
  status/notice path ready (platform message + external `notifyTenantOwner`).
- Track who was notified and when (ties to the breach runbook if the DR event
  also involves data exposure).

---

## 7. Open items — makes this real (do not treat as done)

- [ ] **Run the P12 restore drill** (Jeff-gated): restore latest backup into a
      scratch instance, verify integrity, record actual RTO/RPO achieved. This
      is the whole point — an untested backup is unproven.
- [ ] Confirm §2 facts in dashboards: PITR enabled? window? storage backed up?
      retention days?
- [ ] Add an **off-provider** DB dump (independent storage) if none exists.
- [ ] Confirm **storage bucket** backup coverage (§4.3).
- [ ] Back up **`SECRET_ENCRYPTION_KEY` + signing secrets** in a redundant,
      out-of-band vault (§5).
- [ ] Jeff sets RPO/RTO targets (§3).
- [ ] Document the tenant-comms template for outages (§6).

---

*Sources: `src/lib/legal/sub-processors.ts`,
`deploy-prep/secrets-at-rest-audit.md`,
`deploy-prep/rollback-note-per-migration.md` (W1, other branch),
`docs/compliance/access-control.md`,
`docs/compliance/breach-notification-runbook.md`,
`JEFF-MORNING-QUEUE.md` P12. Backup cadence/PITR/retention are UNVERIFIED —
confirm in Supabase/Vercel dashboards.*
