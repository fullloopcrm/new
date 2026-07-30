'use client'

/**
 * Thin wrapper — the actual wizard is ProfileWizard
 * (src/components/tenant-profile/ProfileWizard.tsx), registry-driven off
 * PROFILE_FIELDS so this page and the public /onboard/[token] link render
 * the exact same fields. This file used to contain the whole hand-written
 * step UI (identity/contact/brand/compliance/social + a website-status step
 * + import links) — the field-driven part of that is now generic; the
 * website-status and import steps were operational screens, not profile
 * fields, and are NOT reproduced by ProfileWizard. They're still reachable
 * directly from the dashboard (Settings for domain/DNS, the per-module
 * import pages for data import) — flagged as a deliberate scope line, not a
 * silent drop.
 */
import { useRouter } from 'next/navigation'
import { ProfileWizard } from '@/components/tenant-profile/ProfileWizard'

export default function OnboardingProfilePage() {
  const router = useRouter()
  return <ProfileWizard mode={{ mode: 'session' }} onComplete={() => router.push('/dashboard?onboarded=1')} />
}
