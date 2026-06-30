export default function ProposalCancelled() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Checkout cancelled</h1>
        <p className="text-sm text-slate-600">No payment was taken. Reach out and we&apos;ll resend your link whenever you&apos;re ready.</p>
      </div>
    </div>
  )
}
