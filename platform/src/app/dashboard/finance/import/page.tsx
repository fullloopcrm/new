'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type BankAccount = { id: string; name: string; mask: string | null; institution: string | null; coa_id: string | null }

export default function BankImportPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<{ accepted: number; duplicates: number; source: string; rows_parsed: number; period_start: string; period_end: string } | null>(null)

  useEffect(() => {
    fetch('/api/finance/bank-accounts').then(r => r.json()).then(d => {
      setAccounts(d.bank_accounts || [])
      if ((d.bank_accounts || [])[0]) setAccountId(d.bank_accounts[0].id)
    })
  }, [])

  async function upload() {
    if (!file || !accountId) { setErr('Pick a bank account and a file'); return }
    setUploading(true); setErr(''); setResult(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('bank_account_id', accountId)
      const res = await fetch('/api/finance/bank-import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      setFile(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setUploading(false)
  }

  const hasUnlinked = accounts.some(a => !a.coa_id)

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/finance/accounts" className="text-xs text-slate-500 hover:underline">← Bank Accounts</Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1 mb-6">Import Bank Statement</h1>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <label className="block text-xs text-slate-500 uppercase mb-1">Bank account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4">
          <option value="">— pick an account —</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.institution ? `${a.institution} · ` : ''}{a.name}{a.mask ? ` · ••${a.mask}` : ''}{!a.coa_id ? ' (not linked)' : ''}
            </option>
          ))}
        </select>

        {hasUnlinked && (
          <p className="text-xs text-amber-700 mb-3">
            ⚠ One or more accounts are not linked to the Chart of Accounts. Link them in{' '}
            <Link href="/dashboard/finance/accounts" className="underline">Bank Accounts</Link> or you won&apos;t be able to categorize.
          </p>
        )}

        <label className="block text-xs text-slate-500 uppercase mb-1">File (CSV, OFX, or QFX)</label>
        <input
          type="file"
          accept=".csv,.ofx,.qfx,text/csv,application/vnd.ms-excel"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 mb-4"
        />
        {file && <p className="text-xs text-slate-500 mb-4">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Download a statement CSV or OFX/QFX file from your bank&apos;s online portal. Auto-detects column layout. Duplicate transactions (by date + amount + description) are filtered automatically.
        </p>

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        <div className="flex justify-end">
          <button onClick={upload} disabled={uploading || !file || !accountId}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
            {uploading ? 'Importing…' : 'Import'}
          </button>
        </div>
      </section>

      {result && (
        <div className="p-5 rounded-xl bg-green-50 border border-green-200">
          <p className="font-semibold text-green-800 mb-2">Imported</p>
          <dl className="text-sm space-y-1 text-green-900">
            <div className="flex justify-between"><dt>Source</dt><dd className="uppercase">{result.source}</dd></div>
            <div className="flex justify-between"><dt>Parsed</dt><dd>{result.rows_parsed}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Accepted</dt><dd>{result.accepted}</dd></div>
            <div className="flex justify-between"><dt>Duplicates skipped</dt><dd>{result.duplicates}</dd></div>
            <div className="flex justify-between"><dt>Period</dt><dd>{result.period_start} → {result.period_end}</dd></div>
          </dl>
          <button onClick={() => router.push('/dashboard/finance/transactions')}
            className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
            Review transactions →
          </button>
        </div>
      )}
    </div>
  )
}
