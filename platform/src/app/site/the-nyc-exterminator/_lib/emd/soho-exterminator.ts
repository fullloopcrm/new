import type { NeighborhoodMicrositeConfig } from './types'

export const sohoExterminatorConfig: NeighborhoodMicrositeConfig = {
  domain: 'sohoexterminator.com',
  slug: 'soho-exterminator',
  brandName: 'SoHo Exterminator',
  neighborhoodName: 'SoHo',
  borough: 'Manhattan',
  metaTitle: 'SoHo Exterminator | SoHo Pest Control | NYC Exterminator & Pest Control Services',
  metaDescription: 'SoHo Exterminator — licensed SoHo pest control for cast-iron lofts, retail, and restaurants at a flat $199/hr. Cockroach, mouse & bed bug extermination. Part of The NYC Exterminator. Call/text (212) 202-8545, free inspection, 24/7 booking.',
  geo: { lat: '40.7233', lng: '-74.0030' },
  introParagraphs: [
    "SoHo Exterminator is the SoHo pest control team behind The NYC Exterminator, built around the neighborhood's cast-iron loft buildings, ground-floor retail, and dense restaurant corridor between Houston and Canal. Search 'SoHo exterminator' or 'SoHo pest control' and you land on the same licensed technicians and flat $199/hr rate that back every NYC Exterminator job — just focused specifically on SoHo.",
    "SoHo's 19th-century cast-iron buildings were built as manufacturing lofts, not apartments — open floor plans, exposed brick, old freight elevator shafts, and converted commercial spaces that create very different pest-entry conditions than a typical prewar residential building. SoHo Exterminator's technicians are trained specifically on that building stock, from Greene Street to West Broadway.",
    "Whether you're a loft resident on Mercer Street dealing with mice coming up through old floor gaps, a boutique on Spring Street with a stockroom roach problem, or a restaurant near the Prince Street corridor that needs DOH-compliant pest documentation, SoHo Exterminator has a flat-rate plan — free inspection, written estimate, no surprises.",
  ],
  neighborhoodChallenges: [
    { title: 'Converted Loft & Warehouse Gaps', body: "SoHo's cast-iron loft buildings were converted from industrial use decades after construction, often leaving gaps around old freight elevator shafts, exposed brick mortar joints, and original wood flooring — all real entry points for mice and roaches that newer construction doesn't have." },
    { title: 'Ground-Floor Retail & Stockrooms', body: "SoHo's retail density means a huge share of ground-floor space is commercial stockrooms sharing walls and basements with residential units above. Pest pressure moves both directions if it isn't treated at the building level." },
    { title: 'Restaurant & Cafe Corridor Compliance', body: 'The Prince Street, Spring Street, and West Broadway restaurant and cafe corridor faces frequent DOH inspection. We provide documented, DOH-compliant treatment plans for commercial kitchens throughout SoHo.' },
    { title: 'Cobblestone Basement Moisture', body: "SoHo's older cobblestone-street buildings often have basement moisture issues that attract American cockroaches and drain flies. We target basement and utility-area entry points, not just the visible unit above." },
  ],
  localFaqs: [
    { question: 'Do you treat converted loft buildings in SoHo?', answer: 'Yes — SoHo Exterminator technicians are specifically trained on the cast-iron loft and converted-warehouse building stock that makes up most of SoHo, including freight elevator shafts and exposed brick gaps.' },
    { question: 'Do you handle retail and restaurant pest control in SoHo?', answer: 'Yes, we provide DOH-compliant commercial pest control for SoHo boutiques, cafes, and restaurants, including documentation for health inspections.' },
    { question: 'Can you treat a shared basement between a store and the apartments above?', answer: "Yes — shared basements are common in SoHo's mixed-use buildings, and we coordinate treatment across commercial and residential units when the pest pressure is shared." },
  ],
}
