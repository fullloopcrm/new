import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-lg text-gray-400 mb-6">Page not found</p>
        <Link href="/dashboard" className="bg-white text-gray-900 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
