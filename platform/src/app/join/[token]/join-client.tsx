'use client'

// Team-invite account creation moved off Clerk. The session-based owner/team
// account flow is wired in P5; until then this shows the invite context and
// directs the invitee to their admin.
export default function JoinClient({
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
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Full Loop CRM</h1>
        <p className="text-gray-600">
          You&apos;ve been invited to manage <strong>{tenantName}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-3">
          Account setup for <strong>{inviteEmail}</strong> is being finalized. Your FullLoop
          admin will get you access.
        </p>
      </div>
    </div>
  )
}
