import type { LocalFAQ } from './types'

export const PARENT_TAG = 'A Wash and Fold NYC Company'
export const PARENT_BRAND_NAME = 'Wash and Fold NYC'
export const SITE_URL = 'https://www.washandfoldnyc.com'
export const PHONE_DISPLAY = '(917) 970-6002'
export const PHONE_SMS = 'sms:9179706002'
export const EMAIL = 'hi@washandfoldnyc.com'
export const ADDRESS = '150 West 47th Street, Midtown Manhattan, NY 10036'
// /book/collect is the real, live intake form (name/email/phone/address) —
// /book/new used to be the CTA target but redirected to a dead leftover
// nycmaid URL and 404'd; fixed 2026-08-21 to forward here instead.
export const BOOK_URL = `${SITE_URL}/book/collect`
export const PRIVACY_URL = `${SITE_URL}/privacy-policy`

// Verbatim from washandfoldnyc.com's own published homepage FAQ — reused
// here rather than invented, so every claim on the microsite traces back to
// something the parent site already states publicly.
export const GENERAL_FAQS: LocalFAQ[] = [
  {
    question: 'How much does wash and fold cost?',
    answer:
      'Wash and fold is $3 per pound with a $39 minimum order. This includes sorting by color and fabric, individual stain pre-treatment, premium detergent, proper drying, hand-folding, organizing by garment type, and sealed clean-bag packaging. Pickup and delivery is free on every order over the minimum. Same-day rush is available for a flat $20 fee on orders received before 10am. Weekly subscribers save 10%, biweekly subscribers save 5%. The rate is the same in every neighborhood we serve — no zone fees, no surge pricing.',
  },
  {
    question: 'How does pickup and delivery work?',
    answer:
      `Text or call ${PHONE_DISPLAY} with your address and what you need. We confirm your order and schedule a pickup, usually within a few hours of your first text. Leave your bag at your door, in the lobby, or with your doorman — our driver grabs it and texts a confirmation. Your laundry runs through our 12-step process at our facility and comes back within 24–48 hours. Payment is collected after delivery; we never charge upfront.`,
  },
  {
    question: 'Do you offer dry cleaning?',
    answer:
      'Yes, with free pickup and delivery included. Handled by trusted local partner cleaners — we’re the pickup and delivery layer, returning garments pressed, finished, and in garment bags. Dress shirts $10, blouses $14, two-piece suits $34, dresses $28, pants $18, blazers $22, winter coats $45, down jackets $45, sweaters $18, ties $12, skirts $18, evening gowns $60, wedding dresses $350. Same-week turnaround on standard items.',
  },
  {
    question: 'How much are comforters and bulky items?',
    answer:
      'Flat rate rather than by the pound: twin comforters $35, full/queen $45, king $55, duvet covers $20, pillows $12 each, mattress pads $25, sleeping bags $30. Washed in commercial oversized machines your home washer or a laundromat can’t handle, then dried with proper airflow to restore loft. Pickup and delivery is free on all comforter orders.',
  },
  {
    question: 'Do you offer subscription plans?',
    answer:
      'Yes — the best value we offer. Weekly 15 lb is $162/mo (10% off, saves $18/mo). Weekly 20 lb is $216/mo (saves $24/mo). Biweekly 15 lb is $85.50/mo (5% off). Every plan includes a consistent pickup day, the same route driver every time, priority processing, and the ability to pause, skip, or cancel anytime — no fees, no contracts.',
  },
  {
    question: 'Is there a minimum order?',
    answer:
      'Yes, $39, which works out to about 13 lbs at $3/lb. It exists because pickup and delivery is free on every order. A typical single person’s weekly laundry is 10–15 lbs already, so most orders clear the minimum easily. If yours doesn’t, pick up every two weeks instead, or add sheets, towels, and throw blankets to push the weight over.',
  },
  {
    question: 'How fast is turnaround?',
    answer:
      'Standard turnaround is 24–48 hours from pickup. Orders placed before noon are typically ready the next day. Same-day rush is available for a flat $20 fee on orders picked up or dropped off before 10am. Weekly subscribers usually see under 24 hours since their order is flagged priority automatically.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      `Credit cards, debit cards, Zelle at ${EMAIL}, Venmo, Apple Pay, and cash. Subscription customers are billed automatically after each delivery. One-time orders are charged after delivery, never before — no deposits, no pre-authorization holds.`,
  },
  {
    question: 'How do you handle delicates and special items?',
    answer:
      'Every load is sorted by color and fabric before washing. Delicates — silk, lace, cashmere, anything beaded — go into mesh bags on a gentle cold cycle and are air-dried or laid flat, never machine-dried unless the label says it’s safe. Tell us any special instructions (cold wash only, fragrance-free, hang dry) when you schedule and we’ll follow them on every order.',
  },
  {
    question: 'What if something is damaged or lost?',
    answer:
      'We carry full general liability insurance. Contact us within 48 hours and we’ll work with you to resolve it. Every order is tagged and processed in its own separate batch, cross-checked against the intake count before packaging, so lost items are extremely rare — but if a mistake happens, we own it and make it right.',
  },
  {
    question: 'Can I request the same person each time?',
    answer:
      'Weekly and biweekly subscribers automatically get a consistent route driver who learns your building, your doorman, and your preferences. One-time orders get the best available driver based on route efficiency; tell us if you have a strong preference from a past order.',
  },
  {
    question: 'Do you serve businesses?',
    answer:
      `Yes — restaurants, salons, gyms, Airbnb hosts, and offices. Commercial pricing runs $1–$2/lb depending on volume and frequency, with daily or weekly pickup, invoice billing, and a dedicated account manager for accounts over 100 lbs/week. Text ${PHONE_DISPLAY} for a custom quote.`,
  },
  {
    question: 'How is this different from a laundromat?',
    answer:
      'Convenience, quality, and consistency. A laundromat costs you two to three hours of carrying, waiting, and folding, plus $2.50–$4 per load in machine fees before supplies. We text, you leave a bag at your door, and it comes back clean, folded, and organized in 24–48 hours — every order sorted, pre-treated, and hand-folded to the same standard every time.',
  },
  {
    question: 'What detergent do you use?',
    answer:
      'Premium commercial-grade detergent, more effective than consumer retail brands on commercial machines. Fragrance-free, eco-friendly, plant-based, and hypoallergenic options are all available at no extra charge — just tell us your preference once and it’s saved to your account.',
  },
  {
    question: 'What if I’m not home for delivery?',
    answer:
      'You don’t need to be. We leave laundry with your doorman or concierge, at your door, or in any secure spot you designate. You get a text the moment it’s delivered, including exactly where it was left.',
  },
  {
    question: 'How do I get started?',
    answer:
      `Text or call ${PHONE_DISPLAY} with your address and what you need. No app, no account, no contract. We confirm pricing, schedule your first pickup, and have a driver at your door as soon as same-day or next-day.`,
  },
  {
    question: 'Are you licensed and insured?',
    answer:
      `Yes — fully licensed, bonded, and insured in New York State, with general liability insurance covering your garments and property on every order. Every team member passes a background check before handling customer laundry. Business address: ${ADDRESS}.`,
  },
]
