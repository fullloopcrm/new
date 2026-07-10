import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: `Dumpster Rental Blog | Guides & Tips | ${PHONE} | Florida Dumpster Rentals`,
  description: `The complete A-to-Z guide to dumpster rentals in Florida. 52 articles covering everything from sizing and pricing to hurricane cleanup and FL regulations. Call ${PHONE}.`,
  openGraph: {
    title: "Dumpster Rental Blog | Florida Dumpster Rentals",
    description: "52 guides covering dumpster rental basics and Florida project types from A to Z.",
    url: `${SITE_URL}/blog`,
  },
  alternates: { canonical: `${SITE_URL}/blog` },
};

const dumpsterAZ = [
  { letter: "A", title: "Asbestos and Hazardous Waste — What Can't Go in a Dumpster", slug: "asbestos-and-hazardous-waste-what-cant-go-in-a-dumpster" },
  { letter: "B", title: "Building Permits — When You Need One for Your Dumpster in Florida", slug: "building-permits-when-you-need-one-for-your-dumpster-in-florida" },
  { letter: "C", title: "Construction Dumpster Rental — Keeping Job Sites Clean and Compliant", slug: "construction-dumpster-rental-keeping-job-sites-clean-and-compliant" },
  { letter: "D", title: "Delivery Day — What to Expect When Your Dumpster Arrives", slug: "delivery-day-what-to-expect-when-your-dumpster-arrives" },
  { letter: "E", title: "Estate Cleanouts — How to Clear a Loved One's Home Efficiently", slug: "estate-cleanouts-how-to-clear-a-loved-ones-home-efficiently" },
  { letter: "F", title: "Flat-Rate Pricing — Why Transparent Dumpster Costs Matter", slug: "flat-rate-pricing-why-transparent-dumpster-costs-matter" },
  { letter: "G", title: "Garage Cleanouts — The Weekend Project That Changes Everything", slug: "garage-cleanouts-the-weekend-project-that-changes-everything" },
  { letter: "H", title: "Hurricane Debris Cleanup — Florida's Annual Dumpster Rush", slug: "hurricane-debris-cleanup-floridas-annual-dumpster-rush" },
  { letter: "I", title: "Insurance and Liability — Who's Responsible for the Dumpster on Your Property", slug: "insurance-and-liability-whos-responsible-for-the-dumpster-on-your-property" },
  { letter: "J", title: "Junk Removal vs Dumpster Rental — Which Is Right for Your Project", slug: "junk-removal-vs-dumpster-rental-which-is-right-for-your-project" },
  { letter: "K", title: "Kitchen Renovation — Demolition Debris and Dumpster Sizing", slug: "kitchen-renovation-demolition-debris-and-dumpster-sizing" },
  { letter: "L", title: "Landfill Regulations in Florida — Where Your Waste Actually Goes", slug: "landfill-regulations-in-florida-where-your-waste-actually-goes" },
  { letter: "M", title: "Moving Day Dumpsters — Declutter Before You Pack", slug: "moving-day-dumpsters-declutter-before-you-pack" },
  { letter: "N", title: "Neighborhood Rules and HOA Restrictions on Dumpsters in Florida", slug: "neighborhood-rules-and-hoa-restrictions-on-dumpsters-in-florida" },
  { letter: "O", title: "Overfilling Your Dumpster — Weight Limits and What Happens When You Exceed Them", slug: "overfilling-your-dumpster-weight-limits-and-what-happens" },
  { letter: "P", title: "Placement Tips — Where to Put Your Dumpster for Easy Loading", slug: "placement-tips-where-to-put-your-dumpster-for-easy-loading" },
  { letter: "Q", title: "Questions to Ask Before You Rent a Dumpster", slug: "questions-to-ask-before-you-rent-a-dumpster" },
  { letter: "R", title: "Roofing Tear-Offs — The Most Common Dumpster Rental Project in Florida", slug: "roofing-tear-offs-the-most-common-dumpster-rental-project-in-florida" },
  { letter: "S", title: "Same-Day Delivery — How Fast Dumpster Service Works in Florida", slug: "same-day-delivery-how-fast-dumpster-service-works-in-florida" },
  { letter: "T", title: "Ten Yard vs Twenty Yard vs Thirty Yard — Choosing the Right Size", slug: "ten-yard-vs-twenty-yard-vs-thirty-yard-choosing-the-right-size" },
  { letter: "U", title: "Understanding Your Rental Agreement — Terms, Fees, and Fine Print", slug: "understanding-your-rental-agreement-terms-fees-and-fine-print" },
  { letter: "V", title: "Vacant Property Cleanouts — Foreclosures, Flips, and Abandoned Homes", slug: "vacant-property-cleanouts-foreclosures-flips-and-abandoned-homes" },
  { letter: "W", title: "Weight Limits Explained — How Heavy Materials Affect Your Rental Cost", slug: "weight-limits-explained-how-heavy-materials-affect-your-rental-cost" },
  { letter: "X", title: "eXtra Rental Days — Extending Your Dumpster Rental Period", slug: "extra-rental-days-extending-your-dumpster-rental-period" },
  { letter: "Y", title: "Yard Waste Dumpsters — Palm Fronds, Branches, and Florida Landscaping", slug: "yard-waste-dumpsters-palm-fronds-branches-and-florida-landscaping" },
  { letter: "Z", title: "Zero Hidden Fees — What Flat-Rate Dumpster Pricing Really Means", slug: "zero-hidden-fees-what-flat-rate-dumpster-pricing-really-means" },
];

const projectsAZ = [
  { letter: "A", title: "Apartment Complex Cleanouts — Dumpster Rental for Property Managers", slug: "apartment-complex-cleanouts-dumpster-rental-for-property-managers" },
  { letter: "B", title: "Bathroom Renovation — Tearing Out Tile, Tubs, and Vanities", slug: "bathroom-renovation-tearing-out-tile-tubs-and-vanities" },
  { letter: "C", title: "Commercial Construction Waste — Managing Large-Scale Job Sites", slug: "commercial-construction-waste-managing-large-scale-job-sites" },
  { letter: "D", title: "Deck and Patio Demolition — Removing Outdoor Structures", slug: "deck-and-patio-demolition-removing-outdoor-structures" },
  { letter: "E", title: "Emergency Storm Cleanup — Getting a Dumpster After Disaster Strikes", slug: "emergency-storm-cleanup-getting-a-dumpster-after-disaster-strikes" },
  { letter: "F", title: "Fence Removal — Posts, Panels, and Disposal", slug: "fence-removal-posts-panels-and-disposal" },
  { letter: "G", title: "General Contractor Accounts — Volume Pricing and Priority Scheduling", slug: "general-contractor-accounts-volume-pricing-and-priority-scheduling" },
  { letter: "H", title: "Home Addition Projects — Managing Waste During Expansion", slug: "home-addition-projects-managing-waste-during-expansion" },
  { letter: "I", title: "Interior Demolition — Gutting Rooms Down to the Studs", slug: "interior-demolition-gutting-rooms-down-to-the-studs" },
  { letter: "J", title: "Job Site Waste Management — Best Practices for Builders", slug: "job-site-waste-management-best-practices-for-builders" },
  { letter: "K", title: "Kitchen Remodel Dumpsters — Cabinets, Countertops, and Appliances", slug: "kitchen-remodel-dumpsters-cabinets-countertops-and-appliances" },
  { letter: "L", title: "Landscaping Overhaul — Clearing Land and Removing Vegetation", slug: "landscaping-overhaul-clearing-land-and-removing-vegetation" },
  { letter: "M", title: "Multi-Family Property Cleanouts — Apartments, Condos, and Townhomes", slug: "multi-family-property-cleanouts-apartments-condos-and-townhomes" },
  { letter: "N", title: "New Construction Waste — From Foundation to Finishing", slug: "new-construction-waste-from-foundation-to-finishing" },
  { letter: "O", title: "Office Building Renovations — Commercial Dumpster Solutions", slug: "office-building-renovations-commercial-dumpster-solutions" },
  { letter: "P", title: "Pool Demolition — Removing an Inground Pool in Florida", slug: "pool-demolition-removing-an-inground-pool-in-florida" },
  { letter: "Q", title: "Quick Turnaround Projects — Weekend Dumpster Rentals", slug: "quick-turnaround-projects-weekend-dumpster-rentals" },
  { letter: "R", title: "Restaurant Buildout and Renovation Debris", slug: "restaurant-buildout-and-renovation-debris" },
  { letter: "S", title: "Storm Damage Restoration — Working With Insurance Companies", slug: "storm-damage-restoration-working-with-insurance-companies" },
  { letter: "T", title: "Tenant Eviction Cleanouts — Clearing Abandoned Units Fast", slug: "tenant-eviction-cleanouts-clearing-abandoned-units-fast" },
  { letter: "U", title: "Utility and Infrastructure Projects — Municipal Dumpster Needs", slug: "utility-and-infrastructure-projects-municipal-dumpster-needs" },
  { letter: "V", title: "Vehicle and Equipment Removal — What Counts as Acceptable Debris", slug: "vehicle-and-equipment-removal-what-counts-as-acceptable-debris" },
  { letter: "W", title: "Warehouse Cleanouts — Industrial-Scale Waste Removal", slug: "warehouse-cleanouts-industrial-scale-waste-removal" },
  { letter: "X", title: "eXterior Renovation — Siding, Stucco, and Facade Removal", slug: "exterior-renovation-siding-stucco-and-facade-removal" },
  { letter: "Y", title: "Year-Round Rental — Ongoing Dumpster Service for Businesses", slug: "year-round-rental-ongoing-dumpster-service-for-businesses" },
  { letter: "Z", title: "Zoning and Placement Laws — Florida Dumpster Regulations by County", slug: "zoning-and-placement-laws-florida-dumpster-regulations-by-county" },
];

export default function BlogPage() {
  const phonePlain = PHONE.replace(/-/g, "");

  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Blog", url: "/blog" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">52 Guides &middot; Two Series</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              The Complete
              <br /><span className="text-orange-400">Dumpster Rental Guide</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              Two complete A-to-Z series covering everything about dumpster rentals in Florida. From sizing and pricing to hurricane cleanup and project-specific guides. No fluff — just the knowledge you need to rent the right dumpster for the right project.
            </p>
          </div>
        </div>
      </section>

      {/* Dumpster Rental A-Z Series */}
      <section className="bg-stone-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Series 01</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Dumpster Rental A&ndash;Z</h2>
            <p className="mx-auto mt-3 max-w-2xl text-stone-400">26 guides covering every aspect of renting a dumpster in Florida — from hazardous waste rules and pricing to weight limits and HOA regulations.</p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dumpsterAZ.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950 p-4 transition-colors hover:border-orange-600/40 hover:bg-stone-900"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-sm font-bold text-white">
                  {post.letter}
                </span>
                <span className="text-sm font-medium leading-snug text-stone-300 group-hover:text-white">
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTAGroup variant="mid" />

      {/* Florida Projects A-Z Series */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">Series 02</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Florida Projects A&ndash;Z</h2>
            <p className="mx-auto mt-3 max-w-2xl text-stone-400">26 project-specific guides — from bathroom renovations and pool demolitions to storm cleanup and warehouse cleanouts. Every project type that needs a dumpster in Florida.</p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectsAZ.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950 p-4 transition-colors hover:border-orange-600/30 hover:bg-stone-900"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-400 text-sm font-bold text-black">
                  {post.letter}
                </span>
                <span className="text-sm font-medium leading-snug text-stone-300 group-hover:text-white">
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Knowledge Is Horsepower",
            body: "The more you know about dumpster rental before you call, the better deal you'll get and the smoother your project will go. These 52 guides cover everything we've learned from thousands of rentals across Florida. Read the ones that apply to your project.",
          },
          {
            title: "Share These With Your Contractor",
            body: "Contractors appreciate clients who've done their homework. Send your contractor the relevant guide before your project starts — you'll both be on the same page about sizing, timing, and what goes in (and what doesn't).",
          },
          {
            title: "Still Have Questions? Text Us",
            body: "We wrote 52 in-depth guides, but every project is a little different. If you've read the guides and still have questions, text or call us. We're always happy to talk dumpsters — somebody has to be passionate about this stuff, and it might as well be us.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
