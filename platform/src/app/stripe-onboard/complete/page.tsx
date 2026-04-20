'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function StripeOnboardContent() {
  const searchParams = useSearchParams()
  const teamMemberId = searchParams.get('team_member') || searchParams.get('cleaner')

  useEffect(() => {
    if (teamMemberId) {
      fetch(`/api/team-members/${teamMemberId}/stripe-status`, { method: 'POST' }).catch(() => {})
    }
  }, [teamMemberId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
        <p className="text-gray-600 mb-2">
          Your payment account is connected. You&apos;ll now receive instant payments to your debit card after each job.
        </p>
        <p className="text-gray-600">
          ¡Listo! Tu cuenta de pago está conectada. Ahora recibirás pagos instantáneos en tu tarjeta de débito después de cada trabajo.
        </p>
      </div>
    </div>
  )
}

export default function StripeOnboardComplete() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>}>
      <StripeOnboardContent />
    </Suspense>
  )
}
