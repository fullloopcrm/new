'use client'

interface TierProgressProps {
  tier: string
  label: string
  ratePercent: number
  directClientCount: number
  nextTier: { label: string; rate_percent: number; threshold: number } | null
  remainingToNext: number | null
  progressPct: number
  justPromoted: boolean
}

export default function TierProgress({
  label,
  ratePercent,
  directClientCount,
  nextTier,
  remainingToNext,
  progressPct,
  justPromoted,
}: TierProgressProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      {justPromoted && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded px-2 py-1 mb-3 inline-block">
          🎉 You were just promoted to {label} ({ratePercent}%)!
        </p>
      )}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm">Commission Tier</h3>
        {nextTier && <span className="text-xs text-gray-400">{directClientCount}/{nextTier.threshold} direct clients</span>}
      </div>
      {!nextTier ? (
        <p className="text-sm text-gray-500">
          You&apos;re at the top tier — <strong className="text-emerald-600">{label} ({ratePercent}%)</strong> on every direct client.
        </p>
      ) : (
        <>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Currently <strong className="text-gray-900">{label} ({ratePercent}%)</strong>. {remainingToNext} more direct client{remainingToNext === 1 ? '' : 's'} unlocks <strong className="text-gray-900">{nextTier.label} ({nextTier.rate_percent}%)</strong>.
          </p>
        </>
      )}
    </div>
  )
}
