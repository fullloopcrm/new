'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Tenant } from './_settings-types'

interface SelenaTabProps {
  form: Partial<Tenant>
  setForm: Dispatch<SetStateAction<Partial<Tenant>>>
  selenaConfig: Record<string, unknown>
  setSelenaConfig: Dispatch<SetStateAction<Record<string, unknown>>>
  saveTenant: () => Promise<void>
  saveSelenaConfig: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Selena tab: the AI agent's full behavior config. Extracted verbatim from
// settings/page.tsx (previously the 'Selena' tab === branch).
export function SelenaTab({ form, setForm, selenaConfig, setSelenaConfig, saveTenant, saveSelenaConfig, saving, saved }: SelenaTabProps) {
  return (
    <div className="max-w-2xl space-y-6">

      {/* Section 1: General */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">General</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase tracking-wide">AI Enabled</label>
            <button
              type="button"
              onClick={() => setSelenaConfig({ ...selenaConfig, ai_enabled: !selenaConfig.ai_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.ai_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.ai_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Bot Name</label>
            <input
              type="text"
              value={form.agent_name || ''}
              placeholder="Jefe"
              onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Tone</label>
            <select
              value={(selenaConfig.tone as string) || 'warm_friendly'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, tone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="warm_friendly">Warm & friendly</option>
              <option value="professional_direct">Professional & direct</option>
              <option value="casual_fun">Casual & fun</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Emoji Usage</label>
            <select
              value={(selenaConfig.emoji_usage as string) || 'one_per_message'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, emoji_usage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="one_per_message">One per message</option>
              <option value="minimal">Minimal</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Language</label>
            <select
              value={(selenaConfig.language as string) || 'en'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, language: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="en">English only</option>
              <option value="en_es">Bilingual EN/ES</option>
              <option value="es">Spanish only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Services & Pricing */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Services & Pricing</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Pricing Display</label>
            <p className="text-xs text-slate-400 mb-2">Rows of label + price that {form.agent_name || 'Selena'} can reference</p>
            {((selenaConfig.pricing_rows as { label: string; price: string }[]) || [{ label: '', price: '' }]).map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Client provides supplies)"
                  value={row.label}
                  onChange={(e) => {
                    const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [{ label: '', price: '' }])]
                    rows[i] = { ...rows[i], label: e.target.value }
                    setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
                <input
                  type="text"
                  placeholder="$49/hr"
                  value={row.price}
                  onChange={(e) => {
                    const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [{ label: '', price: '' }])]
                    rows[i] = { ...rows[i], price: e.target.value }
                    setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                  }}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [])]
                    rows.splice(i, 1)
                    setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                  }}
                  className="text-red-400 hover:text-red-600 text-sm px-2"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [])]
                rows.push({ label: '', price: '' })
                setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
              }}
              className="text-teal-600 text-sm font-medium hover:text-teal-700"
            >
              + Add Pricing Row
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Time Estimates</label>
            <p className="text-xs text-slate-400 mb-2">Size label and estimated duration</p>
            {((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [{ size: '', estimate: '' }]).map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="1BR/1BA"
                  value={row.size}
                  onChange={(e) => {
                    const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [{ size: '', estimate: '' }])]
                    rows[i] = { ...rows[i], size: e.target.value }
                    setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
                <input
                  type="text"
                  placeholder="~2 hours"
                  value={row.estimate}
                  onChange={(e) => {
                    const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [{ size: '', estimate: '' }])]
                    rows[i] = { ...rows[i], estimate: e.target.value }
                    setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                  }}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [])]
                    rows.splice(i, 1)
                    setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                  }}
                  className="text-red-400 hover:text-red-600 text-sm px-2"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [])]
                rows.push({ size: '', estimate: '' })
                setSelenaConfig({ ...selenaConfig, time_estimates: rows })
              }}
              className="text-teal-600 text-sm font-medium hover:text-teal-700"
            >
              + Add Time Estimate
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Emergency Rate ($)</label>
            <input
              type="number"
              value={(selenaConfig.emergency_rate as number) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, emergency_rate: Number(e.target.value) })}
              placeholder="100"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase tracking-wide">Emergency Available</label>
            <button
              type="button"
              onClick={() => setSelenaConfig({ ...selenaConfig, emergency_available: !selenaConfig.emergency_available })}
              className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.emergency_available ? 'bg-teal-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.emergency_available ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Service Areas */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Service Areas</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Areas Served</label>
            <textarea
              rows={2}
              value={(selenaConfig.areas_served as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, areas_served: e.target.value })}
              placeholder="Manhattan, Brooklyn, Queens"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Areas Not Served</label>
            <textarea
              rows={2}
              value={(selenaConfig.areas_not_served as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, areas_not_served: e.target.value })}
              placeholder="Staten Island, Long Island"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Out-of-Area Response</label>
            <input
              type="text"
              value={(selenaConfig.out_of_area_response as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, out_of_area_response: e.target.value })}
              placeholder="Sorry, we don't serve that area yet!"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Booking Rules */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking Rules</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Arrival Buffer Weekday (minutes)</label>
            <input
              type="number"
              value={(selenaConfig.arrival_buffer_weekday as number) ?? 30}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, arrival_buffer_weekday: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Arrival Buffer Weekend (minutes)</label>
            <input
              type="number"
              value={(selenaConfig.arrival_buffer_weekend as number) ?? 60}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, arrival_buffer_weekend: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Minimum Booking Notice (hours)</label>
            <input
              type="number"
              value={(selenaConfig.min_booking_notice_hours as number) ?? 24}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, min_booking_notice_hours: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Cancellation Policy</label>
            <select
              value={(selenaConfig.cancellation_policy as string) || 'no_cancel_reschedule_only'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, cancellation_policy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="no_cancel_reschedule_only">No cancellation, reschedule only</option>
              <option value="24hr_notice">24hr notice</option>
              <option value="48hr_notice">48hr notice</option>
              <option value="7day_recurring">7 day notice for recurring</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Reschedule Policy</label>
            <select
              value={(selenaConfig.reschedule_policy as string) || 'anytime'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, reschedule_policy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="anytime">Anytime</option>
              <option value="24hr_notice">24hr notice</option>
              <option value="48hr_notice">48hr notice</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 5: Payment */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Accepted Methods</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {['Zelle', 'Apple Pay', 'Venmo', 'Cash', 'Check', 'Credit Card'].map((method) => {
                const key = method.toLowerCase().replace(/ /g, '_')
                const methods = (selenaConfig.accepted_payment_methods as string[]) || []
                return (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-900">
                    <input
                      type="checkbox"
                      checked={methods.includes(key)}
                      onChange={() => {
                        const current = [...methods]
                        if (current.includes(key)) {
                          setSelenaConfig({ ...selenaConfig, accepted_payment_methods: current.filter((m) => m !== key) })
                        } else {
                          setSelenaConfig({ ...selenaConfig, accepted_payment_methods: [...current, key] })
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    {method}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Payment Timing</label>
            <select
              value={(selenaConfig.payment_timing as string) || '15_before_completion'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, payment_timing: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="15_before_completion">15 minutes before completion</option>
              <option value="upon_completion">Upon completion</option>
              <option value="invoice_after">Invoice after</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Payment Instructions</label>
            <textarea
              rows={2}
              value={(selenaConfig.payment_instructions as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, payment_instructions: e.target.value })}
              placeholder="Zelle to hi@business.com or Apple Pay to 2125551234"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Section 6: Common Questions */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Common Questions</h3>
        <p className="text-xs text-slate-400 mb-3">Preset Q&A pairs {form.agent_name || 'Selena'} uses to answer common questions</p>
        <div className="space-y-3">
          {((selenaConfig.common_questions as { question: string; answer: string }[]) || [
            { question: 'Can I leave during the service?', answer: '' },
            { question: 'Do I need to be home?', answer: '' },
            { question: 'Same person every time?', answer: '' },
            { question: 'Are you insured?', answer: '' },
            { question: 'What supplies do you use?', answer: '' },
            { question: "What's included in the service?", answer: '' },
          ]).map((qa, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder="Question / trigger"
                value={qa.question}
                onChange={(e) => {
                  const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [
                    { question: 'Can I leave during the service?', answer: '' },
                    { question: 'Do I need to be home?', answer: '' },
                    { question: 'Same person every time?', answer: '' },
                    { question: 'Are you insured?', answer: '' },
                    { question: 'What supplies do you use?', answer: '' },
                    { question: "What's included in the service?", answer: '' },
                  ])]
                  rows[i] = { ...rows[i], question: e.target.value }
                  setSelenaConfig({ ...selenaConfig, common_questions: rows })
                }}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
              <input
                type="text"
                placeholder={`${form.agent_name || 'Selena'}'s response`}
                value={qa.answer}
                onChange={(e) => {
                  const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [
                    { question: 'Can I leave during the service?', answer: '' },
                    { question: 'Do I need to be home?', answer: '' },
                    { question: 'Same person every time?', answer: '' },
                    { question: 'Are you insured?', answer: '' },
                    { question: 'What supplies do you use?', answer: '' },
                    { question: "What's included in the service?", answer: '' },
                  ])]
                  rows[i] = { ...rows[i], answer: e.target.value }
                  setSelenaConfig({ ...selenaConfig, common_questions: rows })
                }}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [])]
                  rows.splice(i, 1)
                  setSelenaConfig({ ...selenaConfig, common_questions: rows })
                }}
                className="text-red-400 hover:text-red-600 text-sm px-2"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [])]
              rows.push({ question: '', answer: '' })
              setSelenaConfig({ ...selenaConfig, common_questions: rows })
            }}
            className="text-teal-600 text-sm font-medium hover:text-teal-700"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Section 7: Escalation */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Escalation</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Escalation Phone</label>
            <input
              type="text"
              value={(selenaConfig.escalation_phone as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, escalation_phone: e.target.value })}
              placeholder="Who gets the escalation text"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Escalation Email</label>
            <input
              type="text"
              value={(selenaConfig.escalation_email as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, escalation_email: e.target.value })}
              placeholder="escalation@business.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Auto-Escalate Triggers</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {[
                { key: 'client_upset', label: 'Client upset' },
                { key: 'damage_reported', label: 'Damage reported' },
                { key: 'unusual_request', label: 'Unusual request' },
                { key: 'asks_for_human', label: 'Asks for human' },
                { key: 'price_complaint', label: 'Price complaint' },
              ].map((trigger) => {
                const triggers = (selenaConfig.escalation_triggers as string[]) || []
                return (
                  <label key={trigger.key} className="flex items-center gap-2 text-sm text-slate-900">
                    <input
                      type="checkbox"
                      checked={triggers.includes(trigger.key)}
                      onChange={() => {
                        const current = [...triggers]
                        if (current.includes(trigger.key)) {
                          setSelenaConfig({ ...selenaConfig, escalation_triggers: current.filter((t) => t !== trigger.key) })
                        } else {
                          setSelenaConfig({ ...selenaConfig, escalation_triggers: [...current, trigger.key] })
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    {trigger.label}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Escalation Message</label>
            <input
              type="text"
              value={(selenaConfig.escalation_message as string) || 'Let me have someone look at this — one sec 😊'}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, escalation_message: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Section 8: Post-Booking */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Post-Booking</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Confirmation Message</label>
            <p className="text-xs text-slate-400 mb-1">Variables: {'{name}'}, {'{date}'}, {'{time}'}, {'{rate}'}, {'{address}'}</p>
            <textarea
              rows={3}
              value={(selenaConfig.confirmation_message as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, confirmation_message: e.target.value })}
              placeholder="Hi {name}, you're all set for {date} at {time}! See you at {address}."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase tracking-wide">Post-Job Follow-Up Enabled</label>
            <button
              type="button"
              onClick={() => setSelenaConfig({ ...selenaConfig, followup_enabled: !selenaConfig.followup_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.followup_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.followup_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Follow-Up Timing (hours after checkout)</label>
            <input
              type="number"
              value={(selenaConfig.followup_hours as number) ?? 24}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, followup_hours: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Google Review Link</label>
            <input
              type="text"
              value={(selenaConfig.google_review_link as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, google_review_link: e.target.value })}
              placeholder="https://g.page/r/..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase tracking-wide">Rating Request Enabled</label>
            <button
              type="button"
              onClick={() => setSelenaConfig({ ...selenaConfig, rating_request_enabled: !selenaConfig.rating_request_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.rating_request_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.rating_request_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide">Retention Text Enabled</label>
              <p className="text-xs text-slate-400">30-day re-engagement</p>
            </div>
            <button
              type="button"
              onClick={() => setSelenaConfig({ ...selenaConfig, retention_text_enabled: !selenaConfig.retention_text_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.retention_text_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.retention_text_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Retention Text Message</label>
            <textarea
              rows={2}
              value={(selenaConfig.retention_text_message as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, retention_text_message: e.target.value })}
              placeholder="Hey {name}! It's been a month — ready for another clean? 🧹"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Section 9: Checklist Fields */}
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Checklist Fields</h3>
        <p className="text-xs text-slate-400 mb-4">Define what {form.agent_name || 'Selena'} collects during intake and in what order</p>
        <div className="space-y-4">
          {((selenaConfig.checklist_fields as { key: string; enabled: boolean; required: boolean; question: string; quick_replies: string }[]) || [
            { key: 'service_type', enabled: true, required: true, question: 'What type of cleaning do you need?', quick_replies: 'Regular, Deep, Move-in/out, Airbnb, Emergency' },
            { key: 'bedrooms', enabled: true, required: true, question: 'How many bedrooms?', quick_replies: '1, 2, 3, 4+' },
            { key: 'bathrooms', enabled: true, required: true, question: 'How many bathrooms?', quick_replies: '1, 2, 3, 4+' },
            { key: 'rate', enabled: true, required: false, question: '(auto from pricing)', quick_replies: '' },
            { key: 'day', enabled: true, required: true, question: 'What day works best?', quick_replies: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun' },
            { key: 'time', enabled: true, required: true, question: 'What time?', quick_replies: '8am, 10am, 12pm, 2pm, 4pm' },
            { key: 'name', enabled: true, required: true, question: "What's your full name?", quick_replies: '' },
            { key: 'phone', enabled: true, required: true, question: 'Best phone number to reach you?', quick_replies: '' },
            { key: 'address', enabled: true, required: true, question: 'Full address with zip code?', quick_replies: '' },
            { key: 'email', enabled: true, required: false, question: 'Email address?', quick_replies: '' },
            { key: 'notes', enabled: true, required: false, question: 'Any special notes or instructions?', quick_replies: '' },
          ]).map((field, i) => {
            const defaults = [
              { key: 'service_type', enabled: true, required: true, question: 'What type of cleaning do you need?', quick_replies: 'Regular, Deep, Move-in/out, Airbnb, Emergency' },
              { key: 'bedrooms', enabled: true, required: true, question: 'How many bedrooms?', quick_replies: '1, 2, 3, 4+' },
              { key: 'bathrooms', enabled: true, required: true, question: 'How many bathrooms?', quick_replies: '1, 2, 3, 4+' },
              { key: 'rate', enabled: true, required: false, question: '(auto from pricing)', quick_replies: '' },
              { key: 'day', enabled: true, required: true, question: 'What day works best?', quick_replies: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun' },
              { key: 'time', enabled: true, required: true, question: 'What time?', quick_replies: '8am, 10am, 12pm, 2pm, 4pm' },
              { key: 'name', enabled: true, required: true, question: "What's your full name?", quick_replies: '' },
              { key: 'phone', enabled: true, required: true, question: 'Best phone number to reach you?', quick_replies: '' },
              { key: 'address', enabled: true, required: true, question: 'Full address with zip code?', quick_replies: '' },
              { key: 'email', enabled: true, required: false, question: 'Email address?', quick_replies: '' },
              { key: 'notes', enabled: true, required: false, question: 'Any special notes or instructions?', quick_replies: '' },
            ]
            const updateField = (updates: Partial<typeof field>) => {
              const rows = [...((selenaConfig.checklist_fields as typeof defaults) || defaults)]
              rows[i] = { ...rows[i], ...updates }
              setSelenaConfig({ ...selenaConfig, checklist_fields: rows })
            }
            return (
              <div key={field.key} className="border border-slate-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{field.key}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      Enabled
                      <button
                        type="button"
                        onClick={() => updateField({ enabled: !field.enabled })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${field.enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.enabled ? 'translate-x-4' : ''}`} />
                      </button>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      Required
                      <button
                        type="button"
                        onClick={() => updateField({ required: !field.required })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-teal-500' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.required ? 'translate-x-4' : ''}`} />
                      </button>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Question {form.agent_name || 'Selena'} Asks</label>
                  <input
                    type="text"
                    value={field.question}
                    onChange={(e) => updateField({ question: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">SMS Quick Reply Options (comma-separated)</label>
                  <input
                    type="text"
                    value={field.quick_replies}
                    onChange={(e) => updateField({ quick_replies: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <button onClick={async () => { await saveTenant(); await saveSelenaConfig() }} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

    </div>
  )
}
