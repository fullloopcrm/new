-- TELNYX-401: Telnyx issues Ed25519 signing keys per ACCOUNT, but
-- TELNYX_PUBLIC_KEY is one global env var. A tenant provisioned on a
-- different Telnyx account than the platform default (e.g. nycmaid) has
-- valid inbound webhooks signed with a key that doesn't match the global
-- env, so verifyTelnyx() rejects them with 401.
--
-- This adds a per-tenant override. It's a PUBLIC key (not a secret), so no
-- encryption at rest is needed — unlike telnyx_api_key. NULL means "use the
-- global TELNYX_PUBLIC_KEY", preserving current behavior for every tenant
-- that hasn't been given its own key.
--
-- NOT RUN by this worker. Leader/Jeff runs this against prod, then sets
-- nycmaid's real Telnyx public key value (from the nycmaid Telnyx account's
-- portal) in the new column.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS telnyx_public_key text;

COMMENT ON COLUMN public.tenants.telnyx_public_key IS
  'Per-tenant Telnyx Ed25519 public key (raw base64, no PEM header). Telnyx signing keys are per-account, not global. NULL falls back to the platform-wide TELNYX_PUBLIC_KEY env var. See lib/webhook-verify.ts resolveTelnyxPublicKey().';
