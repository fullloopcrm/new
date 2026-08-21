import type { NeighborhoodMicrositeConfig } from './types'

export const greenwichVillageExterminatorConfig: NeighborhoodMicrositeConfig = {
  domain: 'greenwichvillageexterminator.com',
  slug: 'greenwich-village-exterminator',
  brandName: 'Greenwich Village Exterminator',
  neighborhoodName: 'Greenwich Village',
  borough: 'Manhattan',
  metaTitle: 'Greenwich Village Exterminator | Greenwich Village Pest Control | NYC Exterminator & Pest Control',
  metaDescription: 'Greenwich Village Exterminator — licensed Greenwich Village pest control for townhouses, walk-ups & NYU housing at a flat $199/hr. Cockroach, mouse & bed bug extermination. Part of The NYC Exterminator. Call/text (212) 202-8545, free inspection, 24/7 booking.',
  geo: { lat: '40.7336', lng: '-74.0027' },
  introParagraphs: [
    "Greenwich Village Exterminator is the Greenwich Village pest control team behind The NYC Exterminator, built around the neighborhood's 19th-century townhouses, walk-up tenements, and dense NYU-adjacent student housing between the West Village and Washington Square Park. Search 'Greenwich Village exterminator' or 'Greenwich Village pest control' and you'll land on the same licensed, flat-rate team behind every NYC Exterminator job.",
    "The Village's low-rise, densely packed building stock — narrow townhouses, pre-war walk-ups with shared airshafts, and older multi-family buildings converted for student and faculty housing — creates pest pathways that differ block to block. Greenwich Village Exterminator's technicians are trained on exactly this mix, from Bleecker Street to Washington Square.",
    "Whether you own a townhouse near Washington Square Park dealing with an aging foundation, manage NYU-affiliated housing with high tenant turnover, or run a restaurant along MacDougal Street, Greenwich Village Exterminator offers a free inspection, a written estimate, and one flat $199/hr rate.",
  ],
  neighborhoodChallenges: [
    { title: 'Narrow Townhouse Foundations', body: "Greenwich Village's narrow 19th-century townhouses often have aging foundations and shared party walls with neighboring buildings, letting pests move laterally through a whole row of houses if only one is treated." },
    { title: 'High Student Tenant Turnover', body: "NYU-adjacent housing sees heavy tenant turnover every semester, which raises bed bug risk from move-in/move-out cycles. We offer fast-turnaround inspection and treatment timed to lease changeovers." },
    { title: 'Shared Airshaft Walk-Ups', body: "Village walk-up buildings frequently share narrow airshafts between units, a common cockroach and pigeon pathway that requires coordinated, building-wide treatment rather than single-apartment spot treatment." },
    { title: 'MacDougal & Bleecker Restaurant Row', body: 'The dense restaurant corridor along MacDougal and Bleecker Streets faces regular DOH inspection pressure. We provide documented commercial treatment for kitchens throughout the Village.' },
  ],
  localFaqs: [
    { question: 'Do you treat NYU-affiliated or student housing in the Village?', answer: 'Yes — we regularly service NYU-adjacent buildings and understand the bed bug and turnover risk that comes with high student tenant turnover each semester.' },
    { question: 'Can you treat a whole row of connected townhouses?', answer: "Yes, when pests are moving through shared party walls or foundations, we coordinate treatment across connected townhouses rather than treating just one unit in isolation." },
    { question: 'Do you handle restaurant pest control on MacDougal or Bleecker Street?', answer: 'Yes, including DOH-compliant documentation for the restaurant corridor throughout Greenwich Village.' },
  ],
}
