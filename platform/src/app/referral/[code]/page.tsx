'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ReferralLandingPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<{ name: string; slug: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/referrals/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_code: code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tenant) {
          setTenant(data.tenant)
          // Auto-redirect to booking portal after 3 seconds
          setTimeout(() => {
            router.push(`/portal/login`)
          }, 3000)
        } else {
          setError('Invalid referral code')
        }
      })
  }, [code, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {tenant ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              You&apos;ve been referred to {tenant.name}!
            </h1>
            <p className="text-gray-500 mb-4">Redirecting you to book your appointment...</p>
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
          </>
        ) : (
          <p className="text-gray-400">Loading...</p>
        )}
      </div>
    </div>
  )
}
