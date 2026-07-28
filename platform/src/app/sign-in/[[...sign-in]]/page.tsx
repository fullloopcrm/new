import Link from 'next/link'

// Onboarding model decision (2026-07-28): FullLoop CRM is white-glove, not
// self-serve — see the matching note in src/app/sign-up for the full
// evidence trail. There is no cross-tenant login here to make real: each
// tenant's dashboard is reached at THAT tenant's own domain (e.g.
// yourbusiness.com/fullloop) with the PIN issued when the account was set
// up, not from this shared marketing domain. This page previously implied a
// login system was "being set up" (i.e. coming soon); that was never true —
// self-serve login isn't planned work in progress, it's simply not the
// product's model. Kept as a real page (not deleted) because it's linked
// from /feedback's nav and from the "invite already accepted" state of
// /join/[token].
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">Business owner login</h1>
        <p className="mt-2 text-sm text-gray-600">
          FullLoop CRM accounts are set up by our team for each business — there&apos;s no
          shared sign-in page here. Log in at your own business&apos;s site
          (yourbusiness.com/fullloop) with the PIN you were given.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Lost your PIN, or not sure which site is yours?{' '}
          <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact us
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
