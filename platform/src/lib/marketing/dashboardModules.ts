// Single source of truth for the real Full Loop CRM dashboard nav — used by
// the Features page (src/app/(marketing)/full-loop-crm-service-features) AND
// the Features nav dropdown (src/components/marketing/nav/FeaturesMenu.tsx),
// so the menu can never drift out of sync with what the feature page lists.
// This mirrors the actual operator dashboard nav, not a marketing invention.
export interface DashboardModule {
  id: string;
  num: string;
  name: string;
  desc: string;
  children: string[];
}

export const DASHBOARD_MODULES: DashboardModule[] = [
  {
    id: "the-loop",
    num: "00",
    name: "The Loop",
    desc: "Executive home — revenue, today's jobs, hot leads, conversion, system status, day-of-building.",
    children: [],
  },
  {
    id: "clients",
    num: "01",
    name: "Clients",
    desc: "All Clients · SMS Inbox · Per-client transcript · Activity feed · Lifecycle status · LTV.",
    children: ["Feedback — in-product customer feedback capture, tied to the client record"],
  },
  {
    id: "comhub",
    num: "02",
    name: "ComHub",
    desc: "Every conversation surface the business runs on, unified in one hub.",
    children: ["Loop Connect — Slack-style channels for your team, each client, and each crew member, in one place"],
  },
  {
    id: "sales",
    num: "03",
    name: "Sales",
    desc: "Leads · Pipeline · Quotes · E-signature documents · Invoices · Route optimization · Deals at-risk.",
    children: [
      "Catalog — the services, packages, and price book quotes and invoices pull from",
      "Sales Partners — outside referral/affiliate partners with their own commission tracking",
      "Referrals — client-to-client referral program with automated commission payouts",
    ],
  },
  {
    id: "production",
    num: "04",
    name: "Production",
    desc: "Everything between a signed quote and a completed job.",
    children: [
      "Bookings — Calendar (drag-drop) · Recurring (7 patterns) · Smart-schedule scoring · Travel time",
      "Projects — multi-visit and multi-day jobs tracked as a single unit, not a string of one-offs",
      "Schedule — day/week/month crew and job views",
      "Crews — crew composition, lead assignment, and per-job team makeup",
      "Find a Team Member — internal directory for staffing a job fast",
      "Announcements — company-wide notices to the whole team",
    ],
  },
  {
    id: "finance",
    num: "05",
    name: "Finance",
    desc: "Overview · Transactions · Receipts · P&L · AR aging · Cash flow · Audit log · Ledger and bank-import reconciliation, payroll, and 1099-ready exports.",
    children: [],
  },
  {
    id: "hr",
    num: "06",
    name: "HR",
    desc: "Team documents, roles, and onboarding paperwork in one place — the newest module, actively expanding.",
    children: [],
  },
  {
    id: "marketing",
    num: "07",
    name: "Marketing",
    desc: "The organic growth engine, broken into its actual working parts.",
    children: [
      "Campaigns — SMS/email outreach and win-back sequences",
      "Reviews — request automation and 5-star review syncing",
      "Social — Facebook + Instagram posting and scheduling",
      "Google — Google Business Profile sync and management",
      "Websites — the tenant's public marketing site and page configuration",
      "Analytics — traffic, attribution, and lead-source reporting",
    ],
  },
  {
    id: "ai-receptionist",
    num: "—",
    name: "Our AI Receptionist",
    desc: "Live conversation feed, conversion rate, channel mix, scoring, error log, one-click reset, persona editor.",
    children: [],
  },
  {
    id: "virtual-assistant-service",
    num: "—",
    name: "Virtual Assistant Service",
    desc: "Real human virtual assistants — fluent English, trained on your CRM — starting at $8/hour through our staffing partner. AI covers nights; people cover the rest.",
    children: [],
  },
  {
    id: "platform",
    num: "—",
    name: "Platform",
    desc: "The operator-facing admin tray behind everything else.",
    children: [
      "Onboarding — the setup checklist for a newly signed operator",
      "Settings — services, hours, brand, hero, SEO meta, policies, integrations, page configs, vendor keys (encrypted)",
      "Users — team member accounts, roles, and access",
      "Yinez — the AI agent's own admin surface (persona, tools, memory, channels)",
      "Legal — agreements, policy documents, and compliance records",
      "Platform Docs — internal documentation for the operator",
    ],
  },
];
