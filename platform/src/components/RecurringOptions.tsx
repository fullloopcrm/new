'use client'

export { generateRecurringDates, getRecurringDisplayName } from '@/lib/recurring'

interface RecurringOptionsProps {
  startDate: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  repeatType: string
  onRepeatTypeChange: (type: string) => void
  repeatEnd: string
  onRepeatEndChange: (end: string) => void
  repeatEndCount: number
  onRepeatEndCountChange: (count: number) => void
  repeatEndDate: string
  onRepeatEndDateChange: (date: string) => void
  customInterval: number
  onCustomIntervalChange: (interval: number) => void
  previewDates: string[]
}

export function RecurringOptions({
  startDate,
  enabled,
  onEnabledChange,
  repeatType,
  onRepeatTypeChange,
  repeatEnd,
  onRepeatEndChange,
  repeatEndCount,
  onRepeatEndCountChange,
  repeatEndDate,
  onRepeatEndDateChange,
  customInterval,
  onCustomIntervalChange,
  previewDates
}: RecurringOptionsProps) {

  const getDayInfo = () => {
    if (!startDate) return { dayName: 'Monday', weekOfMonth: '1st', dayOfMonth: 1 }
    const date = new Date(startDate + 'T12:00:00')
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[date.getDay()]
    const dayOfMonth = date.getDate()
    const weekNum = Math.ceil(dayOfMonth / 7)
    const weekNames = ['1st', '2nd', '3rd', '4th', '5th']
    const weekOfMonth = weekNames[weekNum - 1] || '5th'
    return { dayName, weekOfMonth, dayOfMonth }
  }

  const { dayName, weekOfMonth, dayOfMonth } = getDayInfo()

  const repeatOptions = [
    { value: 'daily', label: 'Every day' },
    { value: 'weekly', label: `Every week on ${dayName}` },
    { value: 'biweekly', label: `Every 2 weeks on ${dayName}` },
    { value: 'triweekly', label: `Every 3 weeks on ${dayName}` },
    { value: 'monthly_date', label: `Every month on the ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}` },
    { value: 'monthly_day', label: `Every month on the ${weekOfMonth} ${dayName}` },
    { value: 'custom', label: 'Custom...' },
  ]

  function getOrdinalSuffix(n: number) {
    if (n > 3 && n < 21) return 'th'
    switch (n % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-slate-900">Repeat</h4>
        <div
          onClick={() => onEnabledChange(!enabled)}
          className={`w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-teal-600' : 'bg-gray-300'} relative cursor-pointer`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
      </div>

      {enabled && (
        <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Repeats</label>
            <select
              value={repeatType}
              onChange={(e) => onRepeatTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 outline-none"
            >
              {repeatOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {repeatType === 'custom' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-600">Every</span>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => onCustomIntervalChange(Math.max(1, customInterval - 1))}
                  className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-l-lg"
                >{'\u2212'}</button>
                <span className="px-4 py-2 text-slate-900 font-medium min-w-[40px] text-center">{customInterval}</span>
                <button
                  type="button"
                  onClick={() => onCustomIntervalChange(customInterval + 1)}
                  className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-r-lg"
                >+</button>
              </div>
              <span className="text-sm text-gray-600">weeks</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">End repeating</label>
            <select
              value={repeatEnd}
              onChange={(e) => onRepeatEndChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 outline-none"
            >
              <option value="never">Never</option>
              <option value="after">After X occurrences</option>
              <option value="on_date">On date</option>
            </select>
          </div>

          {repeatEnd === 'after' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">After</span>
              <input
                type="number"
                min="1"
                max="52"
                value={repeatEndCount}
                onChange={(e) => onRepeatEndCountChange(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-center"
              />
              <span className="text-sm text-gray-600">occurrences</span>
            </div>
          )}

          {repeatEnd === 'on_date' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">End date</label>
              <input
                type="date"
                value={repeatEndDate}
                onChange={(e) => onRepeatEndDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-2">
              Recurring schedule — first <span className="font-semibold text-slate-900">{Math.min(previewDates.length, 4)}</span> bookings created, then auto-generated weekly:
            </p>
            <div className="max-h-24 overflow-y-auto text-xs text-gray-500 space-y-1">
              {previewDates.slice(0, 4).map((date, i) => (
                <div key={i}>
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                </div>
              ))}
              {previewDates.length > 4 && (
                <div className="text-gray-400 italic">+ future bookings auto-generated by system</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
