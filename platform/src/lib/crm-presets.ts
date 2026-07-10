/**
 * CRM import presets — the "which system are you coming from?" layer that sits
 * on top of the staged import engine (import-staging.ts). A new tenant exports a
 * CSV from their old platform; picking that platform pre-maps the columns using
 * known header aliases so the common case is one-click, while anything the preset
 * can't place falls through to the AI analyzer (/api/dashboard/import/analyze)
 * and then human review before a single row is written.
 *
 * DESIGN — why imperfect aliases are safe:
 *   Matching is alias-based, never positional. A header we don't recognize is
 *   left UNMAPPED (the human maps it), it is never guessed onto the wrong field.
 *   So a preset that's missing an alias degrades to "map it yourself", not to
 *   corrupted data. `verified` records whether the aliases were confirmed against
 *   the vendor's own import/export docs (true) or are best-effort (false).
 *
 * Target fields mirror the SCHEMAS in the analyze route and the mapped shape the
 * stage endpoint expects — keep them in sync.
 */

export type ImportKind = 'clients' | 'schedules'

/** Map of our target field → the source header aliases that fill it. */
export type FieldAliases = Record<string, string[]>

export interface CrmPreset {
  id: string
  label: string
  emoji: string
  /** aliases confirmed against the vendor's own docs (true) vs best-effort (false). */
  verified: boolean
  /** short hint of which trades this platform typically serves. */
  trades: string[]
  /** step-by-step: how to get a CSV out of this platform. */
  exportSteps: string[]
  clients: FieldAliases
  schedules?: FieldAliases
}

/** Normalize a header for comparison: lowercase, strip everything non-alphanumeric. */
export function normHeader(h: string): string {
  return (h || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Composite input fields the row-mapper knows how to fold into a single target.
// e.g. firstname + lastname → name; street/city/state/zip → address.
const NAME_FIRST = 'name_first'
const NAME_LAST = 'name_last'
const ADDR_STREET = 'addr_street'
const ADDR_CITY = 'addr_city'
const ADDR_STATE = 'addr_state'
const ADDR_ZIP = 'addr_zip'

// Aliases shared by most platforms — spread into each preset so we don't repeat
// the obvious ones. Platform-specific quirks override/extend these.
const COMMON_CLIENT: FieldAliases = {
  name: ['name', 'clientname', 'customername', 'fullname', 'contact', 'contactname', 'displayname'],
  [NAME_FIRST]: ['firstname', 'first', 'fname', 'givenname'],
  [NAME_LAST]: ['lastname', 'last', 'lname', 'surname', 'familyname'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'cell', 'cellphone', 'tel', 'telephone', 'primaryphone', 'homephone', 'homenumber'],
  email: ['email', 'emailaddress', 'emails', 'primaryemail', 'e'],
  address: ['address', 'fulladdress', 'streetaddress', 'serviceaddress', 'mailingaddress', 'addressline1', 'address1'],
  [ADDR_STREET]: ['street', 'addr', 'line1'],
  [ADDR_CITY]: ['city', 'town'],
  [ADDR_STATE]: ['state', 'province', 'region'],
  [ADDR_ZIP]: ['zip', 'zipcode', 'postalcode', 'postcode', 'postal'],
  source: ['source', 'leadsource', 'referral', 'howheard', 'howdidyouhear'],
  notes: ['notes', 'note', 'comment', 'comments', 'customernotes', 'description'],
  status: ['status', 'state', 'clientstatus', 'type'],
}

const COMMON_SCHEDULE: FieldAliases = {
  client_name: ['clientname', 'customername', 'name', 'contact', 'customer'],
  client_phone: ['clientphone', 'customerphone', 'phone', 'mobile', 'phonenumber'],
  start: ['start', 'starttime', 'startdate', 'date', 'datetime', 'appointmenttime', 'scheduledat', 'jobdate', 'visitdate'],
  duration_hours: ['duration', 'durationhours', 'hours', 'length', 'estimatedduration'],
  service_type: ['service', 'servicetype', 'jobtype', 'title', 'jobtitle', 'linetitle'],
  price: ['price', 'amount', 'total', 'cost', 'rate', 'value'],
  staff_name: ['staff', 'staffname', 'assignedto', 'technician', 'tech', 'cleaner', 'worker', 'employee', 'assigned'],
  recurring_type: ['recurring', 'recurringtype', 'frequency', 'repeat', 'recurrence'],
  day_of_week: ['dayofweek', 'day', 'weekday'],
  preferred_time: ['preferredtime', 'time', 'timeofday', 'arrivalwindow'],
  notes: ['notes', 'note', 'comment', 'comments', 'description', 'instructions'],
}

/** Merge platform-specific aliases on top of the common set (platform wins). */
function withCommon(base: FieldAliases, extra: FieldAliases): FieldAliases {
  const out: FieldAliases = {}
  for (const key of new Set([...Object.keys(base), ...Object.keys(extra)])) {
    out[key] = [...new Set([...(base[key] || []), ...(extra[key] || [])])]
  }
  return out
}

/**
 * The presets. Ordered roughly by how common they are for the trades Full Loop
 * serves (home services, cleaning, pest, junk/tow). `generic` is the catch-all
 * that skips straight to the AI analyzer.
 */
export const CRM_PRESETS: CrmPreset[] = [
  {
    id: 'jobber',
    label: 'Jobber',
    emoji: '🟢',
    verified: false, // export flow confirmed from Jobber docs; exact headers not (login-gated)
    trades: ['home services', 'cleaning', 'landscaping', 'hvac'],
    exportSteps: [
      'In Jobber, go to Clients.',
      'Click the ••• (more actions) menu at the top of the client list.',
      'Choose Export, then CSV — Jobber emails you the file (admin users only).',
      'Download the CSV from that email and upload it here.',
    ],
    clients: withCommon(COMMON_CLIENT, {
      name: ['clientname', 'companyname'],
      [NAME_FIRST]: ['firstname'],
      [NAME_LAST]: ['lastname'],
      [ADDR_STATE]: ['province'],
      [ADDR_ZIP]: ['postalcode'],
      source: ['leadsource'],
      status: ['clientstatus'],
    }),
    schedules: withCommon(COMMON_SCHEDULE, {
      service_type: ['jobtitle', 'jobtype'],
      start: ['scheduledstartdate', 'visitdate'],
    }),
  },
  {
    id: 'housecall-pro',
    label: 'Housecall Pro',
    emoji: '🏠',
    verified: true, // field names confirmed from Housecall Pro's "Prepare to Import Your Data" docs
    trades: ['home services', 'hvac', 'plumbing', 'cleaning'],
    exportSteps: [
      'In Housecall Pro, open the Customers tab.',
      'Click the Export option in the dropdown, then Send file.',
      'You will get an email from notifications@housecallpro.com with the CSV attached.',
      'Download it and upload it here.',
    ],
    clients: withCommon(COMMON_CLIENT, {
      // Verified HCP headers: Display name, First name, Last name, Company,
      // Service address, Mobile number, Home number, Work number, Emails,
      // Lead source, Customer notes, Tags, Type.
      name: ['displayname'],
      [NAME_FIRST]: ['firstname'],
      [NAME_LAST]: ['lastname'],
      phone: ['mobilenumber', 'homenumber', 'worknumber'],
      email: ['emails'],
      address: ['serviceaddress', 'billingaddress'],
      source: ['leadsource'],
      notes: ['customernotes', 'serviceaddressnotes'],
      status: ['type'],
    }),
  },
  {
    id: 'servicetitan',
    label: 'ServiceTitan',
    emoji: '🔧',
    verified: false,
    trades: ['hvac', 'plumbing', 'electrical', 'home services'],
    exportSteps: [
      'In ServiceTitan, go to Search and choose Customers from the dropdown.',
      'Click the Expand icon, then Export to Excel (.xlsx).',
      'Open the file and Save As / export to CSV, then upload it here.',
    ],
    clients: withCommon(COMMON_CLIENT, {
      name: ['customername', 'name'],
      phone: ['phonenumber', 'phonenumbers'],
      address: ['locationaddress', 'billingaddress'],
    }),
  },
  {
    id: 'zenmaid',
    label: 'ZenMaid',
    emoji: '🧹',
    verified: false,
    trades: ['cleaning'],
    exportSteps: [
      'In ZenMaid, go to Customers.',
      'Use the Export option to download your customer list as CSV.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {
      [NAME_FIRST]: ['firstname'],
      [NAME_LAST]: ['lastname'],
    }),
    schedules: withCommon(COMMON_SCHEDULE, {
      recurring_type: ['frequency'],
      staff_name: ['cleaner', 'assignedcleaner'],
    }),
  },
  {
    id: 'launch27',
    label: 'Launch27 / BookingKoala',
    emoji: '📅',
    verified: false,
    trades: ['cleaning', 'home services'],
    exportSteps: [
      'In Launch27 / BookingKoala, open Customers (or Bookings for schedules).',
      'Use Export to CSV.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {
      [NAME_FIRST]: ['firstname'],
      [NAME_LAST]: ['lastname'],
    }),
    schedules: withCommon(COMMON_SCHEDULE, {
      service_type: ['servicename'],
      recurring_type: ['frequency'],
    }),
  },
  {
    id: 'markate',
    label: 'Markate',
    emoji: '🟠',
    verified: false,
    trades: ['home services', 'cleaning', 'landscaping'],
    exportSteps: [
      'In Markate, open Customers.',
      'Use the Export / Download option to get a CSV.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {}),
  },
  {
    id: 'kickserv',
    label: 'Kickserv',
    emoji: '🟡',
    verified: false,
    trades: ['home services', 'plumbing', 'hvac'],
    exportSteps: [
      'In Kickserv, go to Contacts / Customers.',
      'Use Export to download a CSV of your contacts.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {}),
  },
  {
    id: 'service-fusion',
    label: 'Service Fusion',
    emoji: '⚙️',
    verified: false,
    trades: ['hvac', 'plumbing', 'electrical', 'home services'],
    exportSteps: [
      'In Service Fusion, go to Customers.',
      'Use the Export option to download a CSV.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {}),
  },
  {
    id: 'gorilladesk',
    label: 'GorillaDesk',
    emoji: '🦍',
    verified: false,
    trades: ['pest control', 'lawn'],
    exportSteps: [
      'In GorillaDesk, open Customers.',
      'Use Export to CSV to download your customer list.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {}),
  },
  {
    id: 'workiz',
    label: 'Workiz',
    emoji: '🔵',
    verified: false,
    trades: ['home services', 'appliance', 'locksmith'],
    exportSteps: [
      'In Workiz, go to Clients.',
      'Use the Export option to download a CSV.',
      'Upload the downloaded file here.',
    ],
    clients: withCommon(COMMON_CLIENT, {}),
  },
  {
    id: 'thumbtack',
    label: 'Thumbtack (leads)',
    emoji: '📌',
    verified: false,
    trades: ['home services', 'cleaning'],
    exportSteps: [
      'Thumbtack has no bulk client export — leads live in your Messages/Leads.',
      'Build a CSV with columns like name, phone, email from your leads and upload it here.',
    ],
    clients: withCommon(COMMON_CLIENT, {}),
  },
  {
    id: 'generic',
    label: 'A spreadsheet / other CRM',
    emoji: '📄',
    verified: false,
    trades: [],
    exportSteps: [
      'Export or build a CSV with a header row (name, phone, email, address, …).',
      'Upload it here — we detect the columns automatically and you confirm the mapping.',
    ],
    clients: COMMON_CLIENT,
    schedules: COMMON_SCHEDULE,
  },
]

export function getPreset(id: string): CrmPreset | undefined {
  return CRM_PRESETS.find((p) => p.id === id)
}

/** Find the first header index whose normalized form matches any alias. */
function findIndex(aliases: string[] | undefined, normedHeaders: string[]): number {
  if (!aliases?.length) return -1
  const set = new Set(aliases.map(normHeader))
  return normedHeaders.findIndex((h) => set.has(h))
}

/**
 * A resolved mapping: target field → ordered source column indices. A single
 * index is a direct map; multiple indices are joined (name → space,
 * address → comma). `unmappedHeaders` are columns we left for the human/AI.
 */
export interface MappingPlan {
  fields: Record<string, number[]>
  unmappedHeaders: string[]
}

// Fields whose multiple source columns are concatenated, and with what.
const JOIN: Record<string, string> = { name: ' ', address: ', ' }

/**
 * Resolve which source columns fill each target field for a preset. No row data
 * is touched — this is the editable "plan" the wizard shows and the operator can
 * override before staging. Unrecognized columns are left unmapped, never guessed.
 */
export function resolveMapping(preset: CrmPreset, kind: ImportKind, headers: string[]): MappingPlan {
  const aliases = kind === 'schedules' ? preset.schedules : preset.clients
  if (!aliases) return { fields: {}, unmappedHeaders: headers.slice() }
  const normed = headers.map(normHeader)
  const used = new Set<number>()
  const fields: Record<string, number[]> = {}

  const takeOne = (field: string, aliasKey = field): number => {
    const i = findIndex(aliases[aliasKey], normed)
    if (i >= 0 && !used.has(i)) { fields[field] = [i]; used.add(i); return i }
    return -1
  }

  if (kind === 'clients') {
    // name: a single name column if present, else first + last folded together.
    if (takeOne('name') < 0) {
      const parts = [NAME_FIRST, NAME_LAST]
        .map((k) => findIndex(aliases[k], normed))
        .filter((i) => i >= 0 && !used.has(i))
      if (parts.length) { fields.name = parts; parts.forEach((i) => used.add(i)) }
    }
    // address: a single address column, else street/city/state/zip folded.
    if (takeOne('address') < 0) {
      const parts = [ADDR_STREET, ADDR_CITY, ADDR_STATE, ADDR_ZIP]
        .map((k) => findIndex(aliases[k], normed))
        .filter((i) => i >= 0 && !used.has(i))
      if (parts.length) { fields.address = parts; parts.forEach((i) => used.add(i)) }
    }
    for (const field of ['phone', 'email', 'source', 'notes', 'status']) takeOne(field)
  } else {
    for (const field of Object.keys(aliases)) takeOne(field)
  }

  const unmappedHeaders = headers.filter((_, i) => !used.has(i))
  return { fields, unmappedHeaders }
}

/** Build stage-ready row objects from a (possibly operator-edited) plan. */
export function buildRows(
  headers: string[],
  rows: string[][],
  plan: MappingPlan,
): Array<Record<string, string>> {
  const clean = (v: string | undefined): string => (v ?? '').trim()
  return rows.map((r) => {
    const o: Record<string, string> = {}
    for (const [field, idxs] of Object.entries(plan.fields)) {
      if (!idxs?.length) continue
      const sep = JOIN[field]
      const val = sep
        ? idxs.map((i) => clean(r[i])).filter(Boolean).join(sep)
        : clean(r[idxs[0]])
      if (val) o[field] = val
    }
    return o
  })
}

/** Result of mapping one uploaded table through a preset. */
export interface PresetMapResult {
  rows: Array<Record<string, string>>
  mappedFields: string[]
  unmappedHeaders: string[]
}

/**
 * Convenience: resolve a preset's mapping and apply it in one call. Composite
 * fields (first/last name, split address) are folded. Nothing is written.
 */
export function applyPreset(
  preset: CrmPreset,
  kind: ImportKind,
  headers: string[],
  rows: string[][],
): PresetMapResult {
  const plan = resolveMapping(preset, kind, headers)
  return {
    rows: buildRows(headers, rows, plan),
    mappedFields: Object.keys(plan.fields),
    unmappedHeaders: plan.unmappedHeaders,
  }
}

/**
 * Rank presets by how well their aliases match a set of uploaded headers, so the
 * UI can auto-suggest "looks like you're coming from X". `generic` is excluded
 * from scoring (it always matches). Returns presets scored > 0, best first.
 */
export function detectPreset(
  kind: ImportKind,
  headers: string[],
): Array<{ preset: CrmPreset; score: number }> {
  const normed = headers.map(normHeader)
  const scored = CRM_PRESETS.filter((p) => p.id !== 'generic').map((preset) => {
    const aliases = kind === 'schedules' ? preset.schedules : preset.clients
    if (!aliases) return { preset, score: 0 }
    let score = 0
    for (const field of Object.keys(aliases)) {
      if (findIndex(aliases[field], normed) >= 0) score++
    }
    return { preset, score }
  })
  // Best score first; on a tie prefer the preset whose headers are doc-verified
  // (its exact columns are known, so a tie is more likely to actually be it).
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.preset.verified) - Number(a.preset.verified))
}
