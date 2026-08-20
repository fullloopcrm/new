import type { Metadata } from 'next'
import { getPosition } from '@/lib/positions/catalog'
import PositionApplicationForm from '@/components/apply/PositionApplicationForm'

export const metadata: Metadata = {
  title: 'Apply — Administrator | The Pennsylvania Maid',
  robots: { index: false, follow: false },
}

export default function ApplyAdministratorPage() {
  const config = getPosition('pennsylvania-maid', 'administrator')
  if (!config) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E2A4A] px-6 py-4">
        <h1 className="text-white text-xl font-bold">The Pennsylvania Maid</h1>
        <p className="text-gray-400 text-sm">Administrator Application</p>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6">
        <PositionApplicationForm config={config} />
      </div>
    </div>
  )
}
