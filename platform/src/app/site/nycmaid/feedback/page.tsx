'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { formatPhone } from '@/lib/format'

function FeedbackForm() {
  useEffect(() => { document.title = 'Leave Feedback | The NYC Maid' }, [])
  const searchParams = useSearchParams()
  const source = searchParams.get('from') || 'Email Link'

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [smsConsent, setSmsConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    if (!anonymous && phone.trim() && !smsConsent) {
      setError('Please check the SMS consent box, or leave phone blank / go anonymous.')
      return
    }
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/client-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          source,
          name: anonymous ? null : name.trim() || null,
          phone: anonymous ? null : phone.trim() || null,
          sms_consent: anonymous ? false : smsConsent,
        })
      })
      if (!res.ok) {
        setError('Failed to submit. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[#1E2A4A] mb-1">Leave Feedback</h1>
        <p className="text-gray-500 text-sm mb-6">
          What you loved, what we could&apos;ve done better, or anything you&apos;d like to see from us — all feedback is welcome.
        </p>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[#A8F0DC]/40 flex items-center justify-center mx-auto mb-3 text-2xl">🙏</div>
            <p className="text-gray-700 font-medium mb-1">Thank you!</p>
            <p className="text-gray-500 text-sm">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1E2A4A] focus:ring-[#1E2A4A]/30"
              />
              <span className="text-sm text-gray-600">Prefer to stay anonymous?</span>
            </label>

            {!anonymous && (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[#1E2A4A] text-sm focus:outline-none focus:border-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A]/10"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="Phone"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[#1E2A4A] text-sm focus:outline-none focus:border-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A]/10"
                />
              </div>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Loved something? Frustrated by something? Want to see something new? Tell us..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[#1E2A4A] text-sm resize-none focus:outline-none focus:border-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A]/10"
              rows={5}
              required
            />

            {!anonymous && phone.trim() && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-gray-600">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="mt-1 min-w-[18px] min-h-[18px]"
                  />
                  <span>
                    By checking this box, I consent to receive transactional text messages from <strong>The NYC Maid</strong> for follow-up on this feedback. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply.{' '}
                    <a href="https://www.thenycmaid.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline">Privacy Policy</a>{' '}|{' '}
                    <a href="https://www.thenycmaid.com/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline">Terms &amp; Conditions</a>
                  </span>
                </label>
              </div>
            )}

            {error && <p className="text-red-600 text-xs mt-3">{error}</p>}

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full mt-4 py-3 bg-[#1E2A4A] text-white rounded-xl font-medium hover:bg-[#1E2A4A]/90 transition-colors disabled:bg-gray-300"
            >
              {sending ? 'Sending...' : 'Submit Feedback'}
            </button>
            {anonymous && (
              <p className="text-xs text-gray-400 text-center mt-3">
                No personal information is collected or attached.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackForm />
    </Suspense>
  )
}
