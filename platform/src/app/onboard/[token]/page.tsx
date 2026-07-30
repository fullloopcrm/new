'use client'

/**
 * Public, no-login onboarding link — auto-created and emailed to a tenant
 * the moment they're created (see src/lib/onboarding-link.ts). No Clerk, no
 * dashboard chrome: this route is reachable by anyone holding the signed
 * token in the URL, verified server-side on every /api/tenant-profile call
 * (src/lib/onboarding-token.ts). Renders the exact same ProfileWizard the
 * in-dashboard onboarding page does, in token mode.
 */
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { ProfileWizard } from '@/components/tenant-profile/ProfileWizard'
import FeedbackWidget from '@/components/FeedbackWidget'

export default function PublicOnboardingPage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [done, setDone] = useState(false)

  if (!token) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {done ? (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold text-slate-900">You&apos;re all set.</h1>
          <p className="mt-2 text-sm text-slate-500">
            Thanks for finishing your profile — your Full Loop account is wired up. We&apos;ll be in touch.
          </p>
        </div>
      ) : (
        <ProfileWizard mode={{ mode: 'token', token }} onComplete={() => setDone(true)} />
      )}
      <FeedbackWidget source="onboarding_link" token={token} />
    </div>
  )
}
