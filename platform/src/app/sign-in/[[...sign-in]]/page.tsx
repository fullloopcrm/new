// Owner self-serve login is dormant — it moved off Clerk and will be wired
// onto the session system in P5. Today the dashboard is reached via admin
// impersonation, so this is a placeholder, not a live login form.
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">Owner sign-in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Owner accounts are being set up. For access now, contact your FullLoop admin.
        </p>
      </div>
    </div>
  )
}
