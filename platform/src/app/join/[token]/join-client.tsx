'use client'

import { SignUp } from '@clerk/nextjs'

export default function JoinClient({
  token,
  inviteEmail,
  tenantName,
}: {
  token: string
  inviteEmail: string
  tenantName: string
  tenantId: string
  inviteId: string
  role: string
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Full Loop CRM</h1>
        <p className="text-gray-600">
          You&apos;ve been invited to manage <strong>{tenantName}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Create your account below to get started. Use <strong>{inviteEmail}</strong> for best results.
        </p>
      </div>

      <SignUp
        forceRedirectUrl={`/join/${token}/accept`}
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            cardBox: 'shadow-lg rounded-xl',
          },
        }}
      />

      <p className="text-xs text-gray-400 mt-6 text-center max-w-sm">
        Already have an account?{' '}
        <a href={`/sign-in?redirect_url=/join/${token}`} className="text-blue-600 hover:text-blue-500">
          Sign in instead
        </a>
      </p>
    </div>
  )
}
