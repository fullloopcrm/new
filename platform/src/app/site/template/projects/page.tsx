import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { getTenantFromHeaders, getTenantProjects, toSlug } from '@/lib/tenant-site'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import CTABlock from '@/app/site/template/_components/CTABlock'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const p = industryProfile(config.industry)
  const title = `${config.identity.name} — Our Work`
  const description = `Real ${p.serviceNoun} projects completed by ${config.identity.name} — see before-and-after results from our own jobs.`
  return {
    title,
    description,
    alternates: { canonical: `${config.identity.url}/projects` },
    openGraph: { title, description, url: `${config.identity.url}/projects` },
  }
}

/**
 * Projects portfolio — Phase 2C. Built for EVERY tenant regardless of
 * industry (Jeff's "build the structure, don't gate the data" instruction);
 * the nav link that points here is conditional
 * (industryProfile().isProjectLed in MarketingNav.tsx), but this route
 * itself never 404s on industry. Seeded empty by the tenant_projects
 * migration, so a brand-new tenant sees the intentional empty state below
 * until an admin adds real projects (no admin UI yet — data only, per plan).
 */
export default async function ProjectsIndexPage() {
  const config = await getSiteConfig()
  const p = industryProfile(config.industry)
  const tenant = await getTenantFromHeaders()
  const projects = tenant ? await getTenantProjects(tenant.id as string) : []

  return (
    <div>
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.25em] uppercase mb-4">Our Work</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Real {p.serviceLabel} Projects
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed">
            A look at recent {p.serviceNoun} jobs completed by {config.identity.name} — real before-and-after results, not stock photos.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Projects', href: '/projects' }]} />

        {projects.length === 0 ? (
          <div className="text-center py-20 md:py-28">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Coming Soon</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-4">
              We&apos;re Building Our Portfolio
            </p>
            <p className="text-gray-500 max-w-xl mx-auto">
              We&apos;re adding recent {p.serviceNoun} projects here soon. In the meantime, reach out and we&apos;ll be glad to share examples of our work directly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${toSlug(project.title)}`}
                className="group block border border-gray-200 rounded-2xl overflow-hidden hover:border-[var(--brand)] hover:shadow-md transition-all"
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  {project.after_photo_url ? (
                    // Dynamic, tenant-uploaded URLs — plain <img> (no next/image
                    // domain allowlist needed), same convention as ReviewsList.tsx.
                    <img src={project.after_photo_url} alt={project.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No photo yet</div>
                  )}
                  {project.before_photo_url && (
                    <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                      Before &amp; After
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide group-hover:underline underline-offset-4 mb-2">
                    {project.title}
                  </h2>
                  {project.description && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{project.description}</p>
                  )}
                  {project.completed_at && (
                    <p className="text-gray-400 text-xs mt-3 font-medium">
                      Completed {new Date(project.completed_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CTABlock
        title={`Ready to Start Your ${p.serviceLabel} Project?`}
        subtitle={`Tell us what you need and we'll scope it honestly, quote it up front, and get you on the calendar.`}
      />
    </div>
  )
}
