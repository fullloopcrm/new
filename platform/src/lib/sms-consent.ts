import { isNycMaid } from '@/lib/nycmaid/tenant'

// Florida Maid tenant id — matches the tenants.id row for slug 'the-florida-maid'.
export const FLORIDA_MAID_TENANT_ID = '56490a6b-820c-49e6-8c14-cb4e54ffcb06'

export function isFloridaMaid(tenantId: string | null | undefined): boolean {
  return tenantId === FLORIDA_MAID_TENANT_ID
}

// Matches the checkbox copy on nycmaid's /book/new and the Telnyx 10DLC
// campaign's registered messageFlow word-for-word — the campaign record
// itself is what carriers check consent text against. Do not edit without
// updating the filed campaign.
export const NYCMAID_SMS_CONSENT_TEXT = 'By providing your phone number and clicking "Submit," you agree to receive SMS updates and marketing messages from The NYC Maid. Message frequency may vary. Standard Message and Data Rates may apply. Reply STOP to opt out. Reply HELP for help. Consent is not a condition of purchase.'

export const FLORIDA_MAID_SMS_CONSENT_TEXT = 'By providing your phone number, you agree to receive text messages about your appointment from Florida Maid, including confirmations, reminders, and arrival updates. Msg & data rates may apply. Reply STOP to opt out, HELP for help.'

// Pre-existing checkbox copy on the Florida Maid /clients/collect lead form —
// left as-is (not unified with FLORIDA_MAID_SMS_CONSENT_TEXT) since it was
// already live with its own wording and privacy/terms links; centralized
// here so the logged consent_text always matches what that specific form
// displays, same principle as the booking form's text.
export const FLORIDA_MAID_COLLECT_CONSENT_TEXT = 'By checking this box, I consent to receive transactional text messages from The Florida Maid for appointment confirmations, reminders, and customer support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg & data rates may apply.'

/** Flattened plain-text mirror of the shared <SmsConsent> component's
 * rendered copy (src/app/site/template/_components/SmsConsent.tsx) — every
 * other tenant on the shared booking/remote templates renders that
 * component, so this must match it exactly or the logged "proof of
 * consent" won't match what the customer actually saw. Keep in sync if
 * that component's copy ever changes. */
export function genericSmsConsentText(tenantName: string): string {
  return `By checking this box, I agree to receive text messages from ${tenantName} about my inquiry, appointments, reminders, and customer support at the number provided, including messages sent by automated means. Consent is not a condition of purchase. Msg frequency may vary. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Privacy Policy | Terms & Conditions`
}

/** Resolves the exact consent text for a tenant, server-side — never trust a
 * client-supplied string here, or the logged "proof of consent" could say
 * something the customer was never actually shown. */
export function getSmsConsentText(tenant: { id: string; name: string }): string {
  if (isNycMaid(tenant.id)) return NYCMAID_SMS_CONSENT_TEXT
  if (isFloridaMaid(tenant.id)) return FLORIDA_MAID_SMS_CONSENT_TEXT
  return genericSmsConsentText(tenant.name)
}

/** Same idea as getSmsConsentText but for the separate /clients/collect lead
 * form, which has its own pre-existing checkbox copy on Florida Maid. */
export function getCollectConsentText(tenant: { id: string; name: string }): string {
  if (isFloridaMaid(tenant.id)) return FLORIDA_MAID_COLLECT_CONSENT_TEXT
  return genericSmsConsentText(tenant.name)
}

/** Only ever grants consent, never revokes it — an unchecked box on a later
 * submission must not silently wipe out consent given earlier through
 * another channel (site checkbox, SMS text-in, verbal). consentText is
 * resolved server-side per tenant/form so the logged "proof of consent"
 * always matches what that tenant's site actually displayed. */
export function smsOptInFields(optedIn: boolean, ip: string, userAgent: string, consentText: string) {
  if (!optedIn) return {}
  return {
    sms_opt_in: true,
    sms_consent: true,
    sms_consent_at: new Date().toISOString(),
    consent_text: consentText,
    consent_ip: ip,
    consent_user_agent: userAgent.slice(0, 200),
  }
}
