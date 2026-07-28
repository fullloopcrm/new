'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Tenant } from './_settings-types'

interface IntegrationsTabProps {
  form: Partial<Tenant>
  setForm: Dispatch<SetStateAction<Partial<Tenant>>>
  saveTenant: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Integrations tab: third-party API keys (email/SMS/payments/Google/IMAP/
// Selena/Deepgram/IndexNow). Extracted verbatim from settings/page.tsx
// (previously the 'Integrations' tab === branch).
export function IntegrationsTab({ form, setForm, saveTenant, saving, saved }: IntegrationsTabProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-6 space-y-6 max-w-2xl">
      <p className="text-xs text-slate-400">Connect your accounts to enable email, SMS, payments, and reviews. Sign up with each provider and paste your keys below.</p>

      {/* Email — Resend */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Email (Resend)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.resend_api_key ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {form.resend_api_key ? 'Connected' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Sign up at resend.com and create an API key.</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">API Key</label>
          <input value={form.resend_api_key || ''} onChange={(e) => setForm({ ...form, resend_api_key: e.target.value || null })} placeholder="re_xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Sending Domain</label>
            <input value={form.resend_domain || ''} onChange={(e) => setForm({ ...form, resend_domain: e.target.value || null })} placeholder="mail.yourbusiness.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">From Address</label>
            <input value={form.email_from || ''} onChange={(e) => setForm({ ...form, email_from: e.target.value || null })} placeholder="noreply@yourbusiness.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* SMS — Telnyx */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">SMS (Telnyx)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.telnyx_api_key && form.telnyx_phone ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {form.telnyx_api_key && form.telnyx_phone ? 'Connected' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Sign up at telnyx.com, create an API key, and purchase a phone number.</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">API Key</label>
          <input value={form.telnyx_api_key || ''} onChange={(e) => setForm({ ...form, telnyx_api_key: e.target.value || null })} placeholder="KEY_xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Phone Number</label>
          <input value={form.telnyx_phone || ''} onChange={(e) => setForm({ ...form, telnyx_phone: e.target.value || null })} placeholder="+12125551234" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      {/* Payments — Stripe */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Payments (Stripe)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.stripe_api_key ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {form.stripe_api_key ? 'Connected' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Sign up at stripe.com and copy your Secret Key from the Developers section.</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Secret Key</label>
          <input value={form.stripe_api_key || ''} onChange={(e) => setForm({ ...form, stripe_api_key: e.target.value || null })} placeholder="sk_live_xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      {/* Google Business */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Google Business</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.google_place_id ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {form.google_place_id ? 'Connected' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Place ID</label>
          <input value={form.google_place_id || ''} onChange={(e) => setForm({ ...form, google_place_id: e.target.value || null })} placeholder="ChIJxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      {/* IMAP — ComHub inbound client email */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Inbound Email (IMAP)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.imap_host && form.imap_user && form.imap_pass ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {form.imap_host && form.imap_user && form.imap_pass ? 'Connected' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Connect your business inbox — client emails flow into ComHub as threads and Yinez can auto-reply. Use an app password (e.g. imap.gmail.com).</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 block mb-1">IMAP Host</label>
            <input value={form.imap_host || ''} onChange={(e) => setForm({ ...form, imap_host: e.target.value || null })} placeholder="imap.gmail.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Port</label>
            <input type="number" value={form.imap_port ?? ''} onChange={(e) => setForm({ ...form, imap_port: e.target.value === '' ? null : Number(e.target.value) })} placeholder="993" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Email / Username</label>
            <input value={form.imap_user || ''} onChange={(e) => setForm({ ...form, imap_user: e.target.value || null })} placeholder="hi@yourbusiness.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">App Password</label>
            <input type="password" value={form.imap_pass || ''} onChange={(e) => setForm({ ...form, imap_pass: e.target.value || null })} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
        </div>
      </div>

      {/* Anthropic — Selena AI brain */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">{form.agent_name || 'Selena'} AI (Anthropic)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.anthropic_api_key ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
            {form.anthropic_api_key ? 'Using your key' : 'Using platform key'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Sign up at console.anthropic.com, generate a key. Leave blank to use the platform-billed key (charges roll into your monthly rate).</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Anthropic API Key</label>
          <input type="password" value={form.anthropic_api_key || ''} onChange={(e) => setForm({ ...form, anthropic_api_key: e.target.value || null })} placeholder="sk-ant-xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      {/* Deepgram — LoopCam video note transcription */}
      <div className="space-y-3 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Video Transcription (Deepgram)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.deepgram_api_key ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
            {form.deepgram_api_key ? 'Using your key' : 'Using platform key'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Sign up at console.deepgram.com, generate a key. Powers transcription for job video notes. Leave blank to use the platform-billed key.</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Deepgram API Key</label>
          <input type="password" value={form.deepgram_api_key || ''} onChange={(e) => setForm({ ...form, deepgram_api_key: e.target.value || null })} placeholder="xxxxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      {/* IndexNow — SEO instant indexing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">SEO (IndexNow)</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.indexnow_key ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {form.indexnow_key ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Generate a 32-char hex key at indexnow.org. Lets Bing/Yahoo/DuckDuckGo instantly index new content.</p>
        <div>
          <label className="text-sm text-slate-400 block mb-1">IndexNow Key</label>
          <input value={form.indexnow_key || ''} onChange={(e) => setForm({ ...form, indexnow_key: e.target.value || null })} placeholder="32-char hex key" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Integrations'}
      </button>
    </div>
  )
}
