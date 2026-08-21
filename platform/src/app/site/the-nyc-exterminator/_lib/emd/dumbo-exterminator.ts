import type { NeighborhoodMicrositeConfig } from './types'

export const dumboExterminatorConfig: NeighborhoodMicrositeConfig = {
  domain: 'dumboexterminator.com',
  slug: 'dumbo-exterminator',
  brandName: 'DUMBO Exterminator',
  neighborhoodName: 'DUMBO',
  borough: 'Brooklyn',
  metaTitle: 'DUMBO Exterminator | DUMBO Pest Control | NYC Exterminator & Pest Control Services',
  metaDescription: 'DUMBO Exterminator — licensed DUMBO pest control for converted warehouses and waterfront buildings at a flat $199/hr. Cockroach, mouse & rat extermination under the Manhattan Bridge. Part of The NYC Exterminator. Call/text (212) 202-8545, free inspection, 24/7 booking.',
  geo: { lat: '40.7033', lng: '-73.9894' },
  introParagraphs: [
    "DUMBO Exterminator is the pest control team behind The NYC Exterminator dedicated to Down Under the Manhattan Bridge Overpass — the converted 19th-century warehouses, cobblestone streets, and waterfront towers between the Manhattan and Brooklyn Bridges. Whether you searched 'DUMBO exterminator' or 'DUMBO pest control,' you've reached the same licensed technicians and flat $199/hr rate as every NYC Exterminator job.",
    "DUMBO's building stock is almost entirely converted industrial space — former factories and warehouses turned into loft apartments, tech offices, and ground-floor retail. That conversion history means old freight elevator shafts, exposed brick, and large shared basements that create very different pest pathways than typical residential construction.",
    "Whether you're in a converted loft on Water Street, run an office in one of DUMBO's tech-company buildings, or manage retail near the Empire Stores waterfront development, DUMBO Exterminator offers a free inspection, a written estimate, and one flat hourly rate — no contracts, no hidden fees.",
  ],
  neighborhoodChallenges: [
    { title: 'Converted Warehouse Freight Shafts', body: "DUMBO's converted factory buildings still have original freight elevator shafts and loading dock openings — large, often poorly sealed entry points that give rodents and roaches direct access between floors and to the street." },
    { title: 'Waterfront Moisture & Flooding Risk', body: "DUMBO's proximity to the East River waterfront means basements and ground floors face higher moisture and occasional flood risk, conditions that attract American cockroaches and drain flies. We treat with waterfront-specific attention to sump areas and drains." },
    { title: 'Cobblestone Street & Utility Access', body: "DUMBO's cobblestone streets sit over older utility infrastructure with gaps that let rodents move between the street and building basements. We coordinate exterior perimeter treatment with interior work." },
    { title: 'Shared Tech-Office & Retail Floors', body: 'Large converted floors shared between tech offices, retail, and event spaces mean pest activity in one tenant space often affects neighbors. We work with building management for coordinated, floor-wide treatment when needed.' },
  ],
  localFaqs: [
    { question: 'Do you treat converted warehouse and loft buildings in DUMBO?', answer: "Yes — DUMBO Exterminator's technicians specifically train on the freight elevator shafts, exposed brick, and large shared basements common in DUMBO's converted industrial buildings." },
    { question: 'Do you handle office and commercial pest control in DUMBO?', answer: 'Yes, including tech-company offices and retail spaces in converted warehouse buildings throughout DUMBO.' },
    { question: 'Do you treat for pests related to waterfront moisture?', answer: "Yes — DUMBO's East River proximity creates moisture conditions in basements and ground floors that we specifically account for during inspection." },
  ],
}
