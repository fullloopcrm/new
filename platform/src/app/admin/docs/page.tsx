'use client'

import { useState } from 'react'

interface DocSection {
  id: string
  title: string
  content: string
}

const sections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `Welcome to FullLoop CRM — a multi-tenant platform for managing businesses, bookings, clients, reviews, and more.

**Quick Setup:**
1. Clone the repository and install dependencies with \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill in your Supabase, Stripe, and API keys
3. Run \`npm run dev\` to start the development server
4. Navigate to \`/admin\` to access the admin dashboard

**Key Concepts:**
- **Tenants** — Each business on the platform is a tenant with isolated data
- **Dashboard** — Tenant-level view at \`/dashboard\` scoped to the logged-in business
- **Admin** — Platform-level view at \`/admin\` for cross-tenant management
- **Plans** — Tenants subscribe to plans (Starter, Growth, Pro) which gate features

**Default Admin Access:**
Admin routes are protected. Only users with \`role = 'admin'\` in the auth metadata can access \`/admin\` pages.`,
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    content: `All API routes live under \`/api/\`. Admin routes are under \`/api/admin/\` and require admin auth.

**Admin Endpoints:**

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/admin/businesses\` | GET | List all tenants with stats |
| \`/api/admin/businesses/[id]\` | GET | Single tenant details |
| \`/api/admin/businesses/[id]\` | PUT | Update tenant settings |
| \`/api/admin/analytics\` | GET | Platform-wide analytics |
| \`/api/admin/ai\` | POST | Selena AI admin chat |
| \`/api/admin/announcements\` | GET/POST | Platform announcements |

**Dashboard Endpoints (tenant-scoped):**

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/google/status\` | GET | Google Business connection status |
| \`/api/google/reviews\` | GET | Fetch reviews for tenant |
| \`/api/google/auth\` | GET | Start Google OAuth flow |
| \`/api/social/accounts\` | GET | Connected social accounts |
| \`/api/social/posts\` | GET/POST | Social media posts |
| \`/api/bookings\` | GET/POST | Bookings CRUD |
| \`/api/clients\` | GET/POST | Clients CRUD |
| \`/api/team\` | GET/POST | Team members |

**Authentication:**
All API routes use Supabase Auth. The tenant is resolved from the authenticated user's metadata (\`tenant_id\`). Admin routes additionally check for \`role = 'admin'\`.`,
  },
  {
    id: 'onboarding',
    title: 'Onboarding Guide',
    content: `**Adding a New Tenant:**

1. Navigate to \`/admin/businesses\` and click "Add Business"
2. Fill in business name, industry, contact info, and plan
3. The system creates a tenant record and generates an onboarding link
4. Send the link to the business owner to complete signup

**Tenant Onboarding Flow:**
1. Business owner receives invite link
2. They create an account (email/password via Supabase Auth)
3. Their account is linked to the tenant
4. They land on \`/dashboard\` with a setup wizard

**Setup Wizard Steps:**
- Business details (name, address, phone, hours)
- Connect Google Business Profile (optional)
- Connect social media accounts (optional)
- Add team members
- Configure booking settings
- Set up services and pricing

**Post-Onboarding Checklist:**
- Verify Google Business Profile is syncing reviews
- Confirm auto-reply settings
- Check that booking notifications are working
- Review the client portal URL
- Set up any custom email templates`,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: `**Common Issues:**

**"Tenant not found" errors**
- Check that the user has a valid \`tenant_id\` in their auth metadata
- Verify the tenant exists in the \`tenants\` table and has \`status = 'active'\`

**Google Business Profile not syncing**
- Ensure OAuth tokens haven't expired — re-authorize if needed
- Check that the Google My Business API is enabled in the Cloud Console
- Verify the \`google_tokens\` table has valid refresh tokens

**Social media posts failing**
- Facebook: Check page access token hasn't expired (they last 60 days)
- Instagram: Requires a Facebook Page linked to the IG account
- TikTok: API access requires approved developer application

**Booking notifications not sending**
- Verify Twilio/SendGrid credentials in \`.env.local\`
- Check the \`notification_preferences\` table for the tenant
- Look at Vercel function logs for errors

**Admin dashboard showing stale data**
- Most admin views fetch fresh data on page load
- Clear browser cache if you see outdated counts
- Check Supabase dashboard for any database connection issues

**Deployment issues**
- Ensure all environment variables are set in Vercel
- Check build logs for TypeScript errors
- Run \`npm run build\` locally to catch issues before deploying

**Database migrations**
- Migrations are managed via Supabase SQL editor
- Always test migrations against a staging project first
- Back up data before running destructive migrations`,
  },
]

export default function AdminDocsPage() {
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']))

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => setExpandedSections(new Set(sections.map(s => s.id)))
  const collapseAll = () => setExpandedSections(new Set())

  const filtered = sections.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
  })

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const processInline = (line: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = line
      let key = 0

      while (remaining) {
        // Code
        const codeMatch = remaining.match(/`([^`]+)`/)
        if (codeMatch && codeMatch.index !== undefined) {
          if (codeMatch.index > 0) {
            parts.push(<span key={key++}>{processBold(remaining.slice(0, codeMatch.index))}</span>)
          }
          parts.push(
            <code key={key++} className="bg-gray-100 text-teal-700 px-1.5 py-0.5 rounded text-xs font-mono">
              {codeMatch[1]}
            </code>
          )
          remaining = remaining.slice(codeMatch.index + codeMatch[0].length)
          continue
        }
        parts.push(<span key={key++}>{processBold(remaining)}</span>)
        break
      }
      return parts
    }

    const processBold = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let key = 0
      while (remaining) {
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index))
          parts.push(<strong key={key++} className="font-semibold text-slate-900">{boldMatch[1]}</strong>)
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
          continue
        }
        parts.push(remaining)
        break
      }
      return parts
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim())
        if (!inTable) {
          inTable = true
          tableHeaders = cells
          continue
        }
        if (cells.every(c => /^[-:]+$/.test(c))) continue
        tableRows.push(cells)
        continue
      }

      // Flush table
      if (inTable) {
        elements.push(
          <div key={`table-${i}`} className="border border-gray-200 rounded-lg overflow-hidden mb-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  {tableHeaders.map((h, j) => (
                    <th key={j} className="px-3 py-2 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.map((row, j) => (
                  <tr key={j} className="hover:bg-gray-50">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2 text-gray-700">{processInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        inTable = false
        tableHeaders = []
        tableRows = []
      }

      if (!trimmed) {
        elements.push(<div key={i} className="h-2" />)
        continue
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
      if (numMatch) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-teal-600 font-semibold text-sm min-w-[1.25rem]">{numMatch[1]}.</span>
            <span className="text-sm text-gray-700">{processInline(numMatch[2])}</span>
          </div>
        )
        continue
      }

      // Bullet list
      if (trimmed.startsWith('- ')) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-teal-600 mt-1.5 text-[6px]">&#9679;</span>
            <span className="text-sm text-gray-700">{processInline(trimmed.slice(2))}</span>
          </div>
        )
        continue
      }

      // Regular paragraph
      elements.push(
        <p key={i} className="text-sm text-gray-700 mb-1">{processInline(trimmed)}</p>
      )
    }

    // Flush any remaining table
    if (inTable) {
      elements.push(
        <div key="table-end" className="border border-gray-200 rounded-lg overflow-hidden mb-3 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                {tableHeaders.map((h, j) => (
                  <th key={j} className="px-3 py-2 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((row, j) => (
                <tr key={j} className="hover:bg-gray-50">
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 text-gray-700">{processInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return elements
  }

  return (
    <main className="p-3 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">Internal knowledge base and reference guides</p>
      </div>

      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search documentation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none flex-1"
        />
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No results found</h3>
          <p className="text-gray-400 text-sm">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(section => {
            const isExpanded = expandedSections.has(section.id)
            return (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {renderMarkdown(section.content)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 bg-teal-50 border border-teal-100 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: 'Admin Dashboard', href: '/admin' },
            { label: 'All Businesses', href: '/admin/businesses' },
            { label: 'Google Profiles', href: '/admin/google-profile' },
            { label: 'Social Media', href: '/admin/social' },
            { label: 'Selena AI', href: '/admin/ai' },
            { label: 'Platform Settings', href: '/admin/settings' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-teal-100 text-sm text-teal-700 hover:bg-teal-100 transition-colors font-medium"
            >
              <span className="text-teal-600">&#8594;</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
