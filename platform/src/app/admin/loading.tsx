export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-slate-100 rounded w-48 border-l-4 border-l-teal-600" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border-l-4 border-l-slate-200 pl-4 py-5 h-24" />
        ))}
      </div>
      <div className="border-t border-slate-200 pt-6 h-96" />
    </div>
  )
}
