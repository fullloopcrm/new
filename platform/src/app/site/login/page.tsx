'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import AuthShell, { authButtonClass } from '@/components/auth/AuthShell'

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
    <AuthShell businessName="Full Loop" subtitle="Admin Access">
      <p className="mt-8 font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
        The admin dashboard has moved to the Full Loop platform. Redirecting you now…
      </p>
      <Link href="https://homeservicesbusinesscrm.com/sign-in" className={`mt-8 inline-block text-center ${authButtonClass}`}>
        Continue to sign-in →
      </Link>
    </AuthShell>
  )
}
