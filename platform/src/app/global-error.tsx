'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Catches errors in the root layout itself — src/app/error.tsx can't (a route
// error boundary doesn't wrap the layout it lives inside). Next.js requires
// this file to render its own <html>/<body> since the real root layout may be
// the thing that broke.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-6">
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            className="bg-white text-gray-900 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
