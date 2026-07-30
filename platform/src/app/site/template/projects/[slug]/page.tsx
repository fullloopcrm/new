import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { getTenantFromHeaders, getTenantProjects, toSlug, type TenantProject } from '@/lib/tenant-site'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import CTABlock from '@/app/site/template/_components/CTABlock'

export const dynamic = 'force-dynamic'

async function findProject(slug: string): Promise<{ project: TenantProject | null; all: TenantProject[] }> {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return { project: null, all: [] }
  const all = await getTenantProjects(tenant.id as string)
  const project = all.find((p) => toSlug(p.title) === slug) || null
  return { project, all }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const config = await getSiteConfig()
  const { project } = await findProject(slug)
  if (!project) return {}
  const description = project.description || `${project.title} — completed by ${config.identity.name}.`
  return {
    title: `${project.title} | ${config.identity.name}`,
    description,
    alternates: { canonical: `${config.identity.url}/projects/${slug}` },
    openGraph: { title: project.title, description, url: `${config.identity.url}/projects/${slug}`, type: 'article' },
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await getSiteConfig()
  const p = industryProfile(config.industry)
  const { project, all } = await findProject(slug)
  if (!project) notFound()

  const more = all.filter((x) => x.id !== project.id).slice(0, 3)

  return (
    <div>
      <section className="bg-[var(--brand)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.25em] uppercase mb-4">Project</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide leading-[0.95] mb-4">
            {project.title}
          </h1>
          {project.completed_at && (
            <p className="text-blue-200/70 text-sm font-medium">
              Completed {new Date(project.completed_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Projects', href: '/projects' }, { name: project.title, href: `/projects/${slug}` }]} />

        {(project.before_photo_url || project.after_photo_url) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {project.before_photo_url && (
              <figure className="rounded-2xl overflow-hidden border border-gray-200">
                <img src={project.before_photo_url} alt={`${project.title} — before`} className="w-full aspect-[4/3] object-cover" />
                <figcaption className="text-center text-xs font-semibold tracking-widest uppercase text-gray-400 py-2">Before</figcaption>
              </figure>
            )}
            {project.after_photo_url && (
              <figure className="rounded-2xl overflow-hidden border border-gray-200">
                <img src={project.after_photo_url} alt={`${project.title} — after`} className="w-full aspect-[4/3] object-cover" />
                <figcaption className="text-center text-xs font-semibold tracking-widest uppercase text-gray-400 py-2">After</figcaption>
              </figure>
            )}
          </div>
        )}

        {project.description && (
          <p className="text-gray-600 text-lg leading-relaxed mb-12">{project.description}</p>
        )}

        {more.length > 0 && (
          <section className="border-t border-gray-100 pt-10">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-6">More {p.serviceLabel} Projects</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {more.map((m) => (
                <Link
                  key={m.id}
                  href={`/projects/${toSlug(m.title)}`}
                  className="group block border border-gray-200 rounded-xl overflow-hidden hover:border-[var(--brand)] transition-colors"
                >
                  <div className="aspect-[4/3] bg-gray-100">
                    {m.after_photo_url && (
                      <img src={m.after_photo_url} alt={m.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="p-3 text-sm font-semibold text-[var(--brand)] group-hover:underline underline-offset-2">{m.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <CTABlock
        title={`Want Results Like This?`}
        subtitle="Tell us what you need and we'll scope it honestly, quote it up front, and get you on the calendar."
      />
    </div>
  )
}
