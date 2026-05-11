# Pre-cutover audit — env vars + hardcoded refs (2026-05-11)

## Env var coverage

Source code references **74 unique env vars**. `.env.example` documents **14**. **60 vars missing from .env.example.**

Before setting fullloop's Vercel env vars, transcribe ALL of these from nycmaid's Vercel project. Group by usage:

### Critical (cutover blockers — Yinez/payments/SMS won't work without these)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `ANTHROPIC_API_KEY`
- `TELNYX_API_KEY`
- `TELNYX_PUBLIC_KEY`
- `TELNYX_FROM_NUMBER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `FROM_EMAIL`
- `OWNER_PHONES`, `OWNER_EMAIL`, `OWNER_BCC_EMAIL`
- `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PHONE`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`

### High (feature-specific, defaults exist but should be explicit)

- `ADMIN_RING_LIST`, `ADMIN_FORWARD_PHONE`, `ADMIN_LEG_TIMEOUT_SECS`
- `TELNYX_VOICE_CONNECTION_ID`
- `VOICEMAIL_NOTIFY_PHONE`, `VOICEMAIL_PROMPT`, `VOICEMAIL_MAX_LENGTH_SECS`
- `MISSED_CALL_SMS_BODY`, `MISSED_CALL_SMS_COOLDOWN_MIN`
- `PORTAL_SECRET`, `TEAM_PORTAL_SECRET`, `TENANT_HEADER_SIG_SECRET`
- `ADMIN_AUTH_SECRET`
- `RESEND_API_KEY`, `RESEND_WEBHOOK_VERIFY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `TELEGRAM_EXTRA_CHAT_IDS`, `TELEGRAM_NOTIFY_CHAT_ID`
- `CLERK_WEBHOOK_SECRET`, `CLERK_WEBHOOK_VERIFY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `SUPER_ADMIN_CLERK_ID`
- `ELCHAPO_MONITOR_KEY`
- `INTERNAL_API_KEY`
- `SECRET_ENCRYPTION_KEY`

### Medium (third-party integrations — only if you use them on fullloop)

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
- `RADAR_API_KEY`, `NEXT_PUBLIC_RADAR_API_KEY`

### Low (analytics — optional)

- `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Build/dev only (don't set in prod)

- `NODE_ENV`
- `IMPERSONATION_ALLOW_UNSIGNED` (dev shortcut — must be OFF in prod)
- `SELENA_TEST_TOKEN` (test harness)
- `TELNYX_WEBHOOK_VERIFY` (set to anything other than "off")

**Method:** open nycmaid's Vercel env vars in one tab, fullloop's in another, transcribe with grep this list against both lists.

## Hardcoded `thenycmaid.com` references — only 2 outside the nycmaid/ namespace

After grep filtering for legitimate cases (nycmaid compat layer, marketing copy about nycmaid as case study), only 2 are potential concerns:

1. **`src/components/marketing/ReferralSignupForm.tsx:54,76`** — fullloop's marketing site referral form copies a `thenycmaid.com/book?ref=X` URL. Probably intentional (referral demo using nycmaid as example), but worth confirming the marketing intent.

2. **`src/app/api/webhooks/telnyx-voice/route.ts:338`** — voicemail admin thread URL hardcoded to nycmaid. Already documented as nycmaid-by-design (telnyx-voice webhook bound to single Telnyx connection).

Everything else in src/lib/nycmaid/ and src/components/home/ is correctly scoped to nycmaid as a compat layer or case study.

## What this audit means for cutover

- The 60 missing env vars in `.env.example` doesn't break anything in code — vars are read from `process.env` at runtime. But it means there's no canonical list, and you'll be transcribing 60+ vars by hand to Vercel.
- Risk: missing ONE critical env var (e.g. `STRIPE_WEBHOOK_SECRET`) silently breaks the cutover.
- Mitigation: after setting all vars on fullloop's Vercel, deploy a preview and curl every webhook to confirm 200, not 500.

## Recommendation before push

Update `.env.example` to include all 74 vars (grouped by category). Future deployers will use it as a checklist.

For tonight's session: skip the `.env.example` rewrite, but read this file before transcribing to Vercel.
