// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { states, services, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK, SITE_EMAIL } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";

export const metadata: Metadata = {
  title: "Corporate Stretch Service | Office Wellness Programs | All 50 States | $99/hr",
  description: "Corporate stretch service for offices nationwide. On-site employee wellness programs reduce injuries 50%, boost productivity 25%, cut healthcare costs. Custom corporate rates. Weekly, monthly, event-based programs. All 50 states.",
  alternates: { canonical: `${SITE_URL}/corporate-wellness` },
};

const benefits = [
  { title: "Reduce Workplace Injuries", desc: "Regular stretch service reduces musculoskeletal injuries by up to 50%. Fewer sick days, fewer workers&apos; comp claims, healthier employees. The Bureau of Labor Statistics reports that musculoskeletal disorders account for 33% of all workplace injuries — our corporate stretch service targets the exact movement patterns that cause these injuries. Companies that implement on-site stretch service programs see dramatic reductions in repetitive strain injuries, carpal tunnel syndrome, and chronic back pain claims within the first 90 days." },
  { title: "Boost Productivity", desc: "Employees who receive regular stretch service report 15-25% higher afternoon productivity. A stretched team is a productive team. Research from the American Journal of Health Promotion shows that workplace wellness programs including stretching produce $3.27 in reduced medical costs and $2.73 in reduced absenteeism for every dollar spent. When your employees take a 15-minute stretch break, they return to their desks with renewed focus, energy, and mental clarity that lasts for hours." },
  { title: "Improve Morale & Retention", desc: "On-site wellness programs show employees you care about their health. Corporate stretch service is a powerful retention and recruitment tool in competitive markets. According to the Society for Human Resource Management, 89% of employees at companies with wellness programs report higher job satisfaction. In a job market where top talent has options, offering unique perks like professional stretch service sets your company apart and reduces costly turnover." },
  { title: "Reduce Stress & Burnout", desc: "Professional stretching releases physical tension and triggers parasympathetic relaxation responses. Your team will handle deadlines and pressure with greater resilience. Cortisol levels drop measurably after just one 15-minute stretch session. For high-pressure industries like finance, tech, and law, corporate stretch service provides a critical pressure valve that keeps your best performers from burning out." },
  { title: "Better Posture & Ergonomics", desc: "Desk workers develop chronic posture issues from hours of sitting and screen time. Corporate stretch service corrects the muscular imbalances that cause rounded shoulders, forward head posture, and lower back pain. Our therapists assess each employee&apos;s posture and create targeted stretch protocols that undo the damage of desk work. Over time, employees develop better postural awareness that carries into every hour of their workday." },
  { title: "Zero Disruption to Your Workday", desc: "We come to your office and set up in any available space — a conference room, break room, lobby, or open area. Sessions are quick and efficient. Employees return to work feeling refreshed, not drained. Our therapists arrive with all necessary equipment, set up in under 5 minutes, and work through your team on a rotating schedule. There&apos;s no commute, no gym membership, and no lost productivity from employees leaving the building." },
];

const programTypes = [
  {
    name: "Weekly On-Site Stretch Service",
    desc: "Recurring weekly sessions at your office are the cornerstone of an effective corporate stretch service program. Your dedicated therapist arrives at the same time each week, sets up in your designated wellness space, and provides 15-30 minute individual stretch sessions for employees throughout the day. Consistency is key — weekly stretch service allows your therapist to track each employee&apos;s progress, address developing issues before they become injuries, and build customized stretch protocols for team members with specific needs. Most companies schedule 4-8 hours of therapist time per week, allowing 16-32 employees to receive individual sessions. The recurring nature of weekly programs produces the strongest ROI: companies report that injury rates drop most dramatically after 8-12 weeks of consistent weekly stretch service.",
    ideal: "Companies with 20+ employees wanting consistent, high-impact wellness programming with measurable results.",
  },
  {
    name: "Monthly Wellness Day",
    desc: "A dedicated wellness day once a month where our team of stretch therapists descends on your office to provide stretch service sessions for all employees. Monthly wellness days create an event-like atmosphere that employees look forward to. We typically bring 2-4 therapists depending on your team size, set up multiple stations, and cycle through your entire staff during the workday. Combine stretch sessions with lunch-and-learn presentations about ergonomics, desk stretches employees can do on their own, and self-care techniques. Monthly wellness days are an excellent starting point for companies exploring corporate stretch service — they provide a taste of the benefits without a weekly commitment, and the data from monthly programs often convinces leadership to upgrade to weekly sessions.",
    ideal: "Companies wanting regular wellness perks and team morale boosts without weekly commitment.",
  },
  {
    name: "Event & Team Building Stretch Service",
    desc: "One-time stretch events for team offsites, company retreats, product launches, wellness fairs, or holiday parties. Our event-based stretch service is interactive, energizing, and memorable. We can set up individual stretch stations, lead group mobility workshops, or combine both formats for maximum engagement. Team building stretch events work brilliantly because they&apos;re inclusive — every fitness level can participate, and the shared experience of professional stretching creates genuine bonding moments. We&apos;ve provided stretch service at tech company hackathons, law firm retreats, warehouse safety days, and startup launch parties. Events can be held at your office, a park, a hotel conference room, or any venue.",
    ideal: "Companies hosting events, retreats, wellness fairs, or looking for unique team-building activities.",
  },
  {
    name: "Executive Wellness Program",
    desc: "Private 60-minute stretch service sessions for executives and leadership teams, scheduled at their convenience in their office or a private conference room. Executive wellness is about peak performance — your C-suite and senior leaders carry enormous physical and mental stress that manifests as chronic neck tension, lower back pain, and decreased energy. Our executive stretch service addresses these issues with premium, one-on-one sessions that combine assisted stretching, myofascial release, and mobility work tailored to each executive&apos;s specific needs. Sessions are confidential and scheduled around their calendar. Many executives use their stretch service session as a mid-day reset that sharpens their decision-making and energy for the afternoon.",
    ideal: "C-suite executives, senior leadership, and high-performers wanting personal wellness support.",
  },
  {
    name: "Warehouse & Labor Stretch Service",
    desc: "For companies with physical labor forces — warehouses, manufacturing plants, construction sites, and distribution centers — our stretch service program is designed to reduce the musculoskeletal injuries that cost these industries billions annually. Pre-shift stretch sessions prepare workers&apos; bodies for the physical demands ahead: lifting, bending, reaching, and repetitive motions. Post-shift sessions address the accumulated strain and prevent chronic injuries from developing. Our therapists understand industrial ergonomics and design stretch protocols specific to the physical demands of each role. OSHA data shows that companies implementing pre-shift stretching programs reduce injury rates by 50-70% and workers&apos; compensation costs by 40%. For warehouse and labor companies, corporate stretch service isn&apos;t a luxury — it&apos;s a critical safety investment.",
    ideal: "Warehouses, manufacturing plants, distribution centers, and any company with physical labor demands.",
  },
  {
    name: "Remote & Hybrid Team Stretch Service",
    desc: "For companies with remote or hybrid workforces, our stretch service program brings wellness to employees wherever they work. For hybrid teams, we provide on-site stretch service on office days — making in-office days more attractive and reinforcing the value of coming to the workplace. For fully remote teams, we offer virtual stretch workshops led by our certified therapists via video call, guiding employees through targeted stretch routines they can do at their home desks. We also coordinate in-person stretch service sessions for remote employees in major cities when teams gather for quarterly meetings or retreats. The remote workforce faces unique challenges: home office ergonomics are often poor, employees sit for longer hours without the natural movement breaks of an office environment, and isolation can increase physical tension. Our hybrid stretch service program addresses all of these issues.",
    ideal: "Remote-first companies, hybrid workplaces, and distributed teams wanting inclusive wellness programming.",
  },
];

const industries = [
  {
    name: "Technology & Startups",
    desc: "Tech workers spend 10+ hours daily at screens, developing chronic neck pain (\"tech neck\"), carpal tunnel syndrome, and lower back issues. Tech companies are also fiercely competitive for talent — offering corporate stretch service as a perk helps attract and retain top engineers, designers, and product managers. Our stretch service integrates seamlessly into tech office culture: we set up in open floor plans, common areas, or wellness rooms, and employees sign up for slots via a shared calendar. Many tech companies start with monthly wellness days and upgrade to weekly programs after seeing the impact on their team&apos;s energy and productivity.",
  },
  {
    name: "Finance & Banking",
    desc: "Financial professionals work under extreme pressure with long hours at trading desks, in client meetings, and hunched over spreadsheets. The physical toll manifests as chronic neck tension, shoulder pain, and stress-related ailments. Corporate stretch service provides a critical release valve for high-performing financial teams. We work with investment banks, hedge funds, private equity firms, accounting firms, and fintech companies. Our therapists understand the demanding schedules of finance professionals and offer flexible scheduling — early morning sessions before market open, lunch breaks, or end-of-day decompression stretches.",
  },
  {
    name: "Healthcare & Medical",
    desc: "Healthcare workers — nurses, doctors, technicians, and administrative staff — face unique physical demands. Long shifts on their feet, bending over patients, and the emotional stress of patient care create a perfect storm for musculoskeletal injury and burnout. Hospital systems and medical practices that invest in corporate stretch service for their staff see reduced injury claims, lower turnover, and improved patient care quality. Healthy caregivers provide better care. Our stretch service programs for healthcare facilities are designed around shift schedules and can be delivered in break rooms, staff lounges, or any available space.",
  },
  {
    name: "Legal & Professional Services",
    desc: "Attorneys, paralegals, and legal support staff work notoriously long hours in sedentary positions — reviewing documents, preparing briefs, and sitting through lengthy depositions. Law firms that provide corporate stretch service demonstrate a commitment to associate wellness that improves retention in an industry plagued by high turnover. Our stretch service programs for law firms are designed to be discreet, efficient, and non-disruptive. Sessions are scheduled between meetings, during lunch, or at the end of the day. Many managing partners find that stretch service sessions help their teams maintain focus during late-night document reviews and trial preparation periods.",
  },
  {
    name: "Manufacturing & Warehouse",
    desc: "The manufacturing and warehouse sector has the highest rate of musculoskeletal injuries of any industry. Workers performing repetitive lifting, bending, and reaching are at constant risk for back injuries, shoulder tears, and repetitive strain disorders. Corporate stretch service programs in manufacturing and warehouse settings focus on injury prevention through pre-shift stretching protocols, mid-shift mobility breaks, and post-shift recovery sessions. The ROI is immediate and dramatic: facilities implementing our stretch service programs report 50-70% fewer injury claims and significant reductions in workers&apos; compensation costs. Many of our warehouse clients recoup their entire stretch service investment within the first quarter through reduced injury expenses alone.",
  },
  {
    name: "Co-Working Spaces & Shared Offices",
    desc: "Co-working spaces and shared office environments serve a diverse population of freelancers, small businesses, and remote workers who lack the corporate wellness programs available at larger companies. Co-working operators who add stretch service as an amenity differentiate their space from competitors and increase member retention. We partner with co-working spaces to offer weekly stretch service sessions that members can book individually. It&apos;s a premium amenity that costs the space operator very little while dramatically increasing perceived value. Members report that access to on-site stretch service is one of the top reasons they choose and stay at their co-working space.",
  },
  {
    name: "Media, Advertising & Creative",
    desc: "Creative professionals in media, advertising, and design agencies work under tight deadlines with intense screen time. The combination of creative pressure and physical stagnation creates chronic tension patterns that affect both physical health and creative output. Corporate stretch service for creative agencies provides a mid-day reset that unlocks both physical tension and creative blocks. Many art directors, copywriters, and designers report that their best ideas come during or immediately after a stretch session, when the body&apos;s relaxation response opens up new mental pathways. Agencies that invest in stretch service as a regular perk see improved creative output alongside the standard physical health benefits.",
  },
];

const howItWorksSteps = [
  { step: "1", title: "Inquiry & Consultation", desc: "Contact us via text, phone, or email to discuss your company&apos;s needs. Tell us about your team size, office layout, work environment, and wellness goals. We&apos;ll ask about injury patterns, employee demographics, and any existing wellness initiatives. This initial consultation is free and takes about 15 minutes — we need to understand your workplace before we can design the right stretch service program." },
  { step: "2", title: "Workplace Assessment", desc: "For ongoing programs, we visit your office to assess the physical workspace, identify the best setup location, observe how employees work, and note the postural patterns and physical demands specific to your team. This assessment allows us to create truly customized stretch protocols rather than a generic one-size-fits-all program. We evaluate ergonomics, workspace layout, and common movement patterns." },
  { step: "3", title: "Custom Program Design", desc: "Based on our consultation and assessment, we design a corporate stretch service program tailored to your company. This includes session frequency, duration, scheduling format, number of therapists needed, and specific stretch protocols for your team&apos;s needs. We present you with a detailed proposal including pricing, timeline, and expected outcomes. Programs can be weekly, bi-weekly, monthly, or event-based." },
  { step: "4", title: "On-Site Delivery", desc: "Our certified stretch therapists arrive at your office with all equipment — portable massage tables, mats, bolsters, and any tools needed. Setup takes under 5 minutes. Employees rotate through individual 15-minute stretch sessions or participate in 30-minute group mobility workshops. Your therapist manages the schedule, tracks participation, and ensures zero disruption to your workday." },
  { step: "5", title: "Progress Tracking & Reporting", desc: "We track participation rates, employee feedback scores, common issues addressed, and program outcomes. Monthly reports show you exactly what your corporate stretch service investment is delivering. We adjust protocols based on data — if we notice trending issues like increased neck pain across the team, we adapt our approach. This data-driven methodology ensures your stretch service program continuously improves and delivers measurable ROI." },
];

const stats = [
  { stat: "50%", label: "Reduction in musculoskeletal injury claims among companies with on-site stretch service programs (Bureau of Labor Statistics)" },
  { stat: "32%", label: "Average decrease in employee sick days taken at organizations implementing regular corporate stretch service" },
  { stat: "25%", label: "Improvement in self-reported afternoon focus and concentration following a 15-minute stretch service session" },
  { stat: "90%", label: "Employee satisfaction rate with corporate stretch service programs — the highest of any workplace wellness offering" },
  { stat: "$3.27", label: "Return on every $1 spent on workplace wellness programs in reduced medical costs (American Journal of Health Promotion)" },
  { stat: "40%", label: "Reduction in workers&apos; compensation costs at companies with pre-shift stretch service programs (OSHA data)" },
  { stat: "89%", label: "Of employees at companies with wellness programs report higher job satisfaction (SHRM research)" },
  { stat: "15-20%", label: "Boost in afternoon productivity reported by employees who receive midday stretch service sessions" },
];

const faqItems = [
  { question: "What is corporate stretch service and how does it work?", answer: "Corporate stretch service is an on-site employee wellness program where certified stretch therapists come to your office and provide professional assisted stretching to your team. Our therapists arrive with all equipment, set up in any available space — a conference room, break room, or open area — and provide individual 15-minute stretch sessions or group 30-minute mobility workshops. Employees rotate through sessions on a schedule that fits your workday. There is no disruption, no commute for employees, and no special clothing required. Corporate stretch service addresses the physical toll of desk work, reduces workplace injuries, boosts productivity, and improves employee satisfaction." },
  { question: "How much does corporate stretch service cost?", answer: "Individual stretch service sessions start at $99 per hour. Corporate programs receive custom pricing based on team size, frequency, and program type. Volume discounts are available for weekly and monthly programs. Most companies invest $500-$2,000 per month depending on team size and session frequency. The ROI is clear — companies report that the reduction in sick days, injury claims, and healthcare costs more than offsets the investment. Text us at (888) 734-7274 for a free custom quote for your company." },
  { question: "How many employees can you serve in one day?", answer: "A single stretch therapist can serve 16-20 employees per day with individual 15-minute sessions, or larger groups with 30-minute group mobility workshops. For larger companies, we bring multiple therapists to serve your entire team efficiently. We have served offices ranging from 10 employees to 500+ employees in a single day by scaling our team accordingly. We work with you to create a rotating schedule that ensures every employee gets access to stretch service without leaving their desk for more than 15-20 minutes." },
  { question: "Do employees need to wear special clothing for stretch service?", answer: "No special clothing is required. Our corporate stretch service is designed for the office environment — employees can receive their stretch session in business casual, scrubs, or whatever they normally wear to work. We use techniques that work with standard office attire. Employees do not need to change clothes, shower afterward, or bring any equipment. They simply walk to the stretch station, receive their 15-minute session, and return to work feeling refreshed." },
  { question: "What space do you need to set up for corporate stretch service?", answer: "We need minimal space — approximately 8 feet by 8 feet per therapist station. A conference room, private office, break room corner, or any semi-private area works perfectly. We bring all equipment including portable tables, mats, and bolsters. Setup takes under 5 minutes and teardown is equally quick. For group workshops, we need enough space for participants to stand with arms extended. Many of our clients dedicate a small wellness room, but any available space works." },
  { question: "Can we start with a trial session before committing to a program?", answer: "Absolutely. Most companies start with a single demo day so employees can experience our corporate stretch service firsthand before committing to an ongoing program. We bring a therapist for a half-day or full-day trial, serve as many employees as the schedule allows, and collect feedback. There is no commitment required for the trial. In our experience, over 90% of companies that do a trial day convert to ongoing programs because the employee response is overwhelmingly positive." },
  { question: "What types of corporate stretch service programs do you offer?", answer: "We offer six core program types: Weekly On-Site (recurring weekly sessions), Monthly Wellness Days (full-day monthly events), Event and Team Building (one-time events for retreats or parties), Executive Wellness (private sessions for leadership), Warehouse and Labor (pre-shift and post-shift programs for physical workers), and Remote/Hybrid Team programs (combining on-site and virtual sessions). Each program is fully customized to your company. Most clients start with one program type and expand as they see results." },
  { question: "Are your stretch therapists certified and insured?", answer: "Yes. All Stretch Service therapists are certified in assisted stretching, PNF stretching techniques, and myofascial release. Many hold additional certifications in massage therapy, physical therapy assistance, or athletic training. Every therapist is fully insured with professional liability coverage. We conduct thorough background checks on all therapists and require ongoing continuing education. When you book corporate stretch service through Stretch Service, you are getting trained, vetted, insured professionals." },
  { question: "How is corporate stretch service different from offering gym memberships?", answer: "Corporate stretch service is delivered on-site at your office — employees do not need to commute to a gym, change clothes, shower, or dedicate an hour of their personal time. Gym membership utilization rates average only 18% while our corporate stretch service programs see 70-90% employee participation because we remove every barrier. Stretch service is also targeted: our therapists address each employee&apos;s specific issues rather than leaving them to figure out a fitness routine on their own. The health benefits are immediate and measurable from session one, unlike gym memberships that require months of consistent use to produce results." },
  { question: "Which industries benefit most from corporate stretch service?", answer: "Every industry with desk workers, physical laborers, or high-stress environments benefits from corporate stretch service. Our most active industries include technology, finance, healthcare, legal, manufacturing, warehousing, media, creative agencies, co-working spaces, and professional services. Tech companies and law firms benefit from addressing the chronic pain of desk work. Warehouses and manufacturing plants see dramatic injury reduction. Healthcare facilities improve staff wellness and reduce burnout. The common thread is that every workforce has physical demands that professional stretch service addresses." },
  { question: "Do you provide corporate stretch service in all 50 states?", answer: "Yes. Stretch Service provides corporate wellness programs in all 50 states. We have certified therapists in every major metropolitan area and can coordinate coverage for companies in smaller cities and suburban locations. Whether your office is in New York, Los Angeles, Chicago, Houston, Phoenix, or any city in between, we can deliver on-site corporate stretch service. For companies with multiple locations across different states, we provide consistent programming and reporting across all sites." },
  { question: "What results can we expect from a corporate stretch service program?", answer: "Within the first month, you will see improved employee morale and strong participation rates. By month three, most companies report measurable reductions in employee complaints about neck pain, back pain, and headaches. By month six, data typically shows reduced sick days, fewer injury claims, and improved productivity metrics. Long-term clients report 50% fewer musculoskeletal injury claims, 32% fewer sick days, and 25% improvement in afternoon productivity. We provide monthly reports tracking these metrics so you can see exactly what your stretch service investment delivers." },
];

const topCities = [
  { name: "New York City", stateSlug: "new-york", citySlug: "new-york-city" },
  { name: "Los Angeles", stateSlug: "california", citySlug: "los-angeles" },
  { name: "Chicago", stateSlug: "illinois", citySlug: "chicago" },
  { name: "Houston", stateSlug: "texas", citySlug: "houston" },
  { name: "Phoenix", stateSlug: "arizona", citySlug: "phoenix" },
  { name: "Philadelphia", stateSlug: "pennsylvania", citySlug: "philadelphia" },
  { name: "San Antonio", stateSlug: "texas", citySlug: "san-antonio" },
  { name: "San Diego", stateSlug: "california", citySlug: "san-diego" },
  { name: "Dallas", stateSlug: "texas", citySlug: "dallas" },
  { name: "Austin", stateSlug: "texas", citySlug: "austin" },
  { name: "San Francisco", stateSlug: "california", citySlug: "san-francisco" },
  { name: "Seattle", stateSlug: "washington", citySlug: "seattle" },
  { name: "Denver", stateSlug: "colorado", citySlug: "denver" },
  { name: "Boston", stateSlug: "massachusetts", citySlug: "boston" },
  { name: "Nashville", stateSlug: "tennessee", citySlug: "nashville" },
  { name: "Atlanta", stateSlug: "georgia", citySlug: "atlanta" },
  { name: "Miami", stateSlug: "florida", citySlug: "miami" },
  { name: "Minneapolis", stateSlug: "minnesota", citySlug: "minneapolis" },
  { name: "Portland", stateSlug: "oregon", citySlug: "portland" },
  { name: "Charlotte", stateSlug: "north-carolina", citySlug: "charlotte" },
];

export default function CorporateWellnessPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Corporate Wellness Programs | Stretch Service", "On-site corporate stretch service programs for offices and companies nationwide. Reduce injuries, boost productivity, improve retention. All 50 states.", `${SITE_URL}/corporate-wellness`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Corporate Wellness", url: `${SITE_URL}/corporate-wellness` },
      ])} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">National Corporate Wellness</p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">On-Site Corporate Stretch Service — All 50 States | Custom Pricing</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Corporate Stretch Service Programs
          </h1>
          <p className="mx-auto mt-2 text-2xl font-bold text-white font-heading">$99/hr | Custom Corporate Rates Available</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Bring professional assisted stretching to your office. On-site corporate stretch service reduces workplace injuries by 50%, boosts productivity by 25%, and shows your employees you invest in their health. Available in all 50 states.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={`mailto:${SITE_EMAIL}?subject=Corporate%20Wellness%20Inquiry`} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Email for Corporate Pricing
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* What Is Corporate Stretch Service */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">What Is Corporate Stretch Service?</h2>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            Corporate stretch service is an on-site employee wellness program where certified stretch therapists come directly to your office and provide professional assisted stretching to your team members. Unlike gym memberships that go unused, yoga classes that require employees to leave the building, or wellness apps that collect digital dust, corporate stretch service delivers hands-on, personalized physical care right where your employees work. There is no commute, no special clothing, no shower required, and no disruption to the workday. Our therapists arrive with all equipment, set up in any available space, and work through your team on a schedule that fits your business operations.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The concept is simple but the impact is profound. The average American office worker sits for 8-10 hours per day. This sedentary behavior creates a cascade of physical problems: chronic neck pain from forward head posture, lower back pain from compressed spinal discs, tight hip flexors from prolonged sitting, rounded shoulders from reaching toward keyboards, and repetitive strain injuries in the wrists and forearms. These are not minor inconveniences — they are the leading cause of workplace disability claims, the primary driver of employee absenteeism, and a significant factor in the declining productivity that costs American businesses an estimated $226 billion annually. Corporate stretch service addresses these issues at their physical source with professional, hands-on intervention.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            When a certified stretch therapist works with an employee, they assess that individual&apos;s specific postural patterns, identify areas of chronic tension, and apply targeted stretching techniques — including PNF (Proprioceptive Neuromuscular Facilitation), myofascial release, and assisted passive stretching — to release muscle tension, improve range of motion, and correct the imbalances caused by desk work. Each 15-minute individual session produces immediate, noticeable relief. Over weeks and months of consistent corporate stretch service, employees develop better posture, greater mobility, reduced pain, and increased body awareness that prevents future injuries.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The ROI of corporate stretch service is well-documented. The American Journal of Health Promotion found that workplace wellness programs return $3.27 in reduced medical costs and $2.73 in reduced absenteeism for every dollar invested. Companies implementing on-site stretch service specifically report up to 50% reduction in musculoskeletal injury claims, 32% fewer sick days, 25% improvement in afternoon productivity, and 90% employee satisfaction with the program. For warehouse and manufacturing environments with physical labor, the numbers are even more dramatic — OSHA data shows pre-shift stretching programs reduce injury rates by 50-70% and cut workers&apos; compensation costs by 40%.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Corporate stretch service is not a trend — it is a strategic investment in your workforce&apos;s physical health, mental well-being, and productive capacity. Companies ranging from 10-person startups to Fortune 500 enterprises use our programs because the math is simple: healthier employees cost less, produce more, stay longer, and perform better. Whether your team sits at desks, stands on warehouse floors, travels for client meetings, or works from home, Stretch Service has a corporate wellness program designed for your specific environment and needs. Our programs are available in all 50 states at custom corporate rates, with individual sessions starting at $99 per hour.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/services/assisted-stretch-service" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">Assisted Stretching</Link>
            <Link href="/services/pnf-stretch-service" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">PNF Stretching</Link>
            <Link href="/services/myofascial-release-stretch-service" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">Myofascial Release</Link>
            <Link href="/pricing" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">View Pricing</Link>
          </div>
        </div>
      </section>

      {/* Program Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">6 Corporate Stretch Service Program Types</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Every corporate wellness program is customized to your company&apos;s size, schedule, industry, and goals. Choose one program type or combine several for comprehensive coverage.
          </p>
          <div className="mt-10 space-y-6">
            {programTypes.map((p) => (
              <div key={p.name} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{p.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
                <p className="mt-3 text-xs font-semibold text-teal-600">Ideal for: {p.ideal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Corporate Stretch Service Works</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Office workers spend 8+ hours sitting daily. Warehouse workers repeat the same physical movements thousands of times per shift. Professional stretch service addresses the physical toll of modern work before it becomes chronic injury, costly disability claims, or employee turnover.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Corporate Stretch Service by the Numbers</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            The data behind corporate stretch service is compelling. Companies across every industry report dramatic improvements in employee health, productivity, and satisfaction when they invest in on-site stretch service programs. Here are the statistics that drive Fortune 500 companies, tech startups, law firms, and warehouses to make stretch service a permanent part of their workplace culture.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.stat} className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
                <p className="text-3xl font-bold text-teal-600">{s.stat}</p>
                <p className="mt-2 text-xs text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            These statistics come from peer-reviewed workplace wellness research, Bureau of Labor Statistics data, OSHA injury reports, and our own client outcome tracking across hundreds of corporate stretch service programs nationwide.
          </p>
        </div>
      </section>

      {/* Industry-Specific Content */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Industries That Benefit from Corporate Stretch Service</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Every industry has unique physical demands on its workforce. Our corporate stretch service programs are tailored to address the specific challenges your employees face.
          </p>
          <div className="mt-10 space-y-6">
            {industries.map((ind) => (
              <div key={ind.name} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">{ind.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Step by Step */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Corporate Stretch Service Works: Step by Step</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            From your first inquiry to ongoing program delivery, here is exactly what the process looks like when you bring Stretch Service to your workplace.
          </p>
          <div className="mt-10 space-y-6">
            {howItWorksSteps.map((s) => (
              <div key={s.step} className="flex gap-4 rounded-xl border border-teal-200/60 bg-white p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{s.step}</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Corporate Stretch Service Pricing</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Transparent base pricing with custom corporate rates for ongoing programs. Volume discounts available for larger teams and multi-location companies.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Individual Sessions</h3>
              <p className="mt-2 text-3xl font-bold text-teal-600">$99<span className="text-base font-normal text-slate-500">/hr</span></p>
              <p className="mt-3 text-sm text-slate-600">Standard rate for individual stretch service sessions. Ideal for trial days and executive wellness programs. 60-minute sessions with one certified therapist.</p>
              <p className="mt-2 text-xs text-teal-600 font-semibold">10% off weekly bookings</p>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Weekly Programs</h3>
              <p className="mt-2 text-3xl font-bold text-teal-600">Custom<span className="text-base font-normal text-slate-500"> rates</span></p>
              <p className="mt-3 text-sm text-slate-600">Recurring weekly on-site stretch service at discounted corporate rates. Pricing based on hours per week, team size, and contract length. Most popular corporate option.</p>
              <p className="mt-2 text-xs text-teal-600 font-semibold">Volume discounts available</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Enterprise</h3>
              <p className="mt-2 text-3xl font-bold text-teal-600">Custom<span className="text-base font-normal text-slate-500"> rates</span></p>
              <p className="mt-3 text-sm text-slate-600">Multi-location programs, dedicated therapist teams, priority scheduling, and comprehensive reporting. For companies with 100+ employees or multiple offices across states.</p>
              <p className="mt-2 text-xs text-teal-600 font-semibold">Multi-location discounts</p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            All corporate stretch service programs include certified therapists, all equipment, liability insurance, scheduling management, and monthly progress reports. <Link href="/pricing" className="text-teal-600 hover:text-teal-800 underline">View full pricing details</Link>.
          </p>
        </div>
      </section>

      {/* All 50 States */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Corporate Stretch Service in All 50 States</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Stretch Service provides corporate wellness programs nationwide. Click your state to explore available cities, program options, and local corporate stretch service details.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {states.map((st) => (
              <Link key={st.slug} href={`/corporate-wellness/${st.slug}`}>
                <div className="group rounded-lg border border-teal-200/60 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{st.name}</h3>
                  <p className="text-xs text-slate-500">{st.abbr}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top 20 Cities */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Top 20 Cities for Corporate Stretch Service</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Our most active corporate stretch service markets. These cities have the highest demand for on-site workplace wellness programs, and we have dedicated therapist teams ready to serve your company.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {topCities.map((tc) => (
              <Link key={tc.citySlug} href={`/corporate-wellness/${tc.stateSlug}/${tc.citySlug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{tc.name}</h3>
                  <p className="text-xs text-slate-500">Corporate Stretch Service</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Corporate Stretch Service FAQ</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Everything you need to know about bringing professional stretch service to your workplace.
          </p>
          <div className="mt-10 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Build a Healthier, More Productive Team?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Contact us for a custom corporate stretch service proposal. We&apos;ll design a program that fits your company&apos;s needs, budget, and schedule. Trial sessions available — no commitment required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={`mailto:${SITE_EMAIL}?subject=Corporate%20Wellness%20Inquiry`} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Email for Corporate Pricing
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">{SITE_EMAIL} | {SITE_PHONE} | All 50 States</p>
        </div>
      </section>

      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Locations</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/services/assisted-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/new-york" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">New York</Link>
            <Link href="/locations/california" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">California</Link>
            <Link href="/locations/texas" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Texas</Link>
          </div>
        </div>
      </section>
    </>
  );
}
