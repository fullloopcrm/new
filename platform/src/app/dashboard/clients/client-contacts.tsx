'use client'

import { useEffect, useState, useCallback } from 'react'

interface Contact {
  id: string
  name: string | null
  role: string | null
  phone_e164: string | null
  email: string | null
  is_primary: boolean
  receives_sms: boolean
  receives_email: boolean
}

interface FormState {
  name: string
  role: string
  phone: string
  email: string
  receives_sms: boolean
  receives_email: boolean
  is_primary: boolean
}

const EMPTY_FORM: FormState = { name: '', role: '', phone: '', email: '', receives_sms: true, receives_email: true, is_primary: false }

const fieldStyle = { padding: '10px 12px', border: '1px solid var(--clients-line)', borderRadius: 4, fontSize: 14, width: '100%' }
const labelStyle = { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--clients-muted)' }

function formatPhoneDisplay(phone: string): string {
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone
}

export default function ClientContacts({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!clientId) return
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`)
      const data = await res.json().catch(() => [])
      setContacts(Array.isArray(data) ? data : [])
    } catch {
      // A network-level failure must still clear loading — otherwise this
      // section silently renders as if it doesn't exist at all (see `if
      // (loading) return null` below), with no visible error anywhere.
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { setLoading(true); load() }, [load])

  async function add() {
    setBusy(true); setError('')
    const res = await fetch(`/api/clients/${clientId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Failed to add'); return }
    setForm(EMPTY_FORM); setAdding(false)
    load()
  }

  async function update(contactId: string, patch: Partial<Contact>) {
    setBusy(true)
    await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setBusy(false)
    load()
  }

  async function remove(contactId: string) {
    if (!confirm('Remove this contact? They will stop receiving any communications.')) return
    setBusy(true)
    await fetch(`/api/clients/${clientId}/contacts/${contactId}`, { method: 'DELETE' })
    setBusy(false)
    load()
  }

  if (loading) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div className="clients-section-head">
        <span className="clients-section-label">Contacts</span>
        {!adding && (
          <span className="clients-section-action" role="button" tabIndex={0} onClick={() => { setAdding(true); setError('') }}>
            + Add another contact
          </span>
        )}
      </div>

      {contacts.length === 0 && !adding ? (
        <div className="clients-empty">No contacts yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map((c) => (
            <div key={c.id} style={{ border: '1px solid var(--clients-line)', borderRadius: 4, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--clients-ink)' }}>
                  {c.name || '(no name)'}
                  {c.is_primary && (
                    <span style={{ marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 6px', borderRadius: 3, background: 'var(--clients-bg)', color: 'var(--clients-muted)' }}>
                      Primary
                    </span>
                  )}
                  {c.role && <span style={{ color: 'var(--clients-muted)' }}> · {c.role}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  {!c.is_primary && (
                    <span className="clients-section-action" role="button" tabIndex={0} onClick={() => update(c.id, { is_primary: true })}>Make primary</span>
                  )}
                  <span className="clients-section-action" style={{ color: 'var(--clients-danger)' }} role="button" tabIndex={0} onClick={() => remove(c.id)}>
                    Remove
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--clients-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {c.phone_e164 && <span>📞 {formatPhoneDisplay(c.phone_e164)}</span>}
                {c.email && <span>✉️ {c.email}</span>}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--clients-line-soft)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={c.receives_sms}
                    disabled={busy || !c.phone_e164}
                    onChange={(e) => update(c.id, { receives_sms: e.target.checked })}
                  />
                  Texts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={c.receives_email}
                    disabled={busy || !c.email}
                    onChange={(e) => update(c.id, { receives_email: e.target.checked })}
                  />
                  Emails
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div style={{ marginTop: 8, border: '1px solid var(--clients-line)', borderRadius: 4, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Role (optional)</span>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={fieldStyle} placeholder="spouse, office manager, etc." />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Phone</span>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
          </label>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={form.receives_sms} onChange={(e) => setForm({ ...form, receives_sms: e.target.checked })} />
              Texts (consent)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={form.receives_email} onChange={(e) => setForm({ ...form, receives_email: e.target.checked })} />
              Emails (consent)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} />
              Primary
            </label>
          </div>
          {error && <div style={{ fontSize: 12, color: '#dc2626' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={busy} className="clients-btn clients-btn-primary" onClick={add}>{busy ? 'Saving…' : 'Save contact'}</button>
            <button type="button" className="clients-btn clients-btn-ghost" onClick={() => { setAdding(false); setForm(EMPTY_FORM); setError('') }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
