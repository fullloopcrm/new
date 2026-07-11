// Owner self-serve sign-up is dormant — it moved off Clerk and will be wired
// onto the session system in P5. Placeholder, not a live form.
export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">Create an owner account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Owner onboarding is being set up. Contact your FullLoop admin to get started.
        </p>
      </div>
    </div>
  )
}
