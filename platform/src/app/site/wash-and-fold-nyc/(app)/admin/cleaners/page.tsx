// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'

import SidePanel from '@/app/site/wash-and-fold-nyc/_components/SidePanel'
import { SERVICE_ZONES } from '@/app/site/wash-and-fold-nyc/_lib/service-zones'
import dynamic from 'next/dynamic'
const CoverageMap = dynamic(() => import('@/app/site/wash-and-fold-nyc/_components/CoverageMap'), { ssr: false })
import AddressAutocomplete from '@/app/site/wash-and-fold-nyc/_components/AddressAutocomplete'

// Compress image client-side before upload (max 1200px, JPEG quality 0.8)
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    // Skip if already small enough
    if (file.size < 500_000) { resolve(file); return }
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        const scale = Math.min(MAX / w, MAX / h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.8)
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

interface Schedule {
  [day: string]: { start: string; end: string } | null
}

interface Cleaner {
  id: string
  name: string
  email: string
  phone: string
  address: string | null
  working_days: string[]
  schedule: Schedule | null
  unavailable_dates: string[]
  pin: string | null
  hourly_rate: number | null
  active: boolean
  priority: number | null
  photo_url: string | null
  max_jobs_per_day?: number | null
  service_zones?: string[]
  has_car?: boolean
  home_by_time?: string
  created_at?: string
}

interface Application {
  id: string
  name: string
  email: string | null
  phone: string
  address: string | null
  experience: string | null
  availability: string | null
  notes: string | null
  photo_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

interface MgmtApplication {
  id: string
  name: string
  email: string
  phone: string
  location: string | null
  years_experience: string | null
  bilingual: string | null
  availability_start: string | null
  photo_url: string | null
  video_url: string | null
  resume_url: string | null
  notes: string | null
  status: 'pending' | 'reviewed' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM'
]

export default function CleanersPage() {
  useEffect(() => { document.title = 'Team | The NYC Wash and Fold Service Company' }, []);
  const [activeTab, setActiveTab] = useState<'team' | 'applications' | 'ops-manager'>('team')
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [mgmtApplications, setMgmtApplications] = useState<MgmtApplication[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    unit: '',
    working_days: [] as string[],
    schedule: {} as Schedule,
    unavailable_dates: [] as string[],
    pin: '',
    hourly_rate: 25,
    active: true,
    photo_url: '' as string,
    max_jobs_per_day: null as number | null,
    service_zones: [] as string[],
    has_car: false,
    home_by_time: '18:00',
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [newDateOff, setNewDateOff] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    loadCleaners()
    loadApplications()
    loadMgmtApplications()
  }, [])

  const loadCleaners = async () => {
    const res = await fetch('/api/cleaners')
    if (res.ok) {
      const data = await res.json()
      // Show all cleaners (active first, then inactive)
      setCleaners(data.sort((a: Cleaner, b: Cleaner) => Number(b.active) - Number(a.active)))
    }
  }

  const loadApplications = async () => {
    try {
      const res = await fetch('/api/cleaner-applications')
      if (res.ok) setApplications(await res.json())
    } catch (err) {
      console.error('Failed to load applications:', err)
    }
  }

  const loadMgmtApplications = async () => {
    try {
      const res = await fetch('/api/management-applications')
      if (res.ok) setMgmtApplications(await res.json())
    } catch (err) {
      console.error('Failed to load management applications:', err)
    }
  }

  const handleMgmtStatus = async (id: string, status: string) => {
    if (status === 'rejected' && !confirm('Reject this application?')) return
    await fetch('/api/management-applications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    })
    loadMgmtApplications()
  }

  const handlePhotoUpload = async (rawFile: File, cleanerId?: string) => {
    setUploadingPhoto(true)
    try {
      const file = await compressImage(rawFile)
      const formData = new FormData()
      formData.append('file', file)
      if (cleanerId) formData.append('cleaner_id', cleanerId)
      const res = await fetch('/api/cleaners/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setForm(f => ({ ...f, photo_url: data.url }))
        if (cleanerId) loadCleaners()
      } else {
        alert(data.error || 'Failed to upload photo')
      }
    } catch (err) {
      alert('Failed to upload photo: ' + (err instanceof Error ? err.message : 'unknown error'))
    }
    setUploadingPhoto(false)
  }

  const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const fullAddress = form.unit
      ? `${form.address}, ${form.unit}`
      : form.address

    // Strip past dates from unavailable_dates
    const today = new Date().toISOString().split('T')[0]
    const futureDates = form.unavailable_dates.filter(d => d >= today)

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: fullAddress || null,
      working_days: form.working_days,
      schedule: form.schedule,
      unavailable_dates: futureDates,
      pin: form.pin,
      hourly_rate: form.hourly_rate,
      active: form.active,
      photo_url: form.photo_url || null,
      max_jobs_per_day: form.max_jobs_per_day || null,
      service_zones: form.service_zones,
      has_car: form.has_car,
      home_by_time: form.home_by_time,
    }

    let error: string | null = null
    if (editingId) {
      const res = await fetch(`/api/cleaners/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        error = err.error || 'Failed to update'
      }
    } else {
      const res = await fetch('/api/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        error = err.error || 'Failed to create'
      } else if (form.email) {
        fetch('/api/send-booking-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cleaner-welcome', cleaner: { name: form.name, email: form.email, pin: form.pin, phone: form.phone } })
        })
      }
    }

    if (error) {
      alert('Error saving: ' + error)
      return
    }

    setShowModal(false)
    setEditingId(null)
    setForm({ name: '', email: '', phone: '', address: '', unit: '', working_days: [], schedule: {}, unavailable_dates: [], pin: '', hourly_rate: 25, active: true, photo_url: '', max_jobs_per_day: null, service_zones: [], has_car: false, home_by_time: '18:00' })
    setNewDateOff('')
    loadCleaners()
  }

  const handleEdit = (cleaner: Cleaner) => {
    setEditingId(cleaner.id)
    setForm({
      name: cleaner.name,
      email: cleaner.email || '',
      phone: cleaner.phone,
      address: cleaner.address || '',
      unit: '',
      working_days: cleaner.working_days || [],
      schedule: cleaner.schedule || {},
      unavailable_dates: cleaner.unavailable_dates || [],
      pin: cleaner.pin || '',
      hourly_rate: cleaner.hourly_rate || 25,
      active: cleaner.active,
      photo_url: cleaner.photo_url || '',
      max_jobs_per_day: cleaner.max_jobs_per_day || null,
      service_zones: cleaner.service_zones || [],
      has_car: cleaner.has_car || false,
      home_by_time: cleaner.home_by_time || '18:00',
    })
    setNewDateOff('')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this team member? This cannot be undone.')) {
      const res = await fetch(`/api/cleaners/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadCleaners()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Failed to delete'))
      }
    }
  }

  const handleApproveApplication = async (app: Application) => {
    // Create cleaner from application
    const pin = generatePin()
    const res = await fetch('/api/cleaners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: app.name,
        email: app.email,
        phone: app.phone,
        address: app.address,
        pin,
        hourly_rate: 25,
        active: true,
        working_days: [],
        schedule: {},
        photo_url: app.photo_url || null,
        service_zones: (app as any).service_zones || [],
        has_car: (app as any).has_car || false,
      })
    })

    if (!res.ok) {
      const err = await res.json()
      alert('Error creating team member: ' + (err.error || 'Failed'))
      return
    }

    // Update application status
    await fetch('/api/cleaner-applications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status: 'approved' })
    })

    // Send welcome email
    if (app.email) {
      fetch('/api/send-booking-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cleaner-welcome', cleaner: { name: app.name, email: app.email, pin, phone: app.phone } })
      })
    }

    loadCleaners()
    loadApplications()
  }

  const handleRejectApplication = async (id: string) => {
    if (!confirm('Reject this application?')) return
    await fetch('/api/cleaner-applications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'rejected' })
    })
    loadApplications()
  }

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Delete this application permanently?')) return
    await fetch(`/api/cleaner-applications?id=${id}`, { method: 'DELETE' })
    loadApplications()
  }

  const toggleDay = (day: string) => {
    if (form.working_days.includes(day)) {
      setForm({
        ...form,
        working_days: form.working_days.filter(d => d !== day),
        schedule: { ...form.schedule, [day]: null }
      })
    } else {
      setForm({
        ...form,
        working_days: [...form.working_days, day],
        schedule: { ...form.schedule, [day]: { start: '9:00 AM', end: '5:00 PM' } }
      })
    }
  }

  const updateSchedule = (day: string, field: 'start' | 'end', value: string) => {
    const current = form.schedule[day] || { start: '9:00 AM', end: '5:00 PM' }
    setForm({
      ...form,
      schedule: {
        ...form.schedule,
        [day]: {
          start: field === 'start' ? value : current.start,
          end: field === 'end' ? value : current.end
        }
      }
    })
  }

  const handlePhoneChange = (phone: string) => {
    setForm({ ...form, phone })
  }

  const formatScheduleDisplay = (cleaner: Cleaner) => {
    if (!cleaner.schedule || Object.keys(cleaner.schedule).length === 0) {
      return cleaner.working_days?.join(', ') || '-'
    }

    const activeDays = DAYS.filter(d => cleaner.schedule?.[d])
    if (activeDays.length === 0) return '-'

    const firstDay = cleaner.schedule[activeDays[0]]
    const allSame = activeDays.every(d =>
      cleaner.schedule?.[d]?.start === firstDay?.start &&
      cleaner.schedule?.[d]?.end === firstDay?.end
    )

    if (allSame && firstDay) {
      return `${activeDays.join(', ')} (${firstDay.start}-${firstDay.end})`
    }

    return activeDays.map(d => {
      const s = cleaner.schedule?.[d]
      return s ? `${d} ${s.start}-${s.end}` : d
    }).join(', ')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getScheduleDays = (cleaner: Cleaner) => {
    if (!cleaner.schedule || Object.keys(cleaner.schedule).length === 0) {
      return cleaner.working_days || []
    }
    return DAYS.filter(d => cleaner.schedule?.[d])
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'Z')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const draggedIndex = cleaners.findIndex(c => c.id === draggedId)
    const targetIndex = cleaners.findIndex(c => c.id === targetId)

    // Reorder locally
    const newCleaners = [...cleaners]
    const [draggedItem] = newCleaners.splice(draggedIndex, 1)
    newCleaners.splice(targetIndex, 0, draggedItem)
    setCleaners(newCleaners)

    // Save new priorities to API
    const priorities = newCleaners.map((c, i) => ({ id: c.id, priority: i + 1 }))
    await fetch('/api/cleaners/priority', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priorities })
    })

    setDraggedId(null)
    setDragOverId(null)
  }

  const pendingApps = applications.filter(a => a.status === 'pending')

  return (
    <>
      <main className="p-3 md:p-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-semibold text-[#1E2A4A]">Team</h2>
          <button
            onClick={() => {
              setEditingId(null)
              setForm({ name: '', email: '', phone: '', address: '', unit: '', working_days: [], schedule: {}, unavailable_dates: [], pin: generatePin(), hourly_rate: 25, active: true, photo_url: '', max_jobs_per_day: null, service_zones: [], has_car: false, home_by_time: '18:00' })
              setShowModal(true)
            }}
            className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90"
          >
            Add Team Member
          </button>
        </div>
        <div className="text-sm text-gray-500 mb-4">
          Team portal: <a href="https://www.washandfoldnyc.com/team" target="_blank" className="text-[#1E2A4A] hover:underline py-2 inline-block">washandfoldnyc.com/team</a> ·
          Client portal: <a href="https://www.washandfoldnyc.com/book" target="_blank" className="text-[#1E2A4A] hover:underline ml-1 py-2 inline-block">washandfoldnyc.com/book</a> ·
          Apply form: <a href="https://www.washandfoldnyc.com/apply" target="_blank" className="text-[#1E2A4A] hover:underline ml-1 py-2 inline-block">washandfoldnyc.com/apply</a> ·
          Ops Admin: <a href="https://www.washandfoldnyc.com/apply/operations-coordinator" target="_blank" className="text-[#1E2A4A] hover:underline ml-1 py-2 inline-block">washandfoldnyc.com/apply/operations-coordinator</a>
        </div>
        <CoverageMap />

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 px-1 ${activeTab === 'team' ? 'border-b-2 border-[#1E2A4A] font-semibold' : 'text-gray-500'}`}
          >
            Team ({cleaners.filter(c => c.active).length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 px-1 ${activeTab === 'applications' ? 'border-b-2 border-[#1E2A4A] font-semibold' : 'text-gray-500'}`}
          >
            Applications {pendingApps.length > 0 && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{pendingApps.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('ops-manager')}
            className={`pb-3 px-1 ${activeTab === 'ops-manager' ? 'border-b-2 border-[#1E2A4A] font-semibold' : 'text-gray-500'}`}
          >
            Ops Admin {mgmtApplications.filter(a => a.status === 'pending').length > 0 && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{mgmtApplications.filter(a => a.status === 'pending').length}</span>}
          </button>
        </div>

        {activeTab === 'ops-manager' ? (
          <div className="space-y-4">
            {mgmtApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No coordinator applications yet. Share the link: <a href="https://www.washandfoldnyc.com/apply/operations-coordinator" className="text-[#1E2A4A]">washandfoldnyc.com/apply/operations-coordinator</a>
              </div>
            ) : (
              <>
                {mgmtApplications.filter(a => a.status === 'pending').length > 0 && (
                  <div className="bg-white rounded-lg border border-orange-200">
                    <div className="p-4 border-b bg-orange-50">
                      <h3 className="font-semibold text-[#1E2A4A]">Pending Ops Manager Applications ({mgmtApplications.filter(a => a.status === 'pending').length})</h3>
                    </div>
                    <div className="divide-y">
                      {mgmtApplications.filter(a => a.status === 'pending').map(app => (
                        <div key={app.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              {app.photo_url ? (
                                <img src={app.photo_url} alt={app.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                                  👤
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-[#1E2A4A]">{app.name}</p>
                                <p className="text-sm text-gray-600">{app.phone} · {app.email}</p>
                                {app.location && <p className="text-sm text-gray-500">📍 {app.location}</p>}
                                <p className="text-sm text-gray-500 mt-1">
                                  {app.years_experience && <span className="mr-3">Experience: {app.years_experience}</span>}
                                  {app.bilingual && <span className="mr-3">Bilingual: {app.bilingual}</span>}
                                  {app.availability_start && <span>Start: {app.availability_start}</span>}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {app.video_url && (
                                    <a href={app.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">
                                      🎥 Watch Video
                                    </a>
                                  )}
                                  {app.resume_url && (
                                    <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100">
                                      📄 Resume
                                    </a>
                                  )}
                                </div>
                                {app.notes && <p className="text-sm text-gray-500 mt-2 italic">&quot;{app.notes}&quot;</p>}
                                <p className="text-xs text-gray-400 mt-2">Applied {formatDate(app.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMgmtStatus(app.id, 'reviewed')}
                                className="px-3 py-2.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Mark Reviewed
                              </button>
                              <button
                                onClick={() => handleMgmtStatus(app.id, 'rejected')}
                                className="px-3 py-2.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mgmtApplications.filter(a => a.status !== 'pending').length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-[#1E2A4A]">Past Applications</h3>
                    </div>
                    <div className="divide-y">
                      {mgmtApplications.filter(a => a.status !== 'pending').map(app => (
                        <div key={app.id} className="p-4 flex justify-between items-center">
                          <div className="flex gap-3 items-center">
                            {app.photo_url ? (
                              <img src={app.photo_url} alt={app.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm">👤</div>
                            )}
                            <div>
                              <p className="font-medium text-[#1E2A4A]">{app.name}</p>
                              <p className="text-sm text-gray-500">{app.phone} · {app.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {app.video_url && (
                              <a href={app.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">🎥 Video</a>
                            )}
                            {app.resume_url && (
                              <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs hover:underline">📄 Resume</a>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs ${app.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {app.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'team' ? (
          cleaners.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No team members yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {cleaners.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onDragOver={(e) => handleDragOver(e, c.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, c.id)}
                  className={`bg-white rounded-xl border border-gray-200 p-5 cursor-move transition-all hover:shadow-md hover:border-gray-300 ${
                    draggedId === c.id ? 'opacity-50 scale-95' : ''
                  } ${dragOverId === c.id ? 'border-[#A8F0DC] bg-[#A8F0DC]/5 shadow-md' : ''} ${!c.active ? 'opacity-60' : ''}`}
                >
                  {/* Card Header: Avatar + Name + Status */}
                  <div className="flex items-start gap-3 mb-4">
                    {c.photo_url ? (
                      <img
                        src={c.photo_url}
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1E2A4A] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">{getInitials(c.name)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1E2A4A] text-sm truncate">{c.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${c.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className={`text-xs ${c.active ? 'text-green-700' : 'text-gray-500'}`}>
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {/* Drag handle */}
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Phone</p>
                      <p className="text-xs text-[#1E2A4A] font-medium mt-0.5">{c.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Rate</p>
                      <p className="text-xs text-[#1E2A4A] font-medium mt-0.5">${(c.hourly_rate || 25).toFixed(2)}/hr</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">PIN</p>
                      <p className="text-xs text-[#1E2A4A] font-mono mt-0.5">{c.pin || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Days</p>
                      <p className="text-xs text-[#1E2A4A] font-medium mt-0.5">
                        {getScheduleDays(c).length > 0 ? `${getScheduleDays(c).length} days/wk` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Schedule Bar */}
                  <div className="flex gap-0.5 mb-4">
                    {DAYS.map(day => {
                      const isActive = getScheduleDays(c).includes(day)
                      return (
                        <div
                          key={day}
                          className={`flex-1 text-center py-1 rounded text-xs font-medium ${
                            isActive ? 'bg-[#1E2A4A] text-white' : 'bg-gray-100 text-gray-400'
                          }`}
                          title={isActive && c.schedule?.[day] ? `${c.schedule[day]!.start} - ${c.schedule[day]!.end}` : undefined}
                        >
                          {day.charAt(0)}
                        </div>
                      )
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => handleEdit(c)}
                      className="flex-1 px-3 py-2.5 text-xs font-medium text-[#1E2A4A] bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-3 py-2.5 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {pendingApps.length === 0 && applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No applications yet. Share the apply link: <a href="https://www.washandfoldnyc.com/apply" className="text-[#1E2A4A]">washandfoldnyc.com/apply</a>
              </div>
            ) : (
              <>
                {pendingApps.length > 0 && (
                  <div className="bg-white rounded-lg border border-orange-200">
                    <div className="p-4 border-b bg-orange-50">
                      <h3 className="font-semibold text-[#1E2A4A]">Pending Applications ({pendingApps.length})</h3>
                    </div>
                    <div className="divide-y">
                      {pendingApps.map(app => (
                        <div key={app.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              {app.photo_url ? (
                                <img src={app.photo_url} alt={app.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                                  👤
                                </div>
                              )}
                            <div>
                              <p className="font-semibold text-[#1E2A4A]">{app.name}</p>
                              <p className="text-sm text-gray-600">{app.phone} · {app.email || 'No email'}</p>
                              {app.address && <p className="text-sm text-gray-500">📍 {app.address}</p>}
                              <p className="text-sm text-gray-500 mt-1">
                                {app.experience && <span className="mr-3">Experience: {app.experience}</span>}
                                {app.availability && <span>Availability: {app.availability}</span>}
                              </p>
                              {app.notes && <p className="text-sm text-gray-500 mt-1 italic">&quot;{app.notes}&quot;</p>}
                              <p className="text-xs text-gray-400 mt-2">Applied {formatDate(app.created_at)}</p>
                            </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveApplication(app)}
                                className="px-3 py-2.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Approve & Add
                              </button>
                              <button
                                onClick={() => handleRejectApplication(app.id)}
                                className="px-3 py-2.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => { if (confirm('Delete this application?')) handleDeleteApplication(app.id) }}
                                className="px-3 py-2.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {applications.filter(a => a.status !== 'pending').length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-[#1E2A4A]">Past Applications</h3>
                    </div>
                    <div className="divide-y">
                      {applications.filter(a => a.status !== 'pending').map(app => (
                        <div key={app.id} className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-[#1E2A4A]">{app.name}</p>
                            <p className="text-sm text-gray-500">{app.phone}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {app.status}
                            </span>
                            <button
                              onClick={() => handleDeleteApplication(app.id)}
                              className="text-gray-400 hover:text-red-600 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </main>

      {showModal && (
        <SidePanel open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={`${editingId ? 'Edit' : 'Add'} Team Member`} width="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="2125551234"
                  required
                  value={form.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Address</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(val) => setForm({ ...form, address: val })}
                  placeholder="123 Main St, Brooklyn, NY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Unit / Apt</label>
                <input
                  type="text"
                  placeholder="Apt 4B"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Photo</label>
                <div className="flex items-center gap-3">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="Photo" className="w-16 h-16 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
                      👤
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-[#1E2A4A] hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploadingPhoto ? 'Uploading...' : form.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file, editingId || undefined)
                        e.target.value = ''
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">PIN</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="6-digit PIN"
                      value={form.pin}
                      onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] font-mono text-center tracking-widest"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, pin: generatePin() })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      title="Generate new PIN"
                    >
                      🔄
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">For team portal login</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Hourly Rate</label>
                  <div className="flex items-center">
                    <span className="text-[#1E2A4A] text-lg mr-1">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="99.99"
                      value={form.hourly_rate}
                      onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-center font-mono"
                      placeholder="25.00"
                    />
                    <span className="text-[#1E2A4A] ml-1">/hr</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Pay rate per hour worked</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Max Jobs/Day</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.max_jobs_per_day || ''}
                    onChange={(e) => setForm({ ...form, max_jobs_per_day: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank for unlimited</p>
                </div>
              </div>

              {/* Service Zones */}
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-2">Service Zones</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SERVICE_ZONES.map(zone => (
                    <label key={zone.id} className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-xs">
                      <input
                        type="checkbox"
                        checked={form.service_zones.includes(zone.id)}
                        onChange={(e) => setForm({ ...form, service_zones: e.target.checked ? [...form.service_zones, zone.id] : form.service_zones.filter(z => z !== zone.id) })}
                        className="w-3.5 h-3.5 rounded border-gray-300"
                      />
                      <span className="text-[#1E2A4A]">{zone.label}</span>
                      {zone.car_required && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">Car</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Car + Home By */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={form.has_car} onChange={(e) => setForm({ ...form, has_car: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                  <span className="text-sm text-[#1E2A4A]">Drives</span>
                </label>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Home by</label>
                  <input type="time" value={form.home_by_time} onChange={(e) => setForm({ ...form, home_by_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#1E2A4A]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-2">Schedule</label>
                <p className="text-xs text-gray-500 mb-3">Select working days, then set hours</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        form.working_days.includes(day)
                          ? 'bg-[#1E2A4A] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {form.working_days.length > 0 && (
                  <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                    {DAYS.filter(d => form.working_days.includes(d)).map(day => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-10 text-sm font-medium text-[#1E2A4A]">{day}</span>
                        <select
                          value={form.schedule[day]?.start || '9:00 AM'}
                          onChange={(e) => updateSchedule(day, 'start', e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                        >
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400">to</span>
                        <select
                          value={form.schedule[day]?.end || '5:00 PM'}
                          onChange={(e) => updateSchedule(day, 'end', e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                        >
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-2">Days Off</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={newDateOff}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewDateOff(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newDateOff) return
                      const today = new Date().toISOString().split('T')[0]
                      if (newDateOff < today) return
                      if (!form.unavailable_dates.includes(newDateOff)) {
                        setForm({ ...form, unavailable_dates: [...form.unavailable_dates, newDateOff].sort() })
                      }
                      setNewDateOff('')
                    }}
                    className="px-4 py-2 bg-gray-100 text-[#1E2A4A] rounded-lg font-medium hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                {form.unavailable_dates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.unavailable_dates.map(date => (
                      <span key={date} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, unavailable_dates: form.unavailable_dates.filter(d => d !== date) })}
                          className="ml-1 text-red-400 hover:text-red-600 font-bold"
                        >&times;</button>
                      </span>
                    ))}
                  </div>
                )}
                {form.unavailable_dates.length === 0 && (
                  <p className="text-xs text-gray-500">No days off scheduled</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Status</label>
                <select
                  value={form.active ? 'active' : 'inactive'}
                  onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90"
                >
                  Save
                </button>
              </div>
            </form>
        </SidePanel>
      )}
    </>
  )
}
