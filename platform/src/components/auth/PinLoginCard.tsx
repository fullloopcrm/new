import type { ReactNode } from 'react'
import AuthShell, { authLabelClass, authInputClass, authButtonClass, authErrorClass } from './AuthShell'

interface PinLoginCardProps {
  /** Business / brand name shown in serif at the top (e.g. "The NYC Maid"). */
  businessName: string
  /** Small uppercase line under the name. Defaults to "Admin Portal". */
  subtitle?: string
  /** Credential field label. Defaults to "Password". */
  label?: string
  /** Credential field placeholder. Defaults to "Password or PIN". */
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  error?: string
  loading?: boolean
  /** Disable the submit button (in addition to the loading state). */
  submitDisabled?: boolean
  /** Submit button label. Defaults to "Sign in →". */
  buttonLabel?: string
  /** Label shown on the button while loading. Defaults to "Signing in…". */
  loadingLabel?: string
  maxLength?: number
  inputMode?: 'numeric' | 'text'
  inputType?: 'password' | 'text'
  autoFocus?: boolean
  /** Optional extra fields rendered above the credential field (e.g. a business code). */
  children?: ReactNode
}

/**
 * Shared editorial login card — the default single-credential form used by every
 * operator dashboard and portal. Presentational only: each caller owns its own
 * auth endpoint, redirect, and credential state and passes them in.
 */
export default function PinLoginCard({
  businessName,
  subtitle = 'Admin Portal',
  label = 'Password',
  placeholder = 'Password or PIN',
  value,
  onChange,
  onSubmit,
  error,
  loading = false,
  submitDisabled = false,
  buttonLabel = 'Sign in →',
  loadingLabel = 'Signing in…',
  maxLength = 6,
  inputMode = 'numeric',
  inputType = 'password',
  autoFocus = true,
  children,
}: PinLoginCardProps) {
  return (
    <AuthShell businessName={businessName} subtitle={subtitle}>
      <form
        className="mt-10"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        {children}

        <div className={children ? 'mt-6' : ''}>
          <label htmlFor="pin-login-credential" className={authLabelClass}>
            {label}
          </label>
          <input
            id="pin-login-credential"
            autoFocus={autoFocus}
            type={inputType}
            inputMode={inputMode}
            autoComplete="one-time-code"
            maxLength={maxLength}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={authInputClass}
          />
        </div>

        {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

        <button type="submit" disabled={submitDisabled || loading} className={`mt-8 ${authButtonClass}`}>
          {loading ? loadingLabel : buttonLabel}
        </button>
      </form>
    </AuthShell>
  )
}
