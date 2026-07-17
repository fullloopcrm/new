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
 * Platform fallback: when a tenant hasn't configured its own Telnyx
 * sub-account, this falls back to the platform's shared TELNYX_API_KEY/
 * TELNYX_PHONE — the SAME tenant-first-then-platform precedence already
 * established for every sibling credential resolver (email.ts's
 * defaultResend, stripe.ts's getStripe(), comhub-voice-config.ts's
 * resolveTenantVoiceConfig(), and bookings/batch/route.ts's own inline
 * `tRow?.telnyx_api_key || process.env.TELNYX_API_KEY`). Before this, the
 * shared resolver used by notify.ts/notify-team.ts/admin-contacts.ts/
 * payment-processor.ts/comms-prefs.ts silently treated SMS as unavailable
 * for every tenant without its own Telnyx account, even though the platform
 * account could already send for them (as bookings/batch already proved).
 * Pass `{ platformFallback: false }` for a caller that must use the
 * tenant's OWN number or not send at all (lib/jefe/actions.ts's
 * notifyTenantOwner(), which documents exactly that contract).
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
  const { platformFallback = true } = opts
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
