# FullLoop CRM — Architecture Rules

## THE GLOBAL RULE (non-negotiable)

**Every operator/admin feature is GLOBAL: one shared codebase, edited once, applies to all tenants. Tenants differ by DATA, never by code.**

### Where things live

| Surface | Path | Global? |
|---|---|---|
| Operator dashboard | `src/app/dashboard/*` | ✅ Global — one copy, all tenants |
| Platform admin | `src/app/admin/*` | ✅ Global |
| API (tenant-scoped) | `src/app/api/*` | ✅ Global; tenant resolved via `getTenantForRequest()` / `getTenantFromHeaders()` |
| Settings | `src/app/dashboard/settings` + per-tenant rows/`getSettings(tenantId)` | ✅ Global page, per-tenant **data** |
| Public marketing site | `src/app/site/template/*` (config-driven) | ✅ Shared template |
| Customer/cleaner portals | `src/app/site/<tenant>/...` (book/team dashboards) | Per-site, customer-facing only |

### Hard rules

1. **Never create a per-tenant operator/admin dashboard** under `src/app/site/<tenant>/`. Operator UI lives ONLY in `src/app/dashboard/*` and `src/app/admin/*`.
2. **One edit applies to all tenants.** If a change has to be repeated per tenant, the architecture is wrong — fix the shared component/config instead.
3. **Tenant differences come from config/data**, resolved server-side (`getTenantForRequest`, tenant row, `getSettings`). Not from forked files.
4. **The `/site/<tenant>` tree is for public marketing + customer/cleaner portals only** — never operator tooling.

### Known debt (RESOLVED 2026-07-28 — kept here as the record, not a to-do)

This section used to list `wash-and-fold-nyc` and `the-florida-maid` as full per-tenant operator clones needing a cutover. Re-verified from source + git history during the 2026-07-28 hardening pass; both were stale/inaccurate:

- **`src/app/site/wash-and-fold-nyc/(app)/admin/*` + `/dashboard/*`** (the "~22 cloned pages") was already deleted on 2026-06-29 (commit `a1cea0ba5`, "remove per-tenant operator dashboard clones") — this entry was never removed from this doc afterward. Nothing left to migrate.
- **`src/app/site/the-florida-maid/clients/dashboard`** was never actually an operator clone — it's a customer-facing "My Bookings" portal (same shape as `wash-and-fold-nyc/(app)/book/dashboard`), which is exactly the allowed "Customer/cleaner portals" row in the table above. Mischaracterized as debt from the start.

What WAS real and got fixed this pass: both tenants' own `(app)/login` / `/login` pages rendered `SiteAdminLoginClient`, which authenticates via `/api/auth/login` (sets the `admin_session` cookie) — but a tenant custom domain's `/admin`→`/dashboard` rewrite gates on the `admin_token` cookie (`/api/admin-auth`), a completely different credential system. A correct password/PIN entry silently failed to reach the dashboard and bounced to `/fullloop` with no error shown. Both pages now redirect straight to `/fullloop` (the real, working, global tenant login) instead of maintaining a second, broken login form. `wash-and-fold-nyc/_lib/auth.ts` + `_lib/roles.ts` (the admin clone's own now-orphaned RBAC helpers, zero real callers left after the June 29 deletion) were deleted alongside.

`nyc-mobile-salon/login` has the identical `SiteAdminLoginClient`-is-broken bug and was NOT touched — out of scope for this pass, flagged for whoever owns that tenant next.

`wash-and-fold-hoboken` was removed entirely (2026-07-25) — it had no `tenants` row and its marketing content was still unswapped nycmaid boilerplate (hardcoded `thenycmaid.com` referral links, nycmaid blog routes). Not a real tenant; deleted rather than migrated.

Until migrated, **do not add features to these clones.** Build in global only.

## Platform Messaging (admin ↔ tenant owner)

Two-way in-app messaging, threaded per tenant in `tenant_owner_messages`. **Global** like everything else.

- **Admin:** `/admin/tenant-chats` (+ `/api/admin/tenant-chats`), unchanged. **Owner:** folded into Loop Connect (`/dashboard/connect`) as the pinned "Full Loop Support" conversation (+ `/api/dashboard/messages`, tenant-scoped via `getTenantForRequest`). `/dashboard/messages` is now just a redirect to `/dashboard/connect` — Messages as a separate nav item was retired 2026-07-25; its team-to-team DM feature (`team_direct_messages`) was retired too in favor of Connect's translated 1:1 `type='team'` channels, which already covered the same operator↔worker relationship.
- **Level 1 is IN-PLATFORM ONLY** — sending stores a row with `channel:'platform'`; it does **not** send SMS/email. External owner reach is a separate path (`notifyTenantOwner` / Jefe `notify_tenant_owner`).
- **Bot-ready (Level 2):** every row has `sender_role` (`admin|owner|jefe|tenant_agent`) + `meta` jsonb. Jefe tools: `read_tenant_thread`, `send_tenant_message` (confirm-gated). A bot reply is just an insert with `sender_role:'jefe'`.
- Live refresh = 15s polling; true push-realtime is pending RLS on `tenant_owner_messages`.
- Every Loop Connect message (Support thread + all `connect_channels` types) is now auto-translated EN/ES at send time (`translateToEnEs`, fail-open) and stored as `body_en`/`body_es` alongside the raw `body`.
- Mass/group messaging: an admin-created `type='custom'` channel can carry explicit `team_member_id` recipients via `connect_channel_members`. Those members see it in their team-portal channel switcher (`/api/team-portal/connect/channels`) alongside their own private `team` thread.
