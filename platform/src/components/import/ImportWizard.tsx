'use client'

/**
 * ImportWizard — the guided, guard-railed path a tenant uses to bring their book
 * of business into Full Loop. Shared by the Clients and Schedules import pages.
 *
 * Flow: pick source CRM → follow that platform's export steps → upload CSV →
 * confirm the auto-mapped columns → STAGE (nothing written) → the review screen
 * commits, and can undo the whole batch.
 *
 * GUARDRAILS (why this is safe):
 *  - Upload never writes to live tables. We stage a reviewable batch; the review
 *    screen is where the operator commits, and any batch can be undone whole.
 *  - Unrecognized columns are left unmapped (operator maps them), never guessed.
 *  - Schedules match to already-imported clients; unmatched rows are HELD, never
 *    dropped onto a live calendar. We hard-block staging schedules when the
 *    tenant has zero clients yet.
 *  - Required key must be mapped before staging is allowed.
 *  - Row cap mirrors the stage API (5,000 / file).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CRM_PRESETS, getPreset, resolveMapping, buildRows, detectPreset,
  type CrmPreset, type ImportKind, type MappingPlan,
} from '@/lib/crm-presets'
import { parseDelimited } from '@/lib/csv-parse'

const MAX_ROWS = 5000

interface FieldDef { key: string; label: string; required?: boolean; matchKey?: boolean }

const CLIENT_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'source', label: 'Lead source' },
  { key: 'notes', label: 'Notes' },
  { key: 'status', label: 'Status' },
]
const SCHEDULE_FIELDS: FieldDef[] = [
  { key: 'client_name', label: 'Client name', matchKey: true },
  { key: 'client_phone', label: 'Client phone', matchKey: true },
  { key: 'start', label: 'Start date/time' },
  { key: 'duration_hours', label: 'Duration (hrs)' },
  { key: 'service_type', label: 'Service' },
  { key: 'price', label: 'Price' },
  { key: 'staff_name', label: 'Assigned staff' },
  { key: 'recurring_type', label: 'Recurring (weekly/biweekly/monthly)' },
  { key: 'day_of_week', label: 'Day of week (recurring)' },
  { key: 'preferred_time', label: 'Preferred time (recurring)' },
  { key: 'notes', label: 'Notes' },
]

type Step = 'source' | 'export' | 'map'

export default function ImportWizard({ kind }: { kind: ImportKind }) {
  const router = useRouter()
  const fields = kind === 'schedules' ? SCHEDULE_FIELDS : CLIENT_FIELDS

  const [step, setStep] = useState<Step>('source')
  const [preset, setPresetState] = useState<CrmPreset | null>(null)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [plan, setPlan] = useState<MappingPlan>({ fields: {}, unmappedHeaders: [] })
  const [detected, setDetected] = useState<CrmPreset | null>(null)
  const [clientCount, setClientCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Schedules guardrail: know how many clients exist before allowing an upload.
  useEffect(() => {
    if (kind !== 'schedules') return
    fetch('/api/clients?limit=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClientCount(typeof d?.total === 'number' ? d.total : null))
      .catch(() => setClientCount(null))
  }, [kind])

  const noClientsYet = kind === 'schedules' && clientCount === 0

  const pickPreset = (p: CrmPreset) => { setPresetState(p); setErr(''); setStep('export') }

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !preset) return
    setErr('')
    const reader = new FileReader()
    reader.onload = () => {
      const { headers: h, rows: r } = parseDelimited(String(reader.result || ''))
      if (h.length === 0 || r.length === 0) { setErr('That file has a header row but no data rows.'); return }
      if (r.length > MAX_ROWS) { setErr(`That file has ${r.length.toLocaleString()} rows — the limit is ${MAX_ROWS.toLocaleString()} per file. Split it and import in batches.`); return }
      setFileName(file.name)
      setHeaders(h)
      setRows(r)
      setPlan(resolveMapping(preset, kind, h))
      const ranked = detectPreset(kind, h)
      setDetected(ranked[0]?.preset ?? null)
      setStep('map')
    }
    reader.readAsText(file)
  }, [preset, kind])

  // Editing the plan: assign a field to a single column, or clear it.
  const setFieldColumn = (fieldKey: string, idx: number) => {
    setPlan((p) => {
      const next = { ...p.fields }
      if (idx < 0) delete next[fieldKey]
      else next[fieldKey] = [idx]
      const usedIdx = new Set(Object.values(next).flat())
      return { fields: next, unmappedHeaders: headers.filter((_, i) => !usedIdx.has(i)) }
    })
  }

  const previewRows = useMemo(() => buildRows(headers, rows.slice(0, 5), plan), [headers, rows, plan])
  const mappedFieldKeys = fields.filter((f) => plan.fields[f.key]?.length).map((f) => f.key)
  const requiredMet = kind === 'schedules'
    ? !!(plan.fields.client_name?.length || plan.fields.client_phone?.length)
    : !!plan.fields.name?.length

  const stage = async () => {
    setBusy(true); setErr('')
    try {
      const built = buildRows(headers, rows, plan)
      const res = await fetch('/api/dashboard/import/stage', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, rows: built, filename: fileName, mapping: plan.fields }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Staging failed.'); setBusy(false); return }
      router.push(`/dashboard/import/review/${data.batchId}`)
    } catch {
      setErr('Network error while staging.'); setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Header kind={kind} step={step} />

      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {step === 'source' && (
        <SourceStep kind={kind} onPick={pickPreset} noClientsYet={noClientsYet} clientCount={clientCount} />
      )}

      {step === 'export' && preset && (
        <ExportStep
          preset={preset} noClientsYet={noClientsYet}
          onBack={() => setStep('source')} onFile={onFile}
        />
      )}

      {step === 'map' && preset && (
        <MapStep
          kind={kind} preset={preset} detected={detected} fields={fields}
          headers={headers} rowsCount={rows.length} plan={plan} previewRows={previewRows}
          mappedFieldKeys={mappedFieldKeys} requiredMet={requiredMet} busy={busy}
          onSetColumn={setFieldColumn} onBack={() => setStep('export')} onStage={stage}
        />
      )}
    </div>
  )
}

function Header({ kind, step }: { kind: ImportKind; step: Step }) {
  const n = step === 'source' ? 1 : step === 'export' ? 2 : 3
  return (
    <div className="mb-6">
      <Link href="/dashboard/onboarding" className="text-sm text-teal-600 hover:underline">&larr; Setup</Link>
      <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900">
        Import your {kind === 'schedules' ? 'schedule' : 'client list'}
      </h1>
      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
        {['Pick your CRM', 'Export & upload', 'Confirm & stage'].map((label, i) => (
          <span key={label} className={`rounded-full px-2.5 py-1 ${i + 1 === n ? 'bg-teal-600 text-white' : i + 1 < n ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
            {i + 1}. {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
      <span className="mr-1 font-semibold">Tip:</span>{children}
    </div>
  )
}

function SourceStep({ kind, onPick, noClientsYet, clientCount }: {
  kind: ImportKind; onPick: (p: CrmPreset) => void; noClientsYet: boolean; clientCount: number | null
}) {
  return (
    <div className="space-y-4">
      {kind === 'schedules' && noClientsYet && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Import your clients first.</p>
          <p className="mt-1">Appointments are matched to existing clients by phone or name. With no clients imported yet, every row would be held as unmatched.</p>
          <Link href="/dashboard/clients/import" className="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">Import clients first →</Link>
        </div>
      )}
      {kind === 'schedules' && clientCount !== null && clientCount > 0 && (
        <Tip>You have {clientCount.toLocaleString()} clients. Appointments will be matched to them by phone, then name — anything we can&apos;t match is held for your review, never dropped onto the calendar.</Tip>
      )}
      <Tip>Pick where your data lives today. We&apos;ll show the exact steps to export it and pre-map the columns for you — you just confirm.</Tip>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CRM_PRESETS.map((p) => (
          <button key={p.id} onClick={() => onPick(p)} disabled={noClientsYet}
            className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="text-2xl" aria-hidden>{p.emoji}</span>
            <span className="text-sm font-semibold text-slate-900">{p.label}</span>
            {p.verified && <span className="text-[10px] font-medium text-teal-600">✓ verified columns</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExportStep({ preset, noClientsYet, onBack, onFile }: {
  preset: CrmPreset; noClientsYet: boolean
  onBack: () => void; onFile: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">&larr; Different source</button>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-semibold text-slate-900">
          <span aria-hidden>{preset.emoji}</span> Export from {preset.label}
        </h2>
        {!preset.verified && (
          <p className="mb-3 text-xs text-slate-500">We&apos;ll auto-detect your columns after upload — these steps are a guide, exact menu names may differ by account.</p>
        )}
        <ol className="ml-5 list-decimal space-y-1.5 text-sm text-slate-700">
          {preset.exportSteps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
      <Tip>Export your <strong>full</strong> list. Max {MAX_ROWS.toLocaleString()} rows per file — split larger lists and import in batches. Nothing is saved until you review and commit.</Tip>
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-12 text-center ${noClientsYet ? 'pointer-events-none border-slate-200 opacity-50' : 'border-slate-300 bg-white hover:border-teal-400'}`}>
        <span className="text-sm font-medium text-slate-700">Choose your exported CSV</span>
        <span className="text-xs text-slate-400">.csv or .tsv — the first row should be column headers</span>
        <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={onFile} className="hidden" disabled={noClientsYet} />
      </label>
    </div>
  )
}

function MapStep({ kind, preset, detected, fields, headers, rowsCount, plan, previewRows, mappedFieldKeys, requiredMet, busy, onSetColumn, onBack, onStage }: {
  kind: ImportKind; preset: CrmPreset; detected: CrmPreset | null; fields: FieldDef[]
  headers: string[]; rowsCount: number; plan: MappingPlan; previewRows: Array<Record<string, string>>
  mappedFieldKeys: string[]; requiredMet: boolean; busy: boolean
  onSetColumn: (field: string, idx: number) => void; onBack: () => void; onStage: () => void
}) {
  const mismatch = detected && detected.id !== preset.id
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">&larr; Upload a different file</button>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <span className="font-semibold">Nothing is saved yet.</span> Staging {rowsCount.toLocaleString()} rows opens a review screen where you see exactly what will be created — then you commit, and can undo the whole batch.
      </div>

      {mismatch && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          These columns look more like <strong>{detected!.label}</strong> than {preset.label}. If you picked the wrong platform, go back — otherwise the mapping below still applies.
        </div>
      )}

      {kind === 'clients'
        ? <Tip>Duplicates are skipped automatically by email and phone. A row with neither a phone nor an email can&apos;t be saved — you&apos;ll see it flagged on the review screen.</Tip>
        : <Tip>Each appointment is matched to a client by phone, then name. Recurring rows need weekly/biweekly/monthly; one-time rows need a start date. Unmatched rows are held for review.</Tip>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-heading text-lg font-semibold text-slate-900">Confirm the column mapping</h2>
        <div className="space-y-2.5">
          {fields.map((f) => {
            const idxs = plan.fields[f.key] || []
            const composite = idxs.length > 1
            return (
              <div key={f.key} className="grid grid-cols-[150px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-slate-700">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                  {f.matchKey && <span className="ml-1 text-[10px] text-slate-400">match key</span>}
                </label>
                {composite ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-700">{idxs.map((i) => headers[i]).join(' + ')}</span>
                    <button onClick={() => onSetColumn(f.key, -1)} className="text-xs text-slate-400 hover:text-slate-600">clear</button>
                  </div>
                ) : (
                  <select
                    value={idxs[0] ?? ''}
                    onChange={(e) => onSetColumn(f.key, e.target.value === '' ? -1 : Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">— skip —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                )}
              </div>
            )
          })}
        </div>

        {plan.unmappedHeaders.length > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            Not imported: {plan.unmappedHeaders.join(', ')}. Assign any of these above if you need them.
          </p>
        )}
      </div>

      {previewRows.length > 0 && mappedFieldKeys.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preview (first {previewRows.length})</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                {mappedFieldKeys.map((k) => <th key={k} className="px-2 py-1">{fields.find((f) => f.key === k)?.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((r, i) => (
                <tr key={i}>{mappedFieldKeys.map((k) => <td key={k} className="px-2 py-1 text-slate-700">{r[k] || '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!requiredMet && (
        <p className="text-sm text-amber-600">
          Map {kind === 'schedules' ? 'a client name or client phone (the match key)' : 'the Name field'} to continue.
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={onStage} disabled={busy || !requiredMet}
          className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {busy ? 'Staging…' : `Stage ${rowsCount.toLocaleString()} rows for review`}
        </button>
      </div>
    </div>
  )
}
