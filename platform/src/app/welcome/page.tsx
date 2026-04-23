import { Suspense } from 'react'
import WelcomeClient from './client'

export const metadata = {
  title: 'Welcome to Full Loop CRM',
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>}>
      <WelcomeClient />
    </Suspense>
  )
}
