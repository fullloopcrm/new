export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-slate-50 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-slate-200 rounded-lg p-5 h-24" />
        ))}
      </div>
      <div className="border border-slate-200 rounded-lg h-64" />
    </div>
  )
}
