/**
 * Resolves a tenant's SMS-send credentials with the correct column
 * precedence.
 *
 * tenants.sms_number predates tenants.telnyx_phone — added first, in
 * migrations/admin-onboarding-fields.sql, documented there as "SMS phone
 * number (separate from business phone — this is the Telnyx number)" — and
 * is still independently writable today via the admin settings API
 * (EDITABLE_TENANT_COLUMNS in app/api/admin/settings/route.ts lists
 * `sms_number` and `telnyx_phone` as two separate editable columns, not one
 * synced pair). telnyx_phone is what every dedicated onboarding UI field
 * writes and what sms.ts's sendSMS() send path actually expects, so it's
 * canonical; sms_number is the legacy fallback for a tenant that only ever
 * had the older field populated. lib/jefe/actions.ts already applies this
 * exact precedence (`t.telnyx_phone || t.sms_number`) in two places
 * (provisionChecklist's presence check, notifyTenantOwner's actual send) —
 * this centralizes that same precedence so the many other call sites that
 * read tenant.telnyx_phone directly can adopt it instead of re-deriving it
 * (or missing it).
 *
 * Platform fallback (opt-in, default OFF): `bookings/batch/route.ts` is the
 * one existing caller that falls back to the platform's shared
 * TELNYX_API_KEY/TELNYX_PHONE when a tenant has no Telnyx of its own —
 * mirroring email/Stripe/voice's tenant-first-then-platform pattern. Every
 * OTHER caller (~40 call sites, including every caller of this function)
 * deliberately treats "tenant has no Telnyx config" as "skip SMS for this
 * tenant" instead. This is NOT a settled precedent to widen: whether texting
 * a tenant's customers from the shared platform number is even compliant
 * without that tenant's own 10DLC carrier registration on file is an open,
 * gated question — see JEFF-MORNING-QUEUE.md's "15:17 2026-07-17 ·
 * Compliance question — shared-platform-Telnyx-number fallback" entry,
 * still awaiting Jeff's answer as of this writing. Until that lands,
 * `platformFallback` defaults to false so every caller of this function
 * keeps the current skip-if-unconfigured behavior; pass
 * `{ platformFallback: true }` only once that compliance question is
 * resolved in favor of the shared-fallback direction.
 */
export interface TenantSmsFields {
  telnyx_api_key?: string | null
  telnyx_phone?: string | null
  sms_number?: string | null
}

export interface TenantSmsCredentials {
  apiKey: string | null
  phone: string | null
}

export interface ResolveSmsCredentialsOptions {
  platformFallback?: boolean
}

// Read at call time (not module load) so tests can stub process.env per-case,
// matching the read-at-call-time shape of comhub-voice-config.ts's ENV block.
function platformTelnyxApiKey(): string | null {
  return (process.env.TELNYX_API_KEY || '').trim() || null
}
function platformTelnyxPhone(): string | null {
  return (process.env.TELNYX_PHONE || '').trim() || null
}

export function resolveTenantSmsCredentials(
  tenant: TenantSmsFields | null | undefined,
  opts: ResolveSmsCredentialsOptions = {},
): TenantSmsCredentials {
  const { platformFallback = false } = opts
  return {
    apiKey: tenant?.telnyx_api_key || (platformFallback ? platformTelnyxApiKey() : null),
    phone: tenant?.telnyx_phone || tenant?.sms_number || (platformFallback ? platformTelnyxPhone() : null),
  }
}

export function hasTenantSms(
  tenant: TenantSmsFields | null | undefined,
  opts: ResolveSmsCredentialsOptions = {},
): boolean {
  const { apiKey, phone } = resolveTenantSmsCredentials(tenant, opts)
  return !!(apiKey && phone)
}
