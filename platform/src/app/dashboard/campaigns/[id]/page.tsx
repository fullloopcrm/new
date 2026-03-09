'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Campaign = {
  id: string
  name: string
  type: string
  subject: string | null
  body: string | null
  status: string
  recipient_count: number | null
  open_count: number | null
  click_count: number | null
  sent_at: string | null
  created_at: string
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => setCampaign(data.campaign))
  }, [id])

  async function sendCampaign() {
    if (!confirm('Send this campaign to all eligible clients?')) return
    setSending(true)
    const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setCampaign((prev) => prev ? { ...prev, status: 'sent', recipient_count: data.sent, sent_at: new Date().toISOString() } : prev)
    }
    setSending(false)
  }

  async function deleteCampaign() {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    router.push('/dashboard/campaigns')
  }

  if (!campaign) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <Link href="/dashboard/campaigns" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
        &larr; All Campaigns
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <button onClick={sendCampaign} disabled={sending} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          )}
          <button onClick={deleteCampaign} className="px-4 py-2 text-sm text-red-400 border border-red-200 rounded-lg hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <dl className="space-y-3 text-sm mb-6">
              <div className="flex justify-between"><dt className="text-gray-400">Type</dt><dd className="uppercase">{campaign.type}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Status</dt><dd className="capitalize font-medium">{campaign.status}</dd></div>
              {campaign.subject && <div className="flex justify-between"><dt className="text-gray-400">Subject</dt><dd>{campaign.subject}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-400">Created</dt><dd>{new Date(campaign.created_at).toLocaleDateString()}</dd></div>
              {campaign.sent_at && <div className="flex justify-between"><dt className="text-gray-400">Sent</dt><dd>{new Date(campaign.sent_at).toLocaleString()}</dd></div>}
            </dl>

            <h3 className="font-semibold text-white mb-2">Message</h3>
            <div className="bg-gray-800/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {campaign.body || 'No body'}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Delivery Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Recipients</p>
                <p className="text-2xl font-bold text-white">{campaign.recipient_count ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Opens</p>
                <p className="text-2xl font-bold text-white">{campaign.open_count ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Clicks</p>
                <p className="text-2xl font-bold text-white">{campaign.click_count ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
