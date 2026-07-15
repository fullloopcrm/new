# F1 CRITICAL: provision-tenant.ts never set funnel_mode — audit + fix

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** code fix + read-only audit
script + tests, this branch (`p1-w3`) only. No DB write executed — the
`SUPABASE_ACCESS_TOKEN_FULLLOOP` secret is absent in this worktree, so the
audit script below was verified to skip cleanly (exit 0) rather than run
against the live DB. No push/deploy/DDL.

## Root cause

`platform/src/lib/provision-tenant.ts`'s `DEFAULT_SELENA_CONFIG` (the object
written to `tenants.selena_config` for every newly-provisioned tenant) never
set `funnel_mode`. `platform/src/lib/settings.ts:216-219` reads
`selena_config.funnel_mode` and falls back to `'booking'` for anything that
isn't exactly `'pipeline'` or `'lead_only'` — so every tenant provisioned
through `provisionTenant()` silently got `funnel_mode: 'booking'`.

That default is correct for "service (booking) verticals" (cleaning, towing,
plumbing, ...) which really do self-book an hourly timeslot. It is **wrong**
for the 23 "project (lead) verticals" — jobs that run days to a year and close
via quote/proposal, never a self-served hourly slot:

```
landscaping, remodeling, roofing, siding, painting, flooring, concrete, deck,
fencing, demolition, drywall, epoxy, foundation, insulation, moving, paving,
windows_doors, stucco, solar, smart_home, accessibility, restoration,
interior_design
```

(This is the exact "project (lead) verticals" block of the `IndustryKey` union
in `industry-presets.ts` — 23 entries, matching the "~23" in the original
report.) Every tenant in one of these industries got the self-serve `booking`
funnel instead of the `pipeline` funnel (`lead → quote/proposal → close →
schedule → pay → review` — see the doc comment on `TenantSettings.funnel_mode`
in `settings.ts`). Concretely this means their client portal
(`/api/portal/config`) and team portal offered self-serve hourly-rate
scheduling UI instead of routing the client into a quote/proposal flow, and
`agent-config-loader.ts`'s `funnelToBooking`/`funnelToPricing` mapped
Selena's booking/pricing behavior for the wrong funnel.

No code anywhere in `industry-presets.ts` mapped `IndustryKey` → funnel mode
before this fix — it's a pure omission, not a misconfigured mapping.

## Which tenants are wrong

**Definitionally:** any tenant whose `tenants.industry` is one of the 23
project/lead `IndustryKey` values above AND whose
`tenants.selena_config->>'funnel_mode'` is not `'pipeline'` or `'lead_only'`.

**I could not enumerate the actual live tenant IDs** — this worktree has no
`SUPABASE_ACCESS_TOKEN_FULLLOOP` and no `~/.env.local` with real credentials
(token-guard verified: `env -u SUPABASE_ACCESS_TOKEN_FULLLOOP … node
scripts/audit-funnel-mode.mjs` printed `SUPABASE_ACCESS_TOKEN_FULLLOOP absent
— skipping (exit 0)`), and prod DB reads are outside this lane's standing
rules regardless. **A new read-only audit script does this identification**:

```
node scripts/audit-funnel-mode.mjs
```

(also wired as `npm run audit:funnel-mode` in `platform/package.json`). It
selects `id, name, industry, selena_config` from `tenants`, applies the exact
23-vertical set + the same fallback logic as `settings.ts`, and prints one
`[CRIT]` line per misconfigured tenant plus a ready-to-review SQL `UPDATE`
template (it never writes). **The leader/Jeff needs to run this with a real
token** to get the actual affected-tenant list and decide on the backfill.

## Code fix (on this branch)

1. `src/lib/industry-presets.ts`: added `PROJECT_VERTICALS` (the 23-vertical
   set, single source of truth) and `defaultFunnelMode(industry)` — returns
   `'pipeline'` for project verticals, `'booking'` otherwise.
2. `src/lib/provision-tenant.ts`: `DEFAULT_SELENA_CONFIG` now sets
   `funnel_mode: defaultFunnelMode(industry)`. Existing caller-supplied
   `opts.overrides.selena_config.funnel_mode` still wins (spread order
   unchanged) — an operator can still override per-tenant.
3. `scripts/audit-funnel-mode.mjs` (new, read-only, token-guarded like
   `reconcile-tenant-config.mjs`) + `src/lib/audit-funnel-mode.test.ts` (8
   tests, pure logic, no DB) + `package.json` script entry.

This closes the bug for every **future** provision. It does **not** backfill
existing wrong tenants — that's a prod DB write and needs Jeff's approval on
the actual affected list (see the audit script output above) before running.

## Verification run in this worktree

- `npx tsc --noEmit` → clean (exit 0)
- `npx vitest run src/lib/audit-funnel-mode.test.ts` → 8/8 passed
- `node scripts/audit-funnel-mode.mjs` with `SUPABASE_ACCESS_TOKEN_FULLLOOP`
  unset → skipped cleanly, exit 0 (confirms the token guard, no DB touched)

## Not done / needs Jeff

- Running `scripts/audit-funnel-mode.mjs` with a real token to get the actual
  affected-tenant list.
- Approving + running the backfill `UPDATE` the script prints once that list
  exists.
