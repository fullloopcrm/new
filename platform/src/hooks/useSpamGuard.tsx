'use client'

import { useRef } from 'react'

/**
 * Client half of the shared bot defense (see src/lib/spam-guard.ts for the
 * server-side check). Renders one hidden honeypot input and records when the
 * form mounted, so the API can reject submissions that either fill a field a
 * real user never sees, or arrive faster than a human could have.
 *
 * Usage:
 *   const { honeypotRef, getSpamGuardFields } = useSpamGuard()
 *   const payload = { ...formFields, ...getSpamGuardFields() }
 *   <form>
 *     <Honeypot inputRef={honeypotRef} />
 *     ...
 *   </form>
 */
export function useSpamGuard() {
  const renderedAtRef = useRef(Date.now())
  const honeypotRef = useRef<HTMLInputElement>(null)

  function getSpamGuardFields(): { _hp: string; _ts: number } {
    return {
      _hp: honeypotRef.current?.value || '',
      _ts: renderedAtRef.current,
    }
  }

  return { honeypotRef, getSpamGuardFields }
}

interface HoneypotProps {
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function Honeypot({ inputRef }: HoneypotProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      name="company_website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', top: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
    />
  )
}
