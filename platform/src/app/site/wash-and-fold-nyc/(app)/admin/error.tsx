// @ts-nocheck
'use client'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-[#1E2A4A] mb-4">Something went wrong</h2>
        <p className="text-gray-500 mb-6">{error.message || 'An unexpected error occurred'}</p>
        <button onClick={reset} className="px-6 py-3 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90">
          Try Again
        </button>
      </div>
    </div>
  )
}
