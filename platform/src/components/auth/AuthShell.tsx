import type { ReactNode } from 'react'

/** Shared field/button styling so every auth surface looks identical. */
export const authLabelClass =
  'block font-mono text-xs font-bold uppercase tracking-widest text-neutral-800'
export const authInputClass =
  'mt-2 w-full rounded-none border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none'
export const authButtonClass =
  'w-full rounded-none bg-neutral-900 py-4 font-mono text-sm uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40'
export const authErrorClass = 'font-mono text-xs uppercase tracking-wide text-red-600'
export const authLinkClass = 'font-medium text-neutral-900 underline underline-offset-2'

export interface AuthHelpLink {
  label: string
  href: string
}

/** Where "Having trouble?" sends operators — the Full Loop CRM contact form. */
export const FULL_LOOP_CONTACT_URL = 'https://homeservicesbusinesscrm.com/contact'

interface AuthShellProps {
  /** Business / brand name shown in serif at the top. */
  businessName: string
  /** Small uppercase line under the name. */
  subtitle?: string
  /** Footer help links (Forgot PIN, Feedback, Contact, etc.). */
  helpLinks?: AuthHelpLink[]
  children: ReactNode
}

/** Full Loop CRM wordmark — the marketing-site treatment, adapted for a light card. */
function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-heading text-lg font-medium text-neutral-900"
        style={{ letterSpacing: '-0.025em' }}
      >
        Full Loop
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">CRM</span>
    </div>
  )
}

/**
 * The one editorial login frame — warm off-white page, bordered white card,
 * co-branded with the Full Loop CRM wordmark above the tenant's serif name.
 * Every login/auth surface renders inside this so branding stays identical
 * everywhere. Edit here, all logins update.
 */
export default function AuthShell({
  businessName,
  subtitle = 'Admin Portal',
  helpLinks,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#f4f3f0] flex items-center justify-center p-4">
      <div className="w-full max-w-lg border border-neutral-300 bg-white p-10 sm:p-14">
        <Wordmark />
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <h1 className="font-serif text-4xl font-medium text-neutral-900 leading-none">
            {businessName}
            <span className="text-neutral-400">.</span>
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">
            {subtitle}
          </p>
        </div>

        {children}

        {helpLinks && helpLinks.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-neutral-200 pt-6 font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            {helpLinks.map((link) => (
              <a key={link.label} href={link.href} className="transition-colors hover:text-neutral-900">
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
