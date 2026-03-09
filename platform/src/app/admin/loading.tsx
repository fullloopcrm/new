export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-800 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-24" />
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl h-96" />
    </div>
  )
}
