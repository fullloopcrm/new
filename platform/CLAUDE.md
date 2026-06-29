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

### Known debt (migrate to global, do NOT extend)

These predate the rule and VIOLATE it — they are full per-tenant operator clones:
- `src/app/site/wash-and-fold-nyc/(app)/admin/*` + `/dashboard/*` — ~22 cloned pages
- `src/app/site/wash-and-fold-hoboken/(app)/admin/*` + `/dashboard/*` — ~22 cloned pages
- `src/app/site/the-florida-maid/clients/dashboard` — 1 client dashboard

Cutover required: repoint these tenants' operators to the global `/dashboard` + `/admin` (they currently use their own `(app)/login`), verify, THEN delete the clones. Do not delete before the auth/routing cutover — it would dark a live tenant's admin.

Until migrated, **do not add features to these clones.** Build in global only.

## Platform Messaging (admin ↔ tenant owner)

Two-way in-app messaging, threaded per tenant in `tenant_owner_messages`. **Global** like everything else.

- **Admin:** `/admin/tenant-chats` (+ `/api/admin/tenant-chats`). **Owner:** `/dashboard/messages` (+ `/api/dashboard/messages`, tenant-scoped via `getTenantForRequest`).
- **Level 1 is IN-PLATFORM ONLY** — sending stores a row with `channel:'platform'`; it does **not** send SMS/email. External owner reach is a separate path (`notifyTenantOwner` / Jefe `notify_tenant_owner`).
- **Bot-ready (Level 2):** every row has `sender_role` (`admin|owner|jefe|tenant_agent`) + `meta` jsonb. Jefe tools: `read_tenant_thread`, `send_tenant_message` (confirm-gated). A bot reply is just an insert with `sender_role:'jefe'`.
- Live refresh = 15s polling; true push-realtime is pending RLS on `tenant_owner_messages`.
