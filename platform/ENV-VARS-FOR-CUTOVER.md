# Vercel env vars required before nycmaid cutover

Produced by grepping `src/**/*.ts(x)` on both repos and diffing. Every var below
is referenced at least once in fullloop code and is REQUIRED for nycmaid to
operate as a fullloop tenant. Set each on the fullloop Vercel project under
Settings → Environment Variables (Production + Preview).

## Required (will break at runtime if missing)

| Var | Source | What breaks without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard | All DB queries |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard | Client SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard | All API routes (supabaseAdmin) |
| `CLERK_SECRET_KEY` | Clerk dashboard | Admin auth |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard | Admin login UI |
| `CLERK_WEBHOOK_SECRET` | Clerk → webhooks | Clerk user/org sync webhook |
| `ANTHROPIC_API_KEY` | Anthropic console | Selena + ai-chat + generate-reply |
| `STRIPE_SECRET_KEY` | Stripe dashboard | Stripe Connect + payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe → webhooks | Payment webhook sig verify |
| `TELNYX_API_KEY` | Telnyx portal | SMS (platform-level fallback) |
| `TELNYX_PUBLIC_KEY` | Telnyx portal | Inbound SMS webhook sig (Ed25519) |
| `RESEND_API_KEY` | Resend dashboard | Outbound email (platform fallback) |
| `RESEND_WEBHOOK_SECRET` | Resend → webhooks | Email event webhook sig |
| `CRON_SECRET` | Self-generated | All `/api/cron/*` auth |
| `INTERNAL_API_KEY` | Self-generated | Internal finalize-match endpoint |
| `ELCHAPO_MONITOR_KEY` | Self-generated | Monitoring endpoints |
| `ADMIN_TOKEN_SECRET` | Self-generated | PIN-based admin impersonation cookie |
| `PORTAL_SECRET` | Self-generated | Client portal token signing |
| `TEAM_PORTAL_SECRET` | Self-generated | Team portal token signing |
| `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `web-push generate-vapid-keys` | Push notifications |

## Per-tenant (stored in DB, fall back to env)

These exist as columns on the `tenants` table OR in `tenant_settings`. For
nycmaid specifically, set them on the nycmaid tenant row, NOT env:

| Var | Tenant column | Notes |
|---|---|---|
| `TELNYX_API_KEY` | `tenants.telnyx_api_key` | Per-tenant override |
| `TELNYX_PHONE` | `tenants.telnyx_phone` | Per-tenant from number (formerly TELNYX_FROM_NUMBER) |
| `RESEND_API_KEY` | `tenants.resend_api_key` | Per-tenant sender account |
| `EMAIL_FROM` | `tenants.email_from` | Per-tenant from address |
| `STRIPE_SECRET_KEY` | `tenants.stripe_api_key` | Per-tenant Stripe account |
| IMAP | `tenants.imap_host/user/pass` | nycmaid's hi@thenycmaid.com creds |
| Zelle email | `tenants.zelle_email` | Used in SMS recap copy |

## Optional / context-dependent

| Var | Used by | Skip if... |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Absolute URL generation | If all tenants have `domain` set |
| `SUPER_ADMIN_CLERK_ID` | Cross-tenant admin impersonation | Only 1-2 owners need this |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google review sync / OAuth | Not using Google reviews |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Social auth | Not using FB login |
| `ADMIN_EMAIL` | Global fallback admin contact | Only if no admin members exist |
| `ADMIN_FORWARD_PHONE` | Global fallback admin SMS | Only if no admin members exist |
| `ADMIN_NOTIFICATION_EMAIL` | Platform-wide notification copy | Only for platform-owner alerts |
| `ADMIN_PIN` | PIN auth bootstrap | First-run only |
| `IMPERSONATION_ALLOW_UNSIGNED` | Cutover grace period | Remove after 24h post-cutover |
| `TELNYX_WEBHOOK_VERIFY` / `CLERK_WEBHOOK_VERIFY` / `RESEND_WEBHOOK_VERIFY` | Set to "off" for local dev only | NEVER off in prod |

## nycmaid-specific vars no longer used in fullloop

These existed in nycmaid env but have no fullloop equivalent (replaced by
per-tenant DB fields). Do NOT copy them to fullloop:

- `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_SITE_URL` — replaced by `tenant.domain` + `tenantSiteUrl()`
- `NEXT_PUBLIC_RADAR_API_KEY` / `RADAR_API_KEY` — fullloop geocodes via Nominatim (free)
- `ADMIN_PASSWORD` — replaced by Clerk + PIN auth
- `OWNER_BCC_EMAIL` — not yet ported; set per-tenant column if needed
- `TELNYX_FROM_NUMBER` — renamed to `TELNYX_PHONE` + per-tenant `tenants.telnyx_phone`

## Verification checklist

Before flipping the live DNS:

1. Vercel env has every "Required" var set for Production.
2. Nycmaid tenant row has: `telnyx_api_key`, `telnyx_phone`, `resend_api_key`,
   `email_from`, `stripe_api_key`, `imap_host`, `imap_user`, `imap_pass`,
   `zelle_email`, `domain="thenycmaid.com"`, `phone`, `email`, `name`, `primary_color`.
3. At least one `tenant_members` row with `role='owner'` exists for nycmaid.
4. `ADMIN_PIN` bootstrap complete (or Clerk owner seeded).
5. Webhook verify flags (`TELNYX_WEBHOOK_VERIFY` / `CLERK_WEBHOOK_VERIFY` /
   `RESEND_WEBHOOK_VERIFY`) are NOT set to "off" in Production.
