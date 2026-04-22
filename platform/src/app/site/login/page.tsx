'use client'
import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Legacy nycmaid admin-login URL. On the multi-tenant platform, admin
 * authentication lives on the main app domain, not the customer-facing
 * tenant site. This page 301s staff to the platform login and shows a
 * friendly fallback if JS is off.
 */
export default function LoginPage() {
  useEffect(() => {
    window.location.href = 'https://homeservicesbusinesscrm.com/sign-in'
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Admin access</h1>
        <p className="text-gray-600 text-sm mb-6">
          The admin dashboard has moved to the Full Loop platform. Redirecting you now…
        </p>
        <Link
          href="https://homeservicesbusinesscrm.com/sign-in"
          className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
        >
          Continue to Sign-In
        </Link>
      </div>
    </main>
  )
}
