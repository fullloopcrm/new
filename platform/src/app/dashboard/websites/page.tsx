'use client'

import { useEffect, useState } from 'react'

interface TenantSettings {
  domain: string | null
  domain_name: string | null
  dns_configured: boolean
  email_domain_verified: boolean
  website_published: boolean
  website_url: string | null
}

export default function WebsitesPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          domain: data.domain || null,
          domain_name: data.domain_name || null,
          dns_configured: data.dns_configured || false,
          email_domain_verified: data.email_domain_verified || false,
          website_published: data.website_published || false,
          website_url: data.website_url || null,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 py-8 text-center">Loading...</p>

  const checks = [
    { label: 'Domain configured', done: !!(settings?.domain || settings?.domain_name), detail: settings?.domain || settings?.domain_name || 'No domain set' },
    { label: 'DNS configured', done: settings?.dns_configured || false, detail: settings?.dns_configured ? 'DNS records verified' : 'DNS not configured — point your domain to Vercel' },
    { label: 'Email domain verified', done: settings?.email_domain_verified || false, detail: settings?.email_domain_verified ? 'Emails send from your domain' : 'Not verified — emails send from default domain' },
    { label: 'Website published', done: settings?.website_published || false, detail: settings?.website_published ? 'Your website is live' : 'Website not yet published' },
  ]

  const completedCount = checks.filter(c => c.done).length

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-4">Website</h1>

      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border-l-4 border-l-teal-500 pl-3 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Setup Progress</p>
          <p className="text-xl font-bold font-mono text-slate-900">{completedCount}/{checks.length}</p>
        </div>
        <div className="border-l-4 border-l-blue-500 pl-3 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Domain</p>
          <p className="text-sm font-medium text-slate-900 truncate">{settings?.domain || settings?.domain_name || '—'}</p>
        </div>
        <div className={`border-l-4 ${settings?.website_published ? 'border-l-green-500' : 'border-l-yellow-500'} pl-3 py-2`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Status</p>
          <p className="text-sm font-medium text-slate-900">{settings?.website_published ? 'Live' : 'Not Published'}</p>
        </div>
        <div className={`border-l-4 ${settings?.dns_configured ? 'border-l-green-500' : 'border-l-slate-300'} pl-3 py-2`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">DNS</p>
          <p className="text-sm font-medium text-slate-900">{settings?.dns_configured ? 'Verified' : 'Pending'}</p>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="border border-slate-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-heading font-semibold text-slate-900 mb-4">Website Setup</h2>
        <div className="space-y-3">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${check.done ? 'bg-green-50 border border-green-300' : 'border border-slate-300'}`}>
                {check.done && (
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm ${check.done ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>{check.label}</p>
                <p className="text-xs text-slate-400">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Website URL */}
      {settings?.website_url && (
        <div className="border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-heading font-semibold text-slate-900 mb-2">Your Website</h2>
          <a href={settings.website_url} target="_blank" rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 text-sm underline">{settings.website_url}</a>
        </div>
      )}

      {!settings?.website_published && (
        <div className="border border-slate-200 rounded-lg p-5 mt-4 text-center">
          <p className="text-slate-500 text-sm mb-3">Your website template is ready. Contact your admin to configure your domain and publish.</p>
          <a href="/dashboard/settings" className="text-teal-600 hover:text-teal-700 text-sm font-medium">Go to Settings</a>
        </div>
      )}
    </div>
  )
}
