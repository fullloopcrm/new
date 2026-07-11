'use client'

// Clerk <SignUp> is retired; the invite flow is disabled (see ./page.tsx, which
// redirects to /admin-login). This component is no longer rendered but is kept
// as a non-Clerk stub so the route compiles.
export default function JoinClient({ tenantName }: { tenantName: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invites are unavailable</h1>
        <p className="text-gray-600">
          Account invites for <strong>{tenantName}</strong> are temporarily disabled. Please
          contact your administrator.
        </p>
      </div>
    </div>
  )
}
