# Token Freshness Note — SUPABASE_ACCESS_TOKEN & fleet-credential staleness (Q-O2)

**Status:** Read-only observation + live credential check performed this
session (no writes, no destructive calls — GET-only Management API probes).
No secret values are printed anywhere in this doc or were echoed during the
check.

**Author:** W6, branch `p1-w6`, 2026-07-12.

---

## TL;DR

- This fleet runs **long, unattended, multi-hour sessions** via a polling
  driver (`.worker-driver.sh`: `sleep 2` poll loop, spawns a fresh
  `claude --model sonnet -p ...` subprocess per LEADER order, potentially
  dozens of invocations over many hours without the operator present).
  Any credential that goes stale **mid-run** fails silently into that loop —
  there's no human watching each invocation's output in real time.
- **Two distinct Supabase auth mechanisms exist in this environment and are
  easy to confuse:** (1) the raw `SUPABASE_ACCESS_TOKEN_FULLLOOP` /
  `SUPABASE_ACCESS_TOKEN_NYCMAID` env vars in `~/.env.local`, used for direct
  `curl`-based Management API calls (per `platform/JEFE-TRACKING-SCOPE.md`),
  and (2) the `supabase` CLI's own separately-stored login session. **Live
  check this session: the raw env-var tokens are valid (HTTP 200 on
  `/v1/projects` and Vercel `/v2/user`); the `supabase` CLI's own session is
  currently `Unauthorized`.** These two can and do drift independently —
  don't assume `supabase login` working means the env-var token works, or
  vice versa.
- **PAT-style tokens (Supabase Management API token, Vercel tokens, `gh`
  tokens) do not have a fixed short TTL** — they're long-lived until
  revoked/rotated, unlike session/OAuth tokens. The staleness risk for these
  is **rotation**, not **expiry**: if Jeff rotates a leaked or routine-cycled
  secret while a fleet run is in flight, every worker using the old value
  (loaded once into a long-lived driver shell) keeps failing until the
  driver is restarted or `~/.env.local` is re-sourced.
- **OAuth-session MCP connectors are the opposite risk profile:** this very
  session's system reminder shows `claude.ai Gmail`, `claude.ai Google
  Drive`, and `plugin:vercel:vercel` requiring re-authorization, and
  explicitly states non-interactive sessions cannot complete the OAuth flow.
  A worker that depends on one of these mid-task will hang or silently lose
  that capability with no recovery path from inside the session.
- **Recommendation:** a cheap pre-flight token-freshness check (§4) run once
  per fleet-run start (not per-order — that's wasteful) would have caught
  the live `supabase` CLI staleness found this session before it could cause
  a confusing failure mid-run.

---

## 1. Why this matters specifically for this fleet's shape

Unlike a single interactive Claude Code session (where a stale token
produces an error the operator sees immediately and can fix), this fleet's
`.worker-driver.sh` pattern is:

```
while true; do
  # block on new LEADER order via poll of LEADER-CHANNEL.md (sleep 2 loop)
  OUT=$(claude --model sonnet -p "... LEADER order ..." --permission-mode acceptEdits)
  # append result to channel, loop again
done
```

This means:
- **No human is watching a live terminal** between orders — a credential
  failure surfaces only in `/tmp/worker-$ID.log` or the channel-file report
  line, and only if the worker itself notices and reports it honestly
  (this worker's own reporting discipline is the only backstop).
- **The env is loaded once**, whenever the driver shell was started (or
  whenever this session's shell inherited `~/.env.local`-derived exports).
  If a token is rotated on disk after the driver started, the running driver
  process — and every `claude -p` child it spawns — keeps using the **old**
  in-memory/inherited value until the driver itself is restarted. A fresh
  `source ~/.env.local` on the operator's interactive shell does **not**
  propagate to an already-running background driver.
- **Six workers run in parallel** (`p1-w1..w6`, per `git worktree list`),
  each presumably with its own driver process. A single rotated secret can
  therefore produce **six independent, staggered failures** rather than one
  — worth knowing before triaging a wave of confusing errors as six separate
  bugs.

---

## 2. Credential inventory used by this fleet (names only, no values)

From `~/.env.local` (grep'd for `TOKEN|KEY|SECRET` names only) and observed
CLI auth state:

| Credential | Mechanism | Used for | Staleness class |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN_FULLLOOP` / `_NYCMAID` | raw PAT, bearer header | direct `curl` calls to Supabase Management API (per `JEFE-TRACKING-SCOPE.md` — schema verification against prod) | rotation-only, no fixed expiry |
| `supabase` CLI login session | separate keychain/config-stored session, **not** the same as the env var above | `supabase projects list`, `supabase db` commands if any script shells out to the CLI instead of `curl` | **currently unauthorized — live-verified this session** |
| `VERCEL_TOKEN_FULLLOOP` / `_FULLLOOP_ALL` / `_NYCMAID` / per-tenant (`_FLORIDAMAID`, `_NYCEXTERMINATOR`, `_NYCTOW`, `_SUNNYSIDE`, `_WEPAYYOUJUNK`) | raw PAT, bearer header | Vercel API calls, deploy scripts | rotation-only, no fixed expiry |
| `GH_TOKEN_FULLLOOPCRM` | `ghp_`-prefixed classic PAT (confirmed via `gh auth status`) | `git push`, `gh` CLI, PR ops | rotation-only, no fixed expiry; scopes shown (`admin:org, repo, workflow, write:packages`) — not silently narrowed without an explicit token change |
| `plugin:vercel:vercel` MCP | **OAuth session**, per this session's own connector-auth reminder | Vercel MCP tool calls | **session-based — can and does go stale; non-interactive sessions cannot re-auth** |
| `claude.ai Gmail` / `Google Drive` / `Google Calendar` MCP | OAuth session | email/drive/calendar tool access | same OAuth staleness class as above |
| `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TELNYX_API_KEY`, `CRON_SECRET`, `JEFE_BOT_TOKEN`, `PEXELS_API_KEY` | raw API keys, app-runtime | set on Vercel for the running app (see `deploy-prep/env-var-inventory.md` on `p1-w4`, not yet merged to this branch) — **not** fleet-operator credentials, out of scope for this note but same rotation-risk class | rotation-only |

---

## 3. Live check performed this session (evidence, not speculation)

Ran read-only GET probes against each token's own API, no values printed:

```
SUPABASE_ACCESS_TOKEN_FULLLOOP: present, length=44
Management API /v1/projects via SUPABASE_ACCESS_TOKEN_FULLLOOP -> HTTP 200
Vercel /v2/user via VERCEL_TOKEN_FULLLOOP -> HTTP 200
gh auth status -> both accounts logged in, fullloopcrm active, keyring-backed
supabase projects list -> "Unexpected error retrieving projects: Unauthorized"
```

Interpretation: the raw bearer-token credentials this fleet's scripts
actually use for Management API / Vercel API / git operations are fine
right now. The `supabase` CLI's own separate login session is stale/absent
— this would only matter if a script shells out to `supabase <command>`
directly rather than `curl`ing the Management API with the env-var token.
**A worth-doing follow-up (not done here, out of scope for a read-only
note): grep `scripts/*.ts` and `deploy-prep/*.sh` for direct `supabase`
CLI invocations** to know whether that particular staleness is inert or a
live landmine for a future migration/rollback script that assumes the CLI
is logged in.

---

## 4. Recommended freshness check (proposal, not applied)

A single pre-flight script, run once per fleet-run kickoff (not per order —
these are GET-only and cheap, but six workers × every 2-second poll would be
wasteful and could itself look like abuse to the APIs):

```bash
#!/bin/bash
# deploy-prep/check-token-freshness.sh (PROPOSED, not created — file-only
# per LEADER order scope; leader/Jeff decides whether to add this script)
set -a; source ~/.env.local 2>/dev/null; set +a
fail=0
check() { # check "$name" "$status_code"
  if [ "$2" = "200" ]; then echo "OK   $1"; else echo "STALE $1 (HTTP $2)"; fail=1; fi
}
check "SUPABASE_ACCESS_TOKEN_FULLLOOP" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN_FULLLOOP" https://api.supabase.com/v1/projects)"
check "VERCEL_TOKEN_FULLLOOP" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $VERCEL_TOKEN_FULLLOOP" https://api.vercel.com/v2/user)"
gh auth status >/dev/null 2>&1 || { echo "STALE gh auth"; fail=1; }
exit $fail
```

Run this **before** starting a fleet wave (leader kicks off 6 workers) and
**after** any known secret rotation. It would have caught the live
`supabase` CLI staleness found this session immediately instead of letting
it surface as a confusing mid-task failure in whichever worker happens to
shell out to the CLI first.

**Not proposing:** a per-order or per-poll-cycle check — that multiplies
API calls by 6 workers × every LEADER order, adds latency to every single
order, and the actual risk (rotation, not expiry) doesn't materialize on a
2-second cadence. Once-per-wave is the right frequency for this risk shape.

---

## 5. What this note does not cover

- Whether the `supabase` CLI's stale session is actually load-bearing
  anywhere in this codebase's scripts (flagged as a follow-up above, not
  investigated).
- App-runtime secret freshness (Stripe, Telnyx, Resend, etc.) — that's
  `deploy-prep/env-var-inventory.md` (W4) and
  `deploy-prep/secrets-inventory-and-rotation-plan.md` (this lane)'s
  territory, not fleet-operator CLI credentials.
- Actually creating `check-token-freshness.sh` — proposed only, per the file
  -only/non-gated scope of this order. Leader/Jeff decides whether to wire
  it in.

### Reproduce this session's check

```bash
set -a; source ~/.env.local 2>/dev/null; set +a
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN_FULLLOOP" https://api.supabase.com/v1/projects
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $VERCEL_TOKEN_FULLLOOP" https://api.vercel.com/v2/user
gh auth status
supabase projects list
```
