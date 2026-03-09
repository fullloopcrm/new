export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-slate-700 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5 h-24" />
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl h-64" />
    </div>
  )
}
