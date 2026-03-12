'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    zip_code: '',
    team_size: 'solo',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set Up Your Business</h1>
        <p className="text-gray-500 text-sm mb-8">
          Tell us about your business and we&apos;ll get your dashboard ready in seconds.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Sparkle Cleaning NYC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="hello@yourbusiness.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select
              required
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select your industry...</option>
              <option value="cleaning">Cleaning / Maid Service</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="hvac">HVAC</option>
              <option value="landscaping">Landscaping / Lawn Care</option>
              <option value="painting">Painting</option>
              <option value="roofing">Roofing</option>
              <option value="pest_control">Pest Control</option>
              <option value="handyman">Handyman</option>
              <option value="moving">Moving / Hauling</option>
              <option value="pressure_washing">Pressure Washing</option>
              <option value="pool_service">Pool Service</option>
              <option value="carpet_cleaning">Carpet Cleaning</option>
              <option value="window_cleaning">Window Cleaning</option>
              <option value="junk_removal">Junk Removal</option>
              <option value="locksmith">Locksmith</option>
              <option value="appliance_repair">Appliance Repair</option>
              <option value="tree_service">Tree Service</option>
              <option value="flooring">Flooring</option>
              <option value="fencing">Fencing</option>
              <option value="garage_door">Garage Door</option>
              <option value="concrete">Concrete</option>
              <option value="remodeling">Remodeling</option>
              <option value="restoration">Restoration</option>
              <option value="solar">Solar</option>
              <option value="snow_removal">Snow Removal</option>
              <option value="smart_home">Smart Home</option>
              <option value="home_inspection">Home Inspection</option>
              <option value="multi_service">Multi-Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input
                type="text"
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="10001"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
              <select
                value={form.team_size}
                onChange={(e) => setForm({ ...form, team_size: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="solo">Just me</option>
                <option value="2-5">2-5 people</option>
                <option value="6-15">6-15 people</option>
                <option value="16+">16+</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !form.name || !form.industry}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
          >
            {saving ? 'Creating your account...' : 'Create My Business'}
          </button>
        </form>
      </div>
    </div>
  )
}
