/**
 * Auto-drafted Terms of Service / Privacy Policy for onboarding (10.10,
 * 10.11) -- assembled from data the tenant already entered elsewhere on
 * this same page (business identity, service area, the four policy
 * fields above), not a blank box. Deterministic template, not an AI call
 * -- no failure mode, no vendor key needed, and the output is always
 * traceable to real answers the tenant gave.
 *
 * NOT legal advice. Both callers must show the disclaimer alongside the
 * draft -- see FieldRenderer's 'termsOfService'/'privacyPolicy' cases.
 */

export interface LegalDocInputs {
  businessName?: string
  legalName?: string
  entityType?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  cancellationPolicy?: string
  refundPolicy?: string
  reschedulePolicy?: string
  latePaymentPolicy?: string
}

const name = (d: LegalDocInputs) => d.legalName || d.businessName || 'the Company'
const loc = (d: LegalDocInputs) => [d.city, d.state].filter(Boolean).join(', ')

export function generateTermsOfService(d: LegalDocInputs): string {
  const n = name(d)
  const entity = d.entityType ? ` (${d.entityType})` : ''
  const location = loc(d)
  const lines = [
    `Terms of Service — ${d.businessName || n}`,
    ``,
    `These terms govern your use of services provided by ${n}${entity}${location ? `, based in ${location}` : ''}.`,
    ``,
    `Booking & Payment`,
    `By booking a service, you agree to pay the quoted price for the work described. Payment terms and any deposit requirements will be communicated at booking.`,
  ]
  if (d.cancellationPolicy) lines.push(``, `Cancellations`, d.cancellationPolicy)
  if (d.reschedulePolicy) lines.push(``, `Rescheduling`, d.reschedulePolicy)
  if (d.refundPolicy) lines.push(``, `Refunds`, d.refundPolicy)
  if (d.latePaymentPolicy) lines.push(``, `Late Payment`, d.latePaymentPolicy)
  lines.push(
    ``,
    `Liability`,
    `${n} carries out services with reasonable care and skill. ${n} is not liable for pre-existing conditions, damage arising from inaccurate information provided by the customer, or events outside its reasonable control.`,
    ``,
    `Contact`,
    [d.phone, d.email].filter(Boolean).join(' · ') || 'Contact information on file with your account.',
  )
  return lines.join('\n')
}

export function generatePrivacyPolicy(d: LegalDocInputs): string {
  const n = name(d)
  return [
    `Privacy Policy — ${d.businessName || n}`,
    ``,
    `${n} collects the information you provide when booking a service or contacting us: name, phone number, email address, and service address. If you opt in to SMS updates, we use your phone number to send appointment confirmations, reminders, and service-related messages — message and data rates may apply, and you can opt out at any time by replying STOP.`,
    ``,
    `We use this information solely to schedule, deliver, and bill for services, and to communicate with you about your account. We do not sell your personal information to third parties.`,
    ``,
    `We retain your information for as long as needed to provide services and meet our legal and accounting obligations. You may request access to or deletion of your information by contacting us` + ([d.phone, d.email].filter(Boolean).length ? ` at ${[d.phone, d.email].filter(Boolean).join(' or ')}` : '') + `.`,
  ].join('\n')
}
