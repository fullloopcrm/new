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

interface AuthShellProps {
  /** Business / brand name shown in serif at the top. */
  businessName: string
  /** Small uppercase line under the name. */
  subtitle?: string
  children: ReactNode
}

/**
 * The one editorial login frame — warm off-white page, bordered white card,
 * serif brand name, mono subtitle. Every login/auth surface renders inside this
 * so branding stays identical everywhere. Edit here, all logins update.
 */
export default function AuthShell({ businessName, subtitle = 'Admin Portal', children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#f4f3f0] flex items-center justify-center p-4">
      <div className="w-full max-w-lg border border-neutral-300 bg-white p-10 sm:p-14">
        <h1 className="font-serif text-4xl font-medium text-neutral-900 leading-none">
          {businessName}
          <span className="text-neutral-400">.</span>
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  )
}
