import { getWireInstructions, verifyWireToken } from '@/lib/wire-instructions'

export default async function ProposalThankYou({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; t?: string }>
}) {
  const { lead, t } = await searchParams
  // Only render real bank details when the token proves this came from an
  // actual checkout redirect (see createProposalCheckout), not a copied or
  // guessed lead id.
  const wire = lead && verifyWireToken(lead, t) ? getWireInstructions(lead) : null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg bg-white border border-slate-200 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-3 text-center">Subscription confirmed — welcome to Full Loop</h1>
        <p className="text-sm text-slate-600 text-center mb-6">
          Your monthly billing is set up. One step left: wire the ${wire ? wire.amount.toLocaleString() : '25,000'} setup fee to get your build started.
        </p>

        {wire?.complete ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm">
            <Row label="Bank" value={wire.bankName} />
            <Row label="Beneficiary" value={wire.beneficiaryName!} />
            <Row label="Account number" value={wire.accountNumber} mono />
            <Row label="Routing number" value={wire.routingNumber} mono />
            <Row label="Amount" value={`$${wire.amount.toLocaleString()}`} />
            <Row label="Reference (include on wire)" value={wire.reference} mono />
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            We&apos;ll email your wire instructions shortly — reach out if you don&apos;t see them within a few hours.
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-900 font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
