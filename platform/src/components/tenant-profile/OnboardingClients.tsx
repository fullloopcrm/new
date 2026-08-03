'use client'

/**
 * "Bring your existing clients into Full Loop" — lives inside the
 * ProfileWizard's Existing Clients step (PROFILE_FIELDS deliberately has no
 * field for it, same pattern as OnboardingCatalog for Services & Pricing —
 * see the readonly `clientImportStatus` placeholder in tenant-profile.ts).
 *
 * Talks straight to /api/clients (the same route the dashboard's client list
 * uses), token-authed via the onboarding link so a brand-new tenant can do
 * this before they've ever logged in. Rows land as real `clients` rows
 * immediately — there's no separate staging/promotion step, so whatever's
 * imported here is already live the moment the tenant is activated.
 *
 * Deliberately lean (no CRM-source detection, no staged review/undo — see
 * the full /dashboard/clients/import wizard for that): paste a list, we
 * import it. A phone number with no name is a first-class case, not an
 * error — it's exactly what lets a tenant bring in "people who called but
 * never booked" so Full Loop can text them and collect a name later.
 */
import { useState } from 'react'

interface ParsedRow {
  name: string
  phone: string
  email: string
  address: string
  source: 'phone_inbound' | 'other'
  line: string
}

const EXAMPLE = `Jane Smith, (407) 555-0134, jane@email.com, 123 Palm St, Orlando FL
John Doe, 407-555-0199
(407) 555-0212`

/** Loose phone check for the "just a bare phone number, no commas" case —
 *  mostly digits/punctuation, long enough to be a real number. The real
 *  validation happens server-side (validate.ts's PHONE_RE); this is only
 *  to tell "555-0212" apart from "Jane Smith" on an unpunctuated line. */
function looksLikePhone(s: string): boolean {
  const digits = s.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 && /^[\d\s()+.\-]+$/.test(s)
}

/** "Name, Phone, Email, Address" per line, or a bare phone number alone.
 *  No name given (blank first field, or the whole line is just a phone)
 *  falls back to the phone number as the display name and tags the row
 *  phone_inbound — a call-in contact, not an existing client. Blank lines
 *  and lines with neither a name nor a readable phone are skipped, not
 *  errored, same tolerance as OnboardingCatalog's price-list parser. */
function parseClientList(raw: string): { rows: ParsedRow[]; skipped: number } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const rows: ParsedRow[] = []
  let skipped = 0
  for (const line of lines) {
    if (!line.includes(',') && looksLikePhone(line)) {
      rows.push({ name: line, phone: line, email: '', address: '', source: 'phone_inbound', line })
      continue
    }
    const parts = line.split(',').map((p) => p.trim())
    const rawName = parts[0] || ''
    const phone = parts[1] || ''
    const email = parts[2] || ''
    const address = parts[3] || ''
    const name = rawName || phone
    if (!name) { skipped++; continue }
    rows.push({ name, phone, email, address, source: rawName ? 'other' : 'phone_inbound', line })
  }
  return { rows, skipped }
}

const CHUNK_SIZE = 8

export default function OnboardingClients({ token }: { token?: string }) {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; failed: { line: string; reason: string }[]; skipped: number } | null>(null)
  const [addedTotal, setAddedTotal] = useState(0)

  const importList = async () => {
    const { rows, skipped } = parseClientList(text)
    if (!rows.length) { setResult({ added: 0, failed: [], skipped }); return }
    setImporting(true)
    setResult(null)
    const failed: { line: string; reason: string }[] = []
    let added = 0
    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE)
        const outcomes = await Promise.all(chunk.map(async (row) => {
          try {
            const res = await fetch('/api/clients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                name: row.name,
                phone: row.phone || undefined,
                email: row.email || undefined,
                address: row.address || undefined,
                source: row.source,
                force: true,
              }),
            })
            if (res.ok) return { ok: true as const }
            const body = await res.json().catch(() => ({}))
            return { ok: false as const, reason: body?.error || `Couldn't save (status ${res.status})` }
          } catch {
            return { ok: false as const, reason: 'Network error' }
          }
        }))
        outcomes.forEach((outcome, idx) => {
          if (outcome.ok) added++
          else failed.push({ line: chunk[idx].line, reason: outcome.reason })
        })
      }
      setAddedTotal((prev) => prev + added)
      setResult({ added, failed, skipped })
      if (added > 0) setText('')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm text-slate-500">
        Add your existing clients — anyone who&apos;s booked with you before — plus any phone numbers of people
        who&apos;ve called or texted but never actually booked. Once you&apos;re live, Full Loop can text them
        to bring them back in.
      </p>
      <p className="mb-3 text-xs text-slate-400">
        One contact per line: <code className="rounded bg-slate-100 px-1 py-0.5">Name, Phone, Email, Address</code>.
        Only name and phone really matter — leave email/address blank if you don&apos;t have them. Don&apos;t have a
        name for someone? Just paste their phone number by itself, on its own line — we&apos;ll text them and get
        their name once they respond.
      </p>

      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Example</p>
        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600">{EXAMPLE}</pre>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(null) }}
        placeholder={EXAMPLE}
        rows={8}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={importList}
          disabled={importing || !text.trim()}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import list'}
        </button>
        {addedTotal > 0 && <span className="text-xs text-slate-500">{addedTotal} contact{addedTotal === 1 ? '' : 's'} imported so far.</span>}
      </div>

      {result && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 text-xs">
          <p className="text-slate-600">
            Imported {result.added}{result.skipped > 0 ? `, skipped ${result.skipped} unreadable line${result.skipped === 1 ? '' : 's'}` : ''}
            {result.failed.length > 0 ? `, ${result.failed.length} couldn't save` : ''}.
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-red-600">
              {result.failed.map((f, i) => (
                <li key={i}><span className="font-mono">{f.line}</span> — {f.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
