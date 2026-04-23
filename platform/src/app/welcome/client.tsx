'use client'

import { useSearchParams } from 'next/navigation'

export default function WelcomeClient() {
  const params = useSearchParams()
  const email = params.get('email')

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Payment received</h1>

        <p className="text-slate-600 leading-relaxed mb-6">
          Your Full Loop CRM account is being set up right now. We&apos;re sending
          a welcome email {email ? <>to <span className="font-medium text-slate-900">{email}</span></> : 'to the address you used at checkout'} with a secure link to finish setup.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 text-left text-sm text-slate-600 mb-6">
          <p className="font-medium text-slate-900 mb-2">What to expect:</p>
          <ul className="space-y-1.5">
            <li>• An email from Full Loop CRM within 2 minutes</li>
            <li>• A &quot;Get Started&quot; button — click it to sign in</li>
            <li>• A quick setup wizard to connect your phone, email, and payment methods</li>
            <li>• You&apos;ll be live and taking bookings shortly after</li>
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          Can&apos;t find the email? Check your spam folder or reply to this purchase for help.
        </p>
      </div>
    </main>
  )
}
