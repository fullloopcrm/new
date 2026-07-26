'use client'

// Shared between BookingsAdmin.tsx's edit modal ("+ Add new address" on an
// EXISTING client) and CreateBookingForm.tsx's create flow ("+ New Client",
// which lands here too once the client row exists, plus its own "+ Add new
// address"). Extracted verbatim so both stay in sync instead of drifting.
import '../clients/clients.css'
import { useState } from 'react'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import ClientContacts from '../clients/client-contacts'
import ClientAddresses from '../clients/client-addresses'
import { formatPhone } from '@/lib/format'

interface Referrer { id: string; name: string; ref_code: string; active: boolean }
interface SalesPartner { id: string; name: string; referral_code: string; active: boolean }
export interface NewClientResult { id: string; name: string; phone: string }

export interface NewClientModalProps {
  // Set when opened for an EXISTING client (edit modal's "+ Add new address",
  // or right after CreateBookingForm's own "+ New Client" submit) -- skips
  // straight to the add-contacts/address step instead of the blank form.
  initialClientId?: string | null
  initialClientName?: string
  referrers: Referrer[]
  salesPartners: SalesPartner[]
  // Fires once a brand-new client row is created (create-flow only --
  // BookingsAdmin's edit modal never hits the blank form, so never passes this).
  onCreated?: (client: NewClientResult) => void
  onDone: () => void
}

export default function NewClientModal({ initialClientId, initialClientName, referrers, salesPartners, onCreated, onDone }: NewClientModalProps) {
  const [clientId, setClientId] = useState<string | null>(initialClientId ?? null)
  const [clientName, setClientName] = useState(initialClientName || '')
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', sales_partner_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleNewClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const fullAddress = newClientForm.unit
      ? `${newClientForm.address}, ${newClientForm.unit}`
      : newClientForm.address
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientForm.name, phone: newClientForm.phone, email: newClientForm.email, address: fullAddress, referrer_id: newClientForm.referrer_id || null, sales_partner_id: newClientForm.sales_partner_id || null, notes: newClientForm.notes || null })
    })
    if (res.ok) {
      // API responds { client: {...} }, not the bare row -- see route.ts:184.
      const { client: newClient } = await res.json()
      setClientId(newClient.id)
      setClientName(newClient.name)
      onCreated?.(newClient)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-[rgba(28,28,28,0.5)] flex items-center justify-center z-[10001]" onClick={onDone}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {clientId ? (
          <>
            <h3 className="text-lg font-semibold text-[var(--sched-ink)] mb-1">
              {clientName || newClientForm.name || 'Client'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add another phone, email, or address, or continue — you can always add more later.
            </p>
            <div className="clients-scope">
              <div className="clients-section">
                <ClientAddresses clientId={clientId} />
                <ClientContacts clientId={clientId} />
              </div>
            </div>
            <button type="button" onClick={onDone} className="w-full mt-6 px-4 py-2 bg-[var(--sched-ink)] text-white rounded-lg">
              Continue to booking
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-[var(--sched-ink)] mb-4">New Client</h3>
            <form onSubmit={handleNewClientSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={newClientForm.name} onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]" placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]" placeholder="john@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" required value={newClientForm.phone} onChange={(e) => setNewClientForm({ ...newClientForm, phone: formatPhone(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]" placeholder="212-555-1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <AddressAutocomplete value={newClientForm.address} onChange={(val) => setNewClientForm({ ...newClientForm, address: val })} placeholder="123 Main St, New York, NY 10001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Apt</label>
                <input type="text" value={newClientForm.unit} onChange={(e) => setNewClientForm({ ...newClientForm, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]" placeholder="Apt 4B" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
                <select value={newClientForm.sales_partner_id} onChange={(e) => setNewClientForm({ ...newClientForm, sales_partner_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]">
                  <option value="">None</option>
                  {salesPartners.filter(sp => sp.active).map(sp => <option key={sp.id} value={sp.id}>{sp.name} ({sp.referral_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                <select value={newClientForm.referrer_id} onChange={(e) => setNewClientForm({ ...newClientForm, referrer_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]">
                  <option value="">None</option>
                  {referrers.filter(ref => ref.active).map(ref => <option key={ref.id} value={ref.id}>{ref.name} ({ref.ref_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={newClientForm.notes} onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[var(--sched-ink)]" rows={3} placeholder="Any special instructions..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onDone} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-[var(--sched-ink)] text-white rounded-lg">{saving ? '...' : 'Create'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
