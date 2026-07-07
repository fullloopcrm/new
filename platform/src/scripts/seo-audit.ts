// SIGNAL — LOCAL full-audit data puller for ONE property. Zero paid-API cost.
// Pulls Google Search Console (FREE): performance, striking-distance, CTR gaps,
// sitemaps, and live indexation for a sample of pages. No Serper, no Anthropic.
//
// Run:
//   npx tsx --env-file=.env.local src/scripts/seo-audit.ts                         # sunnyside
//   npx tsx --env-file=.env.local src/scripts/seo-audit.ts cleaningservicesunnysideny.com
import { querySearchAnalytics, listSitemaps, inspectUrl } from '@/lib/seo/gsc'

const domain = process.argv[2] || 'cleaningservicesunnysideny.com'
const property = `sc-domain:${domain}`

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function n(x: number | undefined, d = 0): string {
  return (x ?? 0).toLocaleString(undefined, { maximumFractionDigits: d })
}
function pct(x: number | undefined): string {
  return `${((x ?? 0) * 100).toFixed(1)}%`
}

async function main() {
  const end = new Date(Date.now() - 2 * 86_400_000)
  const start = new Date(end.getTime() - 28 * 86_400_000)
  const startDate = ymd(start)
  const endDate = ymd(end)
  console.log(`\n██ SEO AUDIT — ${domain}  (${startDate} → ${endDate}, 28d, GSC 'final')\n`)

  // 1. Site totals
  const totals = await querySearchAnalytics(property, { startDate, endDate, dimensions: [] })
  const t = totals[0]
  if (!t) {
    console.log('⚠ No GSC data for this property. Either not verified/granted, or zero traffic.')
  } else {
    console.log('──── TOTALS (28d) ────')
    console.log(
      `  clicks ${n(t.clicks)}   impressions ${n(t.impressions)}   ctr ${pct(
        t.ctr,
      )}   avg pos ${n(t.position, 1)}`,
    )
  }

  // 2. Top queries
  const queries = await querySearchAnalytics(property, {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: 250,
  })
  const byImpr = [...queries].sort((a, b) => b.impressions - a.impressions)
  console.log('\n──── TOP 20 QUERIES (by impressions) ────')
  console.log('  impr   clicks  ctr     pos   query')
  for (const r of byImpr.slice(0, 20)) {
    console.log(
      `  ${n(r.impressions).padStart(5)}  ${n(r.clicks).padStart(5)}  ${pct(r.ctr).padStart(
        6,
      )}  ${n(r.position, 1).padStart(4)}  ${r.keys?.[0] ?? ''}`,
    )
  }

  // 3. Striking distance — winnable now (pos 5-20, real demand)
  const striking = byImpr
    .filter((r) => r.position >= 5 && r.position <= 20 && r.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions)
  console.log(`\n──── STRIKING DISTANCE — pos 5-20, impr≥5 (${striking.length}) ────`)
  console.log('  impr   clicks  pos   query')
  for (const r of striking.slice(0, 25)) {
    console.log(
      `  ${n(r.impressions).padStart(5)}  ${n(r.clicks).padStart(5)}  ${n(r.position, 1).padStart(
        4,
      )}  ${r.keys?.[0] ?? ''}`,
    )
  }

  // 4. CTR gaps — ranking top-10 but few/no clicks (title/meta problem)
  const ctrGap = byImpr
    .filter((r) => r.position <= 10 && r.impressions >= 20 && r.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
  console.log(`\n──── CTR GAPS — top-10 rank, impr≥20, ctr<2% (${ctrGap.length}) ────`)
  console.log('  impr   ctr     pos   query')
  for (const r of ctrGap.slice(0, 20)) {
    console.log(
      `  ${n(r.impressions).padStart(5)}  ${pct(r.ctr).padStart(6)}  ${n(r.position, 1).padStart(
        4,
      )}  ${r.keys?.[0] ?? ''}`,
    )
  }

  // 5. Top pages
  const pages = await querySearchAnalytics(property, {
    startDate,
    endDate,
    dimensions: ['page'],
    rowLimit: 250,
  })
  const pagesByImpr = [...pages].sort((a, b) => b.impressions - a.impressions)
  console.log(`\n──── TOP 20 PAGES (by impressions, ${pages.length} pages with data) ────`)
  console.log('  impr   clicks  ctr     pos   page')
  for (const r of pagesByImpr.slice(0, 20)) {
    console.log(
      `  ${n(r.impressions).padStart(5)}  ${n(r.clicks).padStart(5)}  ${pct(r.ctr).padStart(
        6,
      )}  ${n(r.position, 1).padStart(4)}  ${(r.keys?.[0] ?? '').replace(`https://${domain}`, '')}`,
    )
  }

  // 6. Sitemaps
  console.log('\n──── SITEMAPS ────')
  try {
    const sms = await listSitemaps(property)
    if (!sms.length) console.log('  ⚠ No sitemaps submitted in GSC.')
    for (const s of sms) {
      console.log(
        `  ${s.path}  (downloaded ${s.lastDownloaded ?? '?'}, pending ${s.isPending ?? false}, errors ${
          s.errors ?? 0
        }, warnings ${s.warnings ?? 0})`,
      )
    }
  } catch (e) {
    console.log(`  (sitemap fetch failed: ${e instanceof Error ? e.message : e})`)
  }

  // 7. Indexation — inspect homepage + top pages sample (free URL Inspection API)
  const sampleUrls = [
    `https://${domain}/`,
    ...pagesByImpr.slice(0, 6).map((r) => r.keys?.[0]).filter((u): u is string => !!u),
  ]
  const uniq = [...new Set(sampleUrls)]
  console.log(`\n──── INDEXATION (URL Inspection on ${uniq.length} URLs) ────`)
  for (const u of uniq) {
    try {
      const insp = await inspectUrl(property, u)
      console.log(
        `  ${insp.verdict ?? '?'} · ${insp.coverageState ?? '?'} · ${
          u.replace(`https://${domain}`, '') || '/'
        }`,
      )
    } catch (e) {
      console.log(`  (inspect failed for ${u}: ${e instanceof Error ? e.message : e})`)
    }
  }

  console.log('\nDone. No paid APIs called.\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('AUDIT ERROR:', e)
  process.exit(1)
})
