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

export function resolveTenantSmsCredentials(
  tenant: TenantSmsFields | null | undefined,
): TenantSmsCredentials {
  return {
    apiKey: tenant?.telnyx_api_key || null,
    phone: tenant?.telnyx_phone || tenant?.sms_number || null,
  }
}

export function hasTenantSms(tenant: TenantSmsFields | null | undefined): boolean {
  const { apiKey, phone } = resolveTenantSmsCredentials(tenant)
  return !!(apiKey && phone)
}
