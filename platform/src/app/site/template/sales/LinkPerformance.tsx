'use client'

interface LinkPerformanceProps {
  linkStats: { clicks: number; uniqueVisitors: number; bookClicks: number; thisWeek: number }
  funnel: { clicks: number; direct_clients: number; completed_cleanings: number }
}

export default function LinkPerformance({ linkStats, funnel }: LinkPerformanceProps) {
  const conversionPct = funnel.clicks > 0 ? Math.round((funnel.direct_clients / funnel.clicks) * 1000) / 10 : 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Link Performance</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase">Clicks</p>
          <p className="text-lg font-bold text-gray-900">{linkStats.clicks}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase">Unique Visitors</p>
          <p className="text-lg font-bold text-gray-900">{linkStats.uniqueVisitors}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase">This Week</p>
          <p className="text-lg font-bold text-gray-900">{linkStats.thisWeek}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase">Book Clicks</p>
          <p className="text-lg font-bold text-gray-900">{linkStats.bookClicks}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400 uppercase mb-2">Conversion Funnel</p>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="font-semibold text-gray-900">{funnel.clicks}</span> clicks
          <span className="text-gray-300">→</span>
          <span className="font-semibold text-gray-900">{funnel.direct_clients}</span> direct clients
          <span className="text-gray-300">→</span>
          <span className="font-semibold text-gray-900">{funnel.completed_cleanings}</span> completed
          <span className="ml-auto text-xs text-gray-400">{conversionPct}% click→client</span>
        </div>
      </div>
    </div>
  )
}
