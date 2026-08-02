'use client'

/**
 * Public, no-login onboarding link — auto-created and emailed to a tenant
 * the moment they're created (see src/lib/onboarding-link.ts). No Clerk, no
 * dashboard chrome: this route is reachable by anyone holding the signed
 * token in the URL, verified server-side on every /api/tenant-profile call
 * (src/lib/onboarding-token.ts). Gated behind a PIN screen first (see
 * onboarding-pin.ts) — the raw URL token alone isn't accepted by the
 * profile/catalog/uploads/etc APIs until it's exchanged here for an
 * elevated, PIN-verified token. Renders the exact same ProfileWizard the
 * in-dashboard onboarding page does, in token mode.
 */
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProfileWizard } from '@/components/tenant-profile/ProfileWizard'
import FeedbackWidget from '@/components/FeedbackWidget'
import OnboardingChatWidget from '@/components/tenant-profile/OnboardingChatWidget'
import { OnboardingPinGate } from '@/components/tenant-profile/OnboardingPinGate'

const elevatedTokenKey = (rawToken: string) => `fl-onboarding-pin-token:${rawToken}`

export default function PublicOnboardingPage() {
  const params = useParams<{ token: string }>()
  const rawToken = params.token
  const [done, setDone] = useState(false)
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [checkedCache, setCheckedCache] = useState(false)

  useEffect(() => {
    if (!rawToken) return
    // Cached in localStorage (not sessionStorage) so a tenant who closes the
    // tab and reopens the same link later doesn't have to re-enter the PIN
    // — matches the "leaves and comes back" behavior ProfileWizard's welcome
    // screen already promises, since it's keyed off this same token value.
    setActiveToken(window.localStorage.getItem(elevatedTokenKey(rawToken)))
    setCheckedCache(true)
  }, [rawToken])

  if (!rawToken || !checkedCache) return null

  if (!activeToken) {
    return (
      <div className="loop-scope min-h-screen" style={{ background: 'var(--color-loop-bg)' }}>
        <OnboardingPinGate
          token={rawToken}
          onVerified={(elevatedToken) => {
            window.localStorage.setItem(elevatedTokenKey(rawToken), elevatedToken)
            setActiveToken(elevatedToken)
          }}
        />
      </div>
    )
  }

  return (
    <div className="loop-scope min-h-screen" style={{ background: 'var(--color-loop-bg)' }}>
      {done ? (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold text-slate-900">You&apos;re all set.</h1>
          <p className="mt-2 text-sm text-slate-500">
            Thanks for finishing your profile — your Full Loop account is wired up. We&apos;ll be in touch.
          </p>
        </div>
      ) : (
        <ProfileWizard mode={{ mode: 'token', token: activeToken }} onComplete={() => setDone(true)} />
      )}
      <FeedbackWidget source="onboarding_link" token={activeToken} />
      <OnboardingChatWidget token={activeToken} tenantName="" />
    </div>
  )
}
