'use client'

import { useEffect } from 'react'
import ReferralSignupForm from '@/app/site/nycmaid/_components/ReferralSignupForm'

export default function ReferralSignupPage() {
  useEffect(() => { document.title = 'Become a Referrer | The NYC Maid' }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-[#1E2A4A] py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide mb-1">
            Get Paid for Referrals
          </h1>
          <h2 className="font-[family-name:var(--font-bebas)] text-xl md:text-2xl text-[#A8F0DC] tracking-wide mb-6">
            Gana Dinero por Referir Clientes
          </h2>
          <p className="text-gray-300">
            Earn 10% commission every time someone you refer books a cleaning with The NYC Maid.
          </p>
          <p className="text-gray-400 italic mt-2">
            Gana 10% de comisión cada vez que alguien que refieras reserve una limpieza.
          </p>
        </div>
      </section>

      <div className="max-w-md mx-auto px-4 py-12">
        <ReferralSignupForm />
      </div>
    </div>
  )
}
