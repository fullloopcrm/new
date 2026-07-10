/**
 * SmsConsent — TCPA express-consent disclosure for customer lead-capture forms.
 *
 * Renders the required opt-in checkbox + STOP/HELP/rates language + policy links
 * so any form that collects a phone number and may result in a text has proper
 * consent on record. Mirrors the pattern already used on the apply/referral
 * forms; extracted here so every customer form uses one source of truth.
 *
 * The checkbox is `name="sms_consent"` and `required` by default — affirmative
 * opt-in is what TCPA expects. Pass `required={false}` only if a form must post
 * without gating (the disclosure still shows; consent is then not recorded).
 *
 * businessName should be the legal entity name when available, falling back to
 * the display brand — consent must name the entity actually sending the texts.
 */
export default function SmsConsent({
  businessName,
  required = true,
  checked,
  onChange,
}: {
  businessName: string
  required?: boolean
  /** Controlled mode: pass both `checked` and `onChange`. Omit for uncontrolled (FormData) forms. */
  checked?: boolean
  onChange?: (checked: boolean) => void
}) {
  const controlled = onChange != null
  return (
    <label className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
      <input
        type="checkbox"
        name="sms_consent"
        required={required}
        value="yes"
        {...(controlled
          ? { checked: !!checked, onChange: (e) => onChange!(e.target.checked) }
          : {})}
        className="mt-0.5 min-w-[18px] min-h-[18px]"
      />
      <span>
        By checking this box, I agree to receive text messages from{' '}
        <strong>{businessName}</strong> about my inquiry, appointments,
        reminders, and customer support at the number provided, including
        messages sent by automated means. Consent is not a condition of
        purchase. Msg frequency may vary. Msg &amp; data rates may apply. Reply
        STOP to opt out, HELP for help.{' '}
        <a
          href="/privacy-policy"
          className="text-[var(--brand)] underline underline-offset-2"
        >
          Privacy Policy
        </a>{' '}
        |{' '}
        <a
          href="/terms-conditions"
          className="text-[var(--brand)] underline underline-offset-2"
        >
          Terms &amp; Conditions
        </a>
      </span>
    </label>
  )
}
