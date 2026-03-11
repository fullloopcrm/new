'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface SocialAccount {
  id: string
  platform: string
  account_name: string
  connected_at: string
}

interface SocialPost {
  id: string
  platform: string
  content: string
  photo_url: string | null
  status: string
  created_at: string
}

export default function SocialPage() {
  const searchParams = useSearchParams()
  const connected = searchParams.get('connected')

  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook')
  const [message, setMessage] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  const [successBanner, setSuccessBanner] = useState(connected || '')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccounts()
    fetchPosts()
  }, [])

  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successBanner])

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/social/accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch {
      console.error('Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPosts() {
    try {
      const res = await fetch('/api/social/posts')
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {
      console.error('Failed to fetch posts')
    }
  }

  async function handleConnect(plat: 'facebook' | 'instagram') {
    const res = await fetch(`/api/social/connect/${plat}`)
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  async function handleDisconnect(plat: string) {
    if (!confirm(`Disconnect ${plat}?`)) return
    await fetch('/api/social/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: plat }),
    })
    setAccounts(prev => prev.filter(a => a.platform !== plat))
  }

  async function handlePost() {
    setError('')
    setPosting(true)
    try {
      const body: Record<string, string> = { platform }
      if (platform === 'facebook') {
        body.message = message
        if (photoUrl) body.photoUrl = photoUrl
      } else {
        body.caption = message
        body.imageUrl = photoUrl
      }

      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        setMessage('')
        setPhotoUrl('')
        setSuccessBanner(`Posted to ${platform}!`)
        fetchPosts()
      } else {
        setError(data.error || 'Failed to post')
      }
    } catch {
      setError('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const isConnected = (plat: string) => accounts.some(a => a.platform === plat)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Social Media</h1>

      {successBanner && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-lg">
          {successBanner === 'facebook' && 'Facebook connected successfully!'}
          {successBanner === 'instagram' && 'Instagram connected successfully!'}
          {!['facebook', 'instagram'].includes(successBanner) && successBanner}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Connected Accounts */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Connected Accounts</h2>

        {accounts.length === 0 ? (
          <p className="text-gray-500 text-sm">No accounts connected yet.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map(account => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">
                    {account.platform === 'facebook' ? 'FB' : account.platform === 'instagram' ? 'IG' : 'TK'}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900 capitalize">{account.platform}</p>
                    <p className="text-sm text-gray-500">{account.account_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(account.platform)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {!isConnected('facebook') && (
            <button
              onClick={() => handleConnect('facebook')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect Facebook
            </button>
          )}
          {!isConnected('instagram') && (
            <button
              onClick={() => handleConnect('instagram')}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-slate-900 text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              Connect Instagram
            </button>
          )}
        </div>
      </div>

      {/* Post Composer */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Create Post</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value as 'facebook' | 'instagram')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {platform === 'facebook' ? 'Message' : 'Caption'}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder={platform === 'facebook' ? 'What\'s on your mind?' : 'Write a caption...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Photo URL {platform === 'instagram' ? '(required)' : '(optional)'}
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <button
            onClick={handlePost}
            disabled={posting || !message || (platform === 'instagram' && !photoUrl)}
            className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Post History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Post History</h2>

        {posts.length === 0 ? (
          <p className="text-gray-500 text-sm">No posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                      {post.platform === 'facebook' ? 'FB' : post.platform === 'instagram' ? 'IG' : 'TK'}
                    </span>
                    <span className="text-sm font-medium text-slate-900 capitalize">{post.platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      post.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {post.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700">{post.content}</p>
                {post.photo_url && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{post.photo_url}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
