'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '../layout'
import AddressAutocomplete from '@/components/AddressAutocomplete'

interface Contact {
  id: string
  name: string | null
  role: string | null
  phone_e164: string | null
  email: string | null
  is_primary: boolean
  receives_sms: boolean
  receives_email: boolean
  sms_consent_at?: string | null
  email_consent_at?: string | null
}

interface Property {
  id: string
  label: string | null
  address: string
  unit: string | null
  is_primary: boolean
}

const EMPTY_CONTACT_FORM = { name: '', role: '', phone: '', email: '' }

function formatPhoneDisplay(phone: string): string {
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone
}

export default function PortalAccountPage() {
  const { auth } = usePortalAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  const [addingContact, setAddingContact] = useState(false)
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM)
  const [contactError, setContactError] = useState('')
  const [busy, setBusy] = useState(false)

  // Which contact/channel is mid-verification, and the code they've typed.
  const [verifying, setVerifying] = useState<{ contactId: string; channel: 'sms' | 'email' } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState('')

  const [addingAddress, setAddingAddress] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newAddressValid, setNewAddressValid] = useState(false)
  const [newUnit, setNewUnit] = useState('')
  const [addressError, setAddressError] = useState('')

  useEffect(() => setMounted(true), [])

  const load = useCallback(async () => {
    if (!auth) return
    const headers = { Authorization: `Bearer ${auth.token}` }
    const [cRes, pRes] = await Promise.all([
      fetch('/api/portal/contacts', { headers }),
      fetch('/api/portal/properties', { headers }),
    ])
    if (cRes.ok) setContacts((await cRes.json()).contacts || [])
    if (pRes.ok) setProperties((await pRes.json()).properties || [])
    setLoading(false)
  }, [auth])

  useEffect(() => { load() }, [load])

  async function addContact() {
    if (!auth) return
    if (!contactForm.phone.trim() && !contactForm.email.trim()) {
      setContactError('Enter at least a phone or an email.')
      return
    }
    setBusy(true); setContactError('')
    const res = await fetch('/api/portal/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(contactForm),
    })
    setBusy(false)
    if (!res.ok) { setContactError((await res.json().catch(() => ({}))).error || 'Failed to add'); return }
    setContactForm(EMPTY_CONTACT_FORM); setAddingContact(false)
    load()
  }

  async function removeContact(contactId: string) {
    if (!auth) return
    if (!confirm('Remove this contact? They will stop receiving any communications.')) return
    setBusy(true)
    await fetch(`/api/portal/contacts/${contactId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` } })
    setBusy(false)
    load()
  }

  async function toggleChannel(contact: Contact, channel: 'sms' | 'email', enabled: boolean) {
    if (!auth) return
    const consented = channel === 'sms' ? contact.sms_consent_at : contact.email_consent_at
    if (enabled && !consented) {
      // Not verified yet — start the OTP flow instead of flipping the toggle.
      setVerifying({ contactId: contact.id, channel })
      setVerifyCode(''); setVerifyError('')
      setBusy(true)
      const res = await fetch('/api/portal/contacts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ action: 'send_code', contact_id: contact.id, channel }),
      })
      setBusy(false)
      if (!res.ok) setVerifyError((await res.json().catch(() => ({}))).error || 'Failed to send code')
      return
    }
    setBusy(true)
    await fetch(`/api/portal/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ [channel === 'sms' ? 'receives_sms' : 'receives_email']: enabled }),
    })
    setBusy(false)
    load()
  }

  async function confirmVerify() {
    if (!auth || !verifying) return
    setBusy(true); setVerifyError('')
    const res = await fetch('/api/portal/contacts/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ action: 'confirm_code', contact_id: verifying.contactId, channel: verifying.channel, code: verifyCode }),
    })
    setBusy(false)
    if (!res.ok) { setVerifyError((await res.json().catch(() => ({}))).error || 'Invalid code'); return }
    setVerifying(null); setVerifyCode('')
    load()
  }

  async function makePrimaryContact(contactId: string) {
    if (!auth) return
    setBusy(true)
    await fetch(`/api/portal/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ is_primary: true }),
    })
    setBusy(false)
    load()
  }

  async function addAddress() {
    if (!auth) return
    if (newAddress.trim().length < 5) { setAddressError('Enter a full address.'); return }
    if (!newAddressValid) { setAddressError('Pick an address from the suggestions dropdown.'); return }
    setBusy(true); setAddressError('')
    const res = await fetch('/api/portal/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ address: newAddress.trim(), unit: newUnit.trim() || null }),
    })
    setBusy(false)
    if (!res.ok) { setAddressError((await res.json().catch(() => ({}))).error || 'Failed to add'); return }
    setNewAddress(''); setNewUnit(''); setAddingAddress(false); setNewAddressValid(false)
    load()
  }

  async function patchProperty(propertyId: string, action: 'set_primary' | 'deactivate') {
    if (!auth) return
    setBusy(true)
    await fetch('/api/portal/properties', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ property_id: propertyId, action }),
    })
    setBusy(false)
    load()
  }

  if (!mounted) return <p className="text-center pt-16 text-slate-400">Loading...</p>
  if (!auth) { router.push('/portal/login'); return null }
  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">Loading...</p></div>

  return (
    <div className="pb-20 space-y-6">
      <h1 className="text-xl font-bold text-slate-800">My Info</h1>

      {/* Contacts */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-slate-800">Phone &amp; email</p>
          {!addingContact && (
            <button onClick={() => { setAddingContact(true); setContactError('') }} className="text-sm text-blue-600 font-medium">
              + Add another
            </button>
          )}
        </div>

        <div className="space-y-3">
          {contacts.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-center gap-3">
                <div className="text-sm text-slate-800">
                  {c.name || '(no name)'}
                  {c.is_primary && <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-slate-500">Primary</span>}
                  {c.role && <span className="text-slate-400"> · {c.role}</span>}
                </div>
                <div className="flex gap-3 shrink-0 text-xs">
                  {!c.is_primary && (
                    <button onClick={() => makePrimaryContact(c.id)} className="text-blue-600 font-medium">Make primary</button>
                  )}
                  <button onClick={() => removeContact(c.id)} className="text-red-600 font-medium">Remove</button>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                {c.phone_e164 && <p>📞 {formatPhoneDisplay(c.phone_e164)}</p>}
                {c.email && <p>✉️ {c.email}</p>}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4 text-xs">
                {c.phone_e164 && (
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={c.receives_sms} disabled={busy} onChange={(e) => toggleChannel(c, 'sms', e.target.checked)} />
                    Texts
                  </label>
                )}
                {c.email && (
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={c.receives_email} disabled={busy} onChange={(e) => toggleChannel(c, 'email', e.target.checked)} />
                    Emails
                  </label>
                )}
              </div>

              {verifying?.contactId === c.id && (
                <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 -mx-3 -mb-3 px-3 pb-3 rounded-b-lg">
                  <p className="text-xs text-slate-600 mb-2">
                    Enter the code we sent to your {verifying.channel === 'sms' ? 'phone' : 'email'} to turn this on.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button onClick={confirmVerify} disabled={busy || verifyCode.length !== 6} className="px-4 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      Confirm
                    </button>
                  </div>
                  {verifyError && <p className="text-red-600 text-xs mt-1">{verifyError}</p>}
                  <button onClick={() => setVerifying(null)} className="text-xs text-slate-400 mt-1">Cancel</button>
                </div>
              )}
            </div>
          ))}
          {contacts.length === 0 && !addingContact && <p className="text-sm text-slate-400">No contacts yet.</p>}
        </div>

        {addingContact && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3 space-y-2">
            <input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Role (spouse, office manager, etc.)" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="tel" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {contactError && <p className="text-red-600 text-xs">{contactError}</p>}
            <div className="flex gap-2">
              <button onClick={addContact} disabled={busy} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Saving…' : 'Save contact'}
              </button>
              <button onClick={() => { setAddingContact(false); setContactForm(EMPTY_CONTACT_FORM); setContactError('') }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-slate-800">Addresses</p>
          {!addingAddress && (
            <button onClick={() => { setAddingAddress(true); setAddressError('') }} className="text-sm text-blue-600 font-medium">
              + Add address
            </button>
          )}
        </div>

        <div className="space-y-2">
          {properties.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center gap-3">
              <div className="text-sm text-slate-800">
                {p.address}
                {p.is_primary && <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-slate-500">Primary</span>}
              </div>
              <div className="flex gap-3 shrink-0 text-xs">
                {!p.is_primary && <button onClick={() => patchProperty(p.id, 'set_primary')} className="text-blue-600 font-medium">Make primary</button>}
                {!p.is_primary && properties.length > 1 && <button onClick={() => patchProperty(p.id, 'deactivate')} className="text-red-600 font-medium">Remove</button>}
              </div>
            </div>
          ))}
          {properties.length === 0 && !addingAddress && <p className="text-sm text-slate-400">No addresses on file.</p>}
        </div>

        {addingAddress && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3 space-y-2">
            <AddressAutocomplete
              value={newAddress}
              onChange={(val) => { setNewAddress(val); setNewAddressValid(false) }}
              onSelect={() => setNewAddressValid(true)}
              placeholder="Street, city, state, ZIP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input placeholder="Apt / unit (optional)" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {addressError && <p className="text-red-600 text-xs">{addressError}</p>}
            <div className="flex gap-2">
              <button onClick={addAddress} disabled={busy} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Saving…' : 'Add'}
              </button>
              <button onClick={() => { setAddingAddress(false); setNewAddress(''); setNewUnit(''); setAddressError('') }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
