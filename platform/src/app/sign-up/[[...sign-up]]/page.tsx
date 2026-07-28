import { redirect } from 'next/navigation'

// Onboarding model decision (2026-07-28): FullLoop CRM is white-glove, not
// self-serve. There is no email/password account creation anywhere in this
// codebase — Clerk was removed (no @clerk/nextjs dependency, no
// ClerkProvider mounted) and never replaced with an equivalent self-serve
// signup. Every real tenant is provisioned by a platform admin via
// /admin/businesses (new -> wizard -> provision -> activate), which mints an
// owner PIN handed to the business out of band; that owner then logs in at
// their own tenant domain's /fullloop page. See lib/owner-session.ts for the
// full picture and src/app/admin/docs (Tenants & Settings section) for the
// step-by-step admin process.
//
// This page used to be a static "account creation coming soon" placeholder
// that could never actually create an account. A prospective customer
// landing here has one real next step today: apply, the same as every other
// "Apply Now" CTA on the marketing site.
export default function SignUpPage() {
  redirect('/waitlist')
}
