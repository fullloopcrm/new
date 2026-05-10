// @ts-nocheck
/* ─── DSCR Services (18 total) ─── */

export interface Service {
  name: string;
  slug: string;
  tagline: string;
  shortDesc: string;
  description: string;
  features: string[];
}

export const services: Service[] = [
  {
    name: "DSCR Loans",
    slug: "dscr-loans",
    tagline: "Qualify Based on Property Cash Flow, Not Personal Income",
    shortDesc: "Investment property loans that use rental income instead of W-2s or tax returns.",
    description:
      "DSCR loans allow real estate investors to qualify based on the property's rental income rather than personal income. If the property's income covers the debt payments, you can get approved — making it ideal for self-employed investors, portfolio builders, and those with complex tax situations.",
    features: [
      "No personal income verification required",
      "Based on property cash flow (rent vs. mortgage payment)",
      "Available for single-family, multi-family, and short-term rentals",
      "Loan amounts from $100K to $5M+",
      "Interest-only options available",
      "Close in LLC or entity name",
      "Minimum DSCR typically 1.0–1.25",
      "30-year fixed and ARM options",
    ],
  },
  {
    name: "DSCR Loan Requirements",
    slug: "dscr-loan-requirements",
    tagline: "What You Need to Qualify for a DSCR Loan",
    shortDesc: "Credit scores, down payments, DSCR ratios, and property types that qualify.",
    description:
      "Understanding DSCR loan requirements helps you prepare before applying. While requirements vary by lender, most look at your credit score, down payment, and the property's debt service coverage ratio.",
    features: [
      "Minimum credit score: typically 620–680",
      "Down payment: 20–25% for most programs",
      "DSCR ratio of 1.0 or higher preferred",
      "Property must be investment (non-owner-occupied)",
      "Appraisal with rent schedule (1007 form)",
      "6+ months cash reserves typically required",
      "No DTI calculation needed",
      "Entity vesting allowed (LLC, Corp)",
    ],
  },
  {
    name: "DSCR Loan Rates",
    slug: "dscr-loan-rates",
    tagline: "Current DSCR Loan Interest Rates and Pricing",
    shortDesc: "How DSCR loan rates compare to conventional mortgages and what affects pricing.",
    description:
      "DSCR loan rates are typically 1–2% higher than conventional mortgages, reflecting the reduced documentation and investor-focused nature. Rates vary based on DSCR ratio, credit score, LTV, and loan amount.",
    features: [
      "Rates typically 1–2% above conventional",
      "Better DSCR ratio = better rate",
      "Higher credit scores reduce pricing",
      "Lower LTV (more equity) improves terms",
      "Prepayment penalty options affect rate",
      "Interest-only reduces monthly payment",
      "Rate buydown options available",
      "ARM vs. fixed rate tradeoffs",
    ],
  },
  {
    name: "DSCR Calculator",
    slug: "dscr-calculator",
    tagline: "Calculate Your Property's Debt Service Coverage Ratio",
    shortDesc: "Free DSCR calculator to determine if your investment property qualifies.",
    description:
      "The debt service coverage ratio is calculated by dividing the property's net operating income (or gross rental income) by the total debt service (mortgage payment including principal, interest, taxes, insurance, and HOA). A DSCR of 1.25 means the property generates 25% more income than needed to cover the mortgage.",
    features: [
      "DSCR = Rental Income ÷ PITIA (mortgage + taxes + insurance)",
      "1.0 DSCR = break-even (rent covers mortgage exactly)",
      "1.25+ DSCR = strong qualification",
      "Below 1.0 = negative cash flow (still possible with some lenders)",
      "Short-term rental income may use AirDNA or actual history",
      "Market rent from appraisal used for long-term rentals",
      "HOA dues included in debt service calculation",
      "Flood/hazard insurance included",
    ],
  },
  {
    name: "DSCR Loans for Short-Term Rentals",
    slug: "dscr-loans-short-term-rentals",
    tagline: "Finance Your Airbnb & Vacation Rental Investments",
    shortDesc: "DSCR loans specifically designed for short-term and vacation rental properties.",
    description:
      "Short-term rental DSCR loans use projected Airbnb or VRBO income to qualify. Lenders may use AirDNA projections, actual booking history, or a blend. These loans open the door for investors in high-tourism markets.",
    features: [
      "Use AirDNA or actual STR income for qualification",
      "Available for Airbnb, VRBO, and vacation rentals",
      "Higher income potential = better DSCR ratios",
      "Some lenders require 12-month STR track record",
      "Others accept projected income from day one",
      "Popular in tourism-heavy and destination cities",
      "Furnishing costs can sometimes be rolled in",
      "Property management income documentation accepted",
    ],
  },
  {
    name: "DSCR Loans for Multi-Family",
    slug: "dscr-loans-multi-family",
    tagline: "Scale Your Portfolio with Multi-Family DSCR Financing",
    shortDesc: "DSCR loans for 2–4 unit and 5+ unit multi-family investment properties.",
    description:
      "Multi-family properties are ideal for DSCR loans because multiple units generate higher combined rental income, often resulting in stronger DSCR ratios. Available for duplexes through large apartment buildings.",
    features: [
      "2–4 unit residential DSCR programs",
      "5+ unit commercial DSCR programs",
      "Combined rental income strengthens DSCR",
      "Portfolio lending for multiple properties",
      "Mixed-use properties may qualify",
      "Value-add and renovation strategies supported",
      "Bridge-to-DSCR loan programs available",
      "Blanket loans for multiple properties",
    ],
  },
  {
    name: "DSCR Loan Tips",
    slug: "dscr-loan-tips",
    tagline: "Expert Tips to Get the Best DSCR Loan Terms",
    shortDesc: "Insider strategies for maximizing approval odds and minimizing costs.",
    description:
      "Getting the best DSCR loan comes down to preparation. From improving your DSCR ratio to choosing the right lender, these tips help investors secure better rates and terms.",
    features: [
      "Increase rent before applying to boost DSCR",
      "Shop multiple DSCR lenders for best terms",
      "Consider interest-only to improve cash flow",
      "Use a larger down payment for better rates",
      "Get a rent survey before the appraisal",
      "Choose prepayment penalty structure wisely",
      "Build reserves — most require 6+ months",
      "Work with a DSCR-experienced mortgage broker",
    ],
  },
  {
    name: "DSCR vs. Conventional Loans",
    slug: "dscr-vs-conventional-loans",
    tagline: "How DSCR Loans Compare to Traditional Mortgages",
    shortDesc: "Side-by-side comparison of DSCR loans and conventional investment property loans.",
    description:
      "DSCR loans and conventional loans both finance investment properties, but they work very differently. Understanding the tradeoffs helps you pick the right tool for your investing strategy.",
    features: [
      "DSCR: no income docs; Conventional: full income verification",
      "DSCR: typically 20-25% down; Conventional: 15-25% down",
      "DSCR: higher rates; Conventional: lower rates",
      "DSCR: unlimited properties; Conventional: 10-property limit",
      "DSCR: close in LLC; Conventional: personal name only",
      "DSCR: faster closing; Conventional: longer underwriting",
      "DSCR: no DTI limit; Conventional: 45-50% DTI max",
      "DSCR: prepayment penalties common; Conventional: usually none",
    ],
  },
  {
    name: "DSCR Loans for Single-Family Rentals",
    slug: "dscr-loans-single-family",
    tagline: "The Most Popular DSCR Loan Product for Individual Investors",
    shortDesc: "DSCR financing for single-family rental homes — the bread and butter of investor lending.",
    description:
      "Single-family rentals are the most common property type financed with DSCR loans. One unit, one tenant, predictable cash flow — lenders love the simplicity and investors love the scalability.",
    features: [
      "Most widely available DSCR product",
      "Loan amounts from $75K to $2M+",
      "Rural, suburban, and urban properties eligible",
      "Detached homes, townhomes, and PUDs",
      "Warrantable and non-warrantable options",
      "Rehab-to-rent programs available",
      "Lowest minimum DSCR requirements",
      "Easiest appraisal and rent comp process",
    ],
  },
  {
    name: "DSCR Loans for Condos & Condotels",
    slug: "dscr-loans-condos-condotels",
    tagline: "DSCR Financing for Condominiums and Condo-Hotel Properties",
    shortDesc: "Specialized DSCR programs for warrantable condos, non-warrantable condos, and condotels.",
    description:
      "Condos and condotels present unique challenges for DSCR lending — HOA financials, warrantability, and hotel-condo hybrid structures. Specialized DSCR programs exist for each.",
    features: [
      "Warrantable condo DSCR programs (standard)",
      "Non-warrantable condo programs (higher rates)",
      "Condotel/condo-hotel financing available",
      "HOA dues factored into DSCR calculation",
      "Resort and vacation condo programs",
      "Investor concentration limits may apply",
      "Budget and reserve review required",
      "Some lenders require condo questionnaire",
    ],
  },
  {
    name: "DSCR Loans for New Construction",
    slug: "dscr-loans-new-construction",
    tagline: "Finance Newly Built Investment Properties with DSCR Loans",
    shortDesc: "DSCR loans for newly constructed rental properties — skip the build risk, start cash flowing.",
    description:
      "New construction DSCR loans let investors purchase brand-new rental properties using projected market rents for qualification. Lower maintenance costs and modern features attract premium tenants.",
    features: [
      "Purchase newly built investment properties",
      "Use projected market rents for DSCR qualification",
      "Lower maintenance reserves needed",
      "Builder incentives can reduce out-of-pocket costs",
      "Energy-efficient homes attract higher rents",
      "Some programs allow spec home purchases",
      "Construction-to-perm DSCR programs available",
      "New builds often appraise higher",
    ],
  },
  {
    name: "DSCR Loans for Mixed-Use Properties",
    slug: "dscr-loans-mixed-use",
    tagline: "DSCR Financing for Properties with Residential and Commercial Tenants",
    shortDesc: "Mixed-use DSCR loans for buildings combining retail, office, and residential units.",
    description:
      "Mixed-use properties generate income from both commercial and residential tenants. DSCR lenders evaluate the combined rental income to qualify — but requirements and available programs vary.",
    features: [
      "Commercial + residential income combined for DSCR",
      "Typically requires 51%+ residential use",
      "Higher down payments (25-30%) common",
      "Storefront + apartments above is classic structure",
      "Live/work spaces may qualify",
      "Fewer lenders offer mixed-use DSCR programs",
      "Commercial leases strengthen DSCR ratios",
      "Zoning verification required",
    ],
  },
  {
    name: "DSCR Portfolio Loans",
    slug: "dscr-portfolio-loans",
    tagline: "Blanket DSCR Loans for Multiple Investment Properties",
    shortDesc: "Finance 2–20+ properties under one DSCR loan with a single closing and one monthly payment.",
    description:
      "Portfolio DSCR loans (also called blanket loans) let investors finance multiple properties under a single mortgage. One closing, one payment, one DSCR calculation across the entire portfolio.",
    features: [
      "Finance 2–20+ properties in one loan",
      "Single closing reduces costs",
      "One monthly payment for all properties",
      "Cross-collateralized portfolio structure",
      "Release clauses available for individual sales",
      "Aggregate DSCR across all properties",
      "Ideal for scaling quickly",
      "Portfolio rates often better than individual loans",
    ],
  },
  {
    name: "DSCR Cash-Out Refinance",
    slug: "dscr-cash-out-refinance",
    tagline: "Pull Equity from Investment Properties Without Income Verification",
    shortDesc: "Access your rental property equity via DSCR cash-out refinance — no tax returns needed.",
    description:
      "DSCR cash-out refinance lets you tap into the equity of your investment properties without showing personal income. Use the funds to acquire more properties, renovate existing ones, or consolidate debt.",
    features: [
      "Access up to 75-80% LTV on cash-out",
      "No income docs — qualify on property cash flow",
      "Use proceeds to buy more investment properties",
      "Consolidate high-interest debt",
      "Fund renovations and value-add projects",
      "No seasoning required with some lenders",
      "6-month seasoning typical for most programs",
      "Rate-and-term refinance also available",
    ],
  },
  {
    name: "DSCR Loans for Foreign Nationals",
    slug: "dscr-loans-foreign-nationals",
    tagline: "US Investment Property Financing for Non-US Citizens",
    shortDesc: "DSCR loans available to foreign nationals investing in US real estate — no SSN required.",
    description:
      "Foreign national DSCR loans allow non-US citizens to purchase investment properties in the United States. Since DSCR loans don't require income verification, foreign investors can qualify based solely on the property's rental income.",
    features: [
      "No SSN or ITIN required with some lenders",
      "ITIN programs available for broader options",
      "Passport and visa documentation required",
      "Higher down payments (25-30%) typical",
      "US bank account usually required",
      "Foreign income not needed for qualification",
      "Entity vesting (US LLC) strongly recommended",
      "Available in most US states",
    ],
  },
  {
    name: "DSCR Bridge-to-Perm Loans",
    slug: "dscr-bridge-to-perm",
    tagline: "Short-Term Bridge Financing That Converts to a DSCR Permanent Loan",
    shortDesc: "Bridge loans for acquisition or rehab that automatically convert to long-term DSCR financing.",
    description:
      "Bridge-to-perm DSCR programs combine a short-term bridge loan (for purchase or renovation) with an automatic conversion to a permanent DSCR loan once the property is stabilized and rented.",
    features: [
      "12-24 month bridge period for rehab/stabilization",
      "Automatic conversion to 30-year DSCR loan",
      "Single closing saves time and money",
      "Renovation funds included in bridge phase",
      "DSCR calculated on projected post-rehab rents",
      "Ideal for BRRRR strategy investors",
      "No requalification needed at conversion",
      "Interest-only during bridge phase",
    ],
  },
  {
    name: "DSCR Loans for Commercial Properties",
    slug: "dscr-loans-commercial",
    tagline: "DSCR Financing for 5+ Unit Apartment Buildings and Commercial Real Estate",
    shortDesc: "Commercial DSCR loans for larger apartment buildings and commercial investment properties.",
    description:
      "Commercial DSCR loans cover 5+ unit apartment buildings, office buildings, retail centers, and other commercial investment properties. These loans use the property's net operating income (NOI) for qualification.",
    features: [
      "5+ unit apartment buildings",
      "Office and retail investment properties",
      "NOI-based DSCR calculation",
      "Loan amounts from $500K to $25M+",
      "25-30 year amortization typical",
      "Recourse and non-recourse options",
      "Requires trailing 12-month financials (T-12)",
      "Rent rolls and operating statements required",
    ],
  },
  {
    name: "DSCR Loans for Fix & Rent (BRRRR)",
    slug: "dscr-loans-fix-and-rent-brrrr",
    tagline: "DSCR Financing for the Buy, Rehab, Rent, Refinance, Repeat Strategy",
    shortDesc: "Purpose-built DSCR programs for BRRRR investors — buy distressed, rehab, rent, refinance, repeat.",
    description:
      "The BRRRR strategy (Buy, Rehab, Rent, Refinance, Repeat) is one of the most powerful wealth-building methods in real estate. DSCR loans are the perfect refinance vehicle — qualify on the new rental income after rehab, pull cash out, and repeat.",
    features: [
      "Refinance after rehab using new appraised value",
      "DSCR calculated on post-rehab market rents",
      "Cash-out to recover rehab and down payment costs",
      "6-month minimum seasoning with most lenders",
      "Some programs offer no-seasoning cash-out",
      "Pairs with hard money or bridge for acquisition",
      "Repeat the cycle to scale portfolio",
      "Value-add increases both equity and DSCR ratio",
    ],
  },
];

/* ─── 600+ Cities organized by State ─── */

export interface City {
  name: string;
  slug: string;
  state: string;
  stateAbbr: string;
  region: string;
}

export const cities: City[] = [
  // Alabama
  { name: "Birmingham", slug: "birmingham", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Huntsville", slug: "huntsville", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Montgomery", slug: "montgomery", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Mobile", slug: "mobile", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Tuscaloosa", slug: "tuscaloosa", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Hoover", slug: "hoover", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Auburn", slug: "auburn-al", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Decatur", slug: "decatur-al", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Madison", slug: "madison-al", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Dothan", slug: "dothan", state: "Alabama", stateAbbr: "AL", region: "Southeast" },
  { name: "Florence", slug: "florence-al", state: "Alabama", stateAbbr: "AL", region: "Southeast" },

  // Alaska
  { name: "Anchorage", slug: "anchorage", state: "Alaska", stateAbbr: "AK", region: "West" },

  // Arizona
  { name: "Phoenix", slug: "phoenix", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Tucson", slug: "tucson", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Mesa", slug: "mesa", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Scottsdale", slug: "scottsdale", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Chandler", slug: "chandler", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Gilbert", slug: "gilbert", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Tempe", slug: "tempe", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Peoria", slug: "peoria-az", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Surprise", slug: "surprise", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Goodyear", slug: "goodyear", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Glendale", slug: "glendale-az", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Buckeye", slug: "buckeye", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Maricopa", slug: "maricopa", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Casa Grande", slug: "casa-grande", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Flagstaff", slug: "flagstaff", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },
  { name: "Queen Creek", slug: "queen-creek", state: "Arizona", stateAbbr: "AZ", region: "Southwest" },

  // Arkansas
  { name: "Little Rock", slug: "little-rock", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Fayetteville", slug: "fayetteville-ar", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Fort Smith", slug: "fort-smith", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Jonesboro", slug: "jonesboro", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Springdale", slug: "springdale", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Rogers", slug: "rogers", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Conway", slug: "conway", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },
  { name: "Bentonville", slug: "bentonville", state: "Arkansas", stateAbbr: "AR", region: "Southeast" },

  // California
  { name: "Los Angeles", slug: "los-angeles", state: "California", stateAbbr: "CA", region: "West" },
  { name: "San Francisco", slug: "san-francisco", state: "California", stateAbbr: "CA", region: "West" },
  { name: "San Diego", slug: "san-diego", state: "California", stateAbbr: "CA", region: "West" },
  { name: "San Jose", slug: "san-jose", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Sacramento", slug: "sacramento", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Fresno", slug: "fresno", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Long Beach", slug: "long-beach", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Oakland", slug: "oakland", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Bakersfield", slug: "bakersfield", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Anaheim", slug: "anaheim", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Riverside", slug: "riverside", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Santa Ana", slug: "santa-ana", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Irvine", slug: "irvine", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Stockton", slug: "stockton", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Modesto", slug: "modesto", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Fremont", slug: "fremont", state: "California", stateAbbr: "CA", region: "West" },
  { name: "San Bernardino", slug: "san-bernardino", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Fontana", slug: "fontana", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Moreno Valley", slug: "moreno-valley", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Santa Clarita", slug: "santa-clarita", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Oxnard", slug: "oxnard", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Ontario", slug: "ontario-ca", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Rancho Cucamonga", slug: "rancho-cucamonga", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Oceanside", slug: "oceanside", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Elk Grove", slug: "elk-grove", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Palm Springs", slug: "palm-springs", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Visalia", slug: "visalia", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Roseville", slug: "roseville", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Concord", slug: "concord-ca", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Thousand Oaks", slug: "thousand-oaks", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Simi Valley", slug: "simi-valley", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Clovis", slug: "clovis", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Carlsbad", slug: "carlsbad", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Temecula", slug: "temecula", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Murrieta", slug: "murrieta", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Victorville", slug: "victorville", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Vallejo", slug: "vallejo", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Hayward", slug: "hayward", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Sunnyvale", slug: "sunnyvale", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Santa Rosa", slug: "santa-rosa", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Corona", slug: "corona", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Pomona", slug: "pomona", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Escondido", slug: "escondido", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Torrance", slug: "torrance", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Pasadena", slug: "pasadena-ca", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Chula Vista", slug: "chula-vista", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Palmdale", slug: "palmdale", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Lancaster", slug: "lancaster-ca", state: "California", stateAbbr: "CA", region: "West" },
  { name: "Salinas", slug: "salinas", state: "California", stateAbbr: "CA", region: "West" },

  // Colorado
  { name: "Denver", slug: "denver", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Colorado Springs", slug: "colorado-springs", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Aurora", slug: "aurora-co", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Fort Collins", slug: "fort-collins", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Lakewood", slug: "lakewood", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Boulder", slug: "boulder", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Thornton", slug: "thornton", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Arvada", slug: "arvada", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Westminster", slug: "westminster-co", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Pueblo", slug: "pueblo", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Centennial", slug: "centennial", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Longmont", slug: "longmont", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Loveland", slug: "loveland", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Castle Rock", slug: "castle-rock", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Greeley", slug: "greeley", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Parker", slug: "parker-co", state: "Colorado", stateAbbr: "CO", region: "West" },
  { name: "Commerce City", slug: "commerce-city", state: "Colorado", stateAbbr: "CO", region: "West" },

  // Connecticut
  { name: "Bridgeport", slug: "bridgeport", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "New Haven", slug: "new-haven", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "Stamford", slug: "stamford", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "Hartford", slug: "hartford", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "Waterbury", slug: "waterbury", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "Danbury", slug: "danbury", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "Norwalk", slug: "norwalk", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },
  { name: "New Britain", slug: "new-britain", state: "Connecticut", stateAbbr: "CT", region: "Northeast" },

  // Delaware
  { name: "Wilmington", slug: "wilmington-de", state: "Delaware", stateAbbr: "DE", region: "Northeast" },
  { name: "Dover", slug: "dover", state: "Delaware", stateAbbr: "DE", region: "Northeast" },
  { name: "Newark", slug: "newark-de", state: "Delaware", stateAbbr: "DE", region: "Northeast" },
  { name: "Middletown", slug: "middletown-de", state: "Delaware", stateAbbr: "DE", region: "Northeast" },

  // Florida
  { name: "Miami", slug: "miami", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Orlando", slug: "orlando", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Tampa", slug: "tampa", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Jacksonville", slug: "jacksonville", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "St. Petersburg", slug: "st-petersburg", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Fort Lauderdale", slug: "fort-lauderdale", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Cape Coral", slug: "cape-coral", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Tallahassee", slug: "tallahassee", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Fort Myers", slug: "fort-myers", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Port St. Lucie", slug: "port-st-lucie", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Hialeah", slug: "hialeah", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Pembroke Pines", slug: "pembroke-pines", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Hollywood", slug: "hollywood-fl", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Gainesville", slug: "gainesville-fl", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Coral Springs", slug: "coral-springs", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Clearwater", slug: "clearwater", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Palm Bay", slug: "palm-bay", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Lakeland", slug: "lakeland", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "West Palm Beach", slug: "west-palm-beach", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Boca Raton", slug: "boca-raton", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Naples", slug: "naples", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Sarasota", slug: "sarasota", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Kissimmee", slug: "kissimmee", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Daytona Beach", slug: "daytona-beach", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Ocala", slug: "ocala", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Pensacola", slug: "pensacola", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Deltona", slug: "deltona", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Melbourne", slug: "melbourne", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Pompano Beach", slug: "pompano-beach", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Plantation", slug: "plantation", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Sunrise", slug: "sunrise", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Deerfield Beach", slug: "deerfield-beach", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Boynton Beach", slug: "boynton-beach", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Delray Beach", slug: "delray-beach", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Jupiter", slug: "jupiter", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Miramar", slug: "miramar", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Davie", slug: "davie", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Largo", slug: "largo", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Sanford", slug: "sanford", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Doral", slug: "doral", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Homestead", slug: "homestead", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Apopka", slug: "apopka", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Palm Coast", slug: "palm-coast", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Winter Haven", slug: "winter-haven", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Bradenton", slug: "bradenton", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Coconut Creek", slug: "coconut-creek", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Tamarac", slug: "tamarac", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "North Port", slug: "north-port", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Wesley Chapel", slug: "wesley-chapel", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Bonita Springs", slug: "bonita-springs", state: "Florida", stateAbbr: "FL", region: "Southeast" },
  { name: "Panama City", slug: "panama-city-fl", state: "Florida", stateAbbr: "FL", region: "Southeast" },

  // Georgia
  { name: "Atlanta", slug: "atlanta", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Savannah", slug: "savannah", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Augusta", slug: "augusta", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Columbus", slug: "columbus-ga", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Macon", slug: "macon", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Athens", slug: "athens-ga", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Sandy Springs", slug: "sandy-springs", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Roswell", slug: "roswell", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Marietta", slug: "marietta", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Johns Creek", slug: "johns-creek", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Alpharetta", slug: "alpharetta", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Smyrna", slug: "smyrna-ga", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Brookhaven", slug: "brookhaven", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Peachtree City", slug: "peachtree-city", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Warner Robins", slug: "warner-robins", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Albany", slug: "albany-ga", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Valdosta", slug: "valdosta", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Kennesaw", slug: "kennesaw", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Dunwoody", slug: "dunwoody", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Newnan", slug: "newnan", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Gainesville", slug: "gainesville-ga", state: "Georgia", stateAbbr: "GA", region: "Southeast" },
  { name: "Dalton", slug: "dalton", state: "Georgia", stateAbbr: "GA", region: "Southeast" },

  // Hawaii
  { name: "Honolulu", slug: "honolulu", state: "Hawaii", stateAbbr: "HI", region: "West" },
  { name: "Kailua", slug: "kailua", state: "Hawaii", stateAbbr: "HI", region: "West" },
  { name: "Kapolei", slug: "kapolei", state: "Hawaii", stateAbbr: "HI", region: "West" },

  // Idaho
  { name: "Boise", slug: "boise", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Meridian", slug: "meridian", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Nampa", slug: "nampa", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Idaho Falls", slug: "idaho-falls", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Caldwell", slug: "caldwell", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Pocatello", slug: "pocatello", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Coeur d'Alene", slug: "coeur-d-alene", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Twin Falls", slug: "twin-falls", state: "Idaho", stateAbbr: "ID", region: "West" },
  { name: "Eagle", slug: "eagle", state: "Idaho", stateAbbr: "ID", region: "West" },

  // Illinois
  { name: "Chicago", slug: "chicago", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Aurora", slug: "aurora-il", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Naperville", slug: "naperville", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Rockford", slug: "rockford", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Joliet", slug: "joliet", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Springfield", slug: "springfield-il", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Peoria", slug: "peoria-il", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Elgin", slug: "elgin", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Champaign", slug: "champaign", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Waukegan", slug: "waukegan", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Cicero", slug: "cicero", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Bloomington", slug: "bloomington-il", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Arlington Heights", slug: "arlington-heights", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Schaumburg", slug: "schaumburg", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Evanston", slug: "evanston", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Bolingbrook", slug: "bolingbrook", state: "Illinois", stateAbbr: "IL", region: "Midwest" },
  { name: "Decatur", slug: "decatur-il", state: "Illinois", stateAbbr: "IL", region: "Midwest" },

  // Indiana
  { name: "Indianapolis", slug: "indianapolis", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Fort Wayne", slug: "fort-wayne", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Evansville", slug: "evansville", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "South Bend", slug: "south-bend", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Carmel", slug: "carmel", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Fishers", slug: "fishers", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Bloomington", slug: "bloomington-in", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Hammond", slug: "hammond", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Lafayette", slug: "lafayette-in", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Muncie", slug: "muncie", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Noblesville", slug: "noblesville", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Terre Haute", slug: "terre-haute", state: "Indiana", stateAbbr: "IN", region: "Midwest" },
  { name: "Greenwood", slug: "greenwood", state: "Indiana", stateAbbr: "IN", region: "Midwest" },

  // Iowa
  { name: "Des Moines", slug: "des-moines", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Cedar Rapids", slug: "cedar-rapids", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Davenport", slug: "davenport", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Iowa City", slug: "iowa-city", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Sioux City", slug: "sioux-city", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Waterloo", slug: "waterloo-ia", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Ames", slug: "ames", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "Council Bluffs", slug: "council-bluffs", state: "Iowa", stateAbbr: "IA", region: "Midwest" },
  { name: "West Des Moines", slug: "west-des-moines", state: "Iowa", stateAbbr: "IA", region: "Midwest" },

  // Kansas
  { name: "Wichita", slug: "wichita", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Overland Park", slug: "overland-park", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Kansas City", slug: "kansas-city-ks", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Olathe", slug: "olathe", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Topeka", slug: "topeka", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Lawrence", slug: "lawrence", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Lenexa", slug: "lenexa", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Manhattan", slug: "manhattan-ks", state: "Kansas", stateAbbr: "KS", region: "Midwest" },
  { name: "Shawnee", slug: "shawnee-ks", state: "Kansas", stateAbbr: "KS", region: "Midwest" },

  // Kentucky
  { name: "Louisville", slug: "louisville", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Lexington", slug: "lexington", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Bowling Green", slug: "bowling-green", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Owensboro", slug: "owensboro", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Covington", slug: "covington", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Georgetown", slug: "georgetown-ky", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Florence", slug: "florence-ky", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },
  { name: "Richmond", slug: "richmond-ky", state: "Kentucky", stateAbbr: "KY", region: "Southeast" },

  // Louisiana
  { name: "New Orleans", slug: "new-orleans", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Baton Rouge", slug: "baton-rouge", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Shreveport", slug: "shreveport", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Lafayette", slug: "lafayette", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Lake Charles", slug: "lake-charles", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Kenner", slug: "kenner", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Bossier City", slug: "bossier-city", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Monroe", slug: "monroe-la", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },
  { name: "Alexandria", slug: "alexandria-la", state: "Louisiana", stateAbbr: "LA", region: "Southeast" },

  // Maine
  { name: "Portland", slug: "portland-me", state: "Maine", stateAbbr: "ME", region: "Northeast" },
  { name: "Lewiston", slug: "lewiston", state: "Maine", stateAbbr: "ME", region: "Northeast" },
  { name: "Bangor", slug: "bangor", state: "Maine", stateAbbr: "ME", region: "Northeast" },
  { name: "South Portland", slug: "south-portland", state: "Maine", stateAbbr: "ME", region: "Northeast" },

  // Maryland
  { name: "Baltimore", slug: "baltimore", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Frederick", slug: "frederick", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Rockville", slug: "rockville", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Columbia", slug: "columbia-md", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Silver Spring", slug: "silver-spring", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Germantown", slug: "germantown", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Bowie", slug: "bowie", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Gaithersburg", slug: "gaithersburg", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Annapolis", slug: "annapolis", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "Hagerstown", slug: "hagerstown", state: "Maryland", stateAbbr: "MD", region: "Northeast" },
  { name: "College Park", slug: "college-park", state: "Maryland", stateAbbr: "MD", region: "Northeast" },

  // Massachusetts
  { name: "Boston", slug: "boston", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Worcester", slug: "worcester", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Springfield", slug: "springfield-ma", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Cambridge", slug: "cambridge", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Lowell", slug: "lowell", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Brockton", slug: "brockton", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "New Bedford", slug: "new-bedford", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Quincy", slug: "quincy", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Lynn", slug: "lynn", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Fall River", slug: "fall-river", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },
  { name: "Somerville", slug: "somerville", state: "Massachusetts", stateAbbr: "MA", region: "Northeast" },

  // Michigan
  { name: "Detroit", slug: "detroit", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Grand Rapids", slug: "grand-rapids", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Warren", slug: "warren", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Sterling Heights", slug: "sterling-heights", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Ann Arbor", slug: "ann-arbor", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Lansing", slug: "lansing", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Flint", slug: "flint", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Kalamazoo", slug: "kalamazoo", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Dearborn", slug: "dearborn", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Livonia", slug: "livonia", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Troy", slug: "troy-mi", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Westland", slug: "westland", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Farmington Hills", slug: "farmington-hills", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Rochester Hills", slug: "rochester-hills", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Wyoming", slug: "wyoming-mi", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Kentwood", slug: "kentwood", state: "Michigan", stateAbbr: "MI", region: "Midwest" },
  { name: "Muskegon", slug: "muskegon", state: "Michigan", stateAbbr: "MI", region: "Midwest" },

  // Minnesota
  { name: "Minneapolis", slug: "minneapolis", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "St. Paul", slug: "st-paul", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Rochester", slug: "rochester-mn", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Bloomington", slug: "bloomington-mn", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Duluth", slug: "duluth", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Brooklyn Park", slug: "brooklyn-park", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Plymouth", slug: "plymouth-mn", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Maple Grove", slug: "maple-grove", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Woodbury", slug: "woodbury", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Lakeville", slug: "lakeville", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Eagan", slug: "eagan", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "St. Cloud", slug: "st-cloud", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },
  { name: "Eden Prairie", slug: "eden-prairie", state: "Minnesota", stateAbbr: "MN", region: "Midwest" },

  // Mississippi
  { name: "Jackson", slug: "jackson-ms", state: "Mississippi", stateAbbr: "MS", region: "Southeast" },
  { name: "Gulfport", slug: "gulfport", state: "Mississippi", stateAbbr: "MS", region: "Southeast" },
  { name: "Southaven", slug: "southaven", state: "Mississippi", stateAbbr: "MS", region: "Southeast" },
  { name: "Hattiesburg", slug: "hattiesburg", state: "Mississippi", stateAbbr: "MS", region: "Southeast" },
  { name: "Biloxi", slug: "biloxi", state: "Mississippi", stateAbbr: "MS", region: "Southeast" },
  { name: "Tupelo", slug: "tupelo", state: "Mississippi", stateAbbr: "MS", region: "Southeast" },

  // Missouri
  { name: "Kansas City", slug: "kansas-city-mo", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "St. Louis", slug: "st-louis", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "Springfield", slug: "springfield-mo", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "Columbia", slug: "columbia-mo", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "Independence", slug: "independence", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "Lee's Summit", slug: "lees-summit", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "O'Fallon", slug: "ofallon-mo", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "St. Joseph", slug: "st-joseph", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "St. Charles", slug: "st-charles", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "Blue Springs", slug: "blue-springs", state: "Missouri", stateAbbr: "MO", region: "Midwest" },
  { name: "Joplin", slug: "joplin", state: "Missouri", stateAbbr: "MO", region: "Midwest" },

  // Montana
  { name: "Billings", slug: "billings", state: "Montana", stateAbbr: "MT", region: "West" },
  { name: "Missoula", slug: "missoula", state: "Montana", stateAbbr: "MT", region: "West" },
  { name: "Great Falls", slug: "great-falls", state: "Montana", stateAbbr: "MT", region: "West" },
  { name: "Bozeman", slug: "bozeman", state: "Montana", stateAbbr: "MT", region: "West" },
  { name: "Helena", slug: "helena", state: "Montana", stateAbbr: "MT", region: "West" },

  // Nebraska
  { name: "Omaha", slug: "omaha", state: "Nebraska", stateAbbr: "NE", region: "Midwest" },
  { name: "Lincoln", slug: "lincoln", state: "Nebraska", stateAbbr: "NE", region: "Midwest" },
  { name: "Bellevue", slug: "bellevue-ne", state: "Nebraska", stateAbbr: "NE", region: "Midwest" },
  { name: "Grand Island", slug: "grand-island", state: "Nebraska", stateAbbr: "NE", region: "Midwest" },
  { name: "Papillion", slug: "papillion", state: "Nebraska", stateAbbr: "NE", region: "Midwest" },

  // Nevada
  { name: "Las Vegas", slug: "las-vegas", state: "Nevada", stateAbbr: "NV", region: "West" },
  { name: "Henderson", slug: "henderson", state: "Nevada", stateAbbr: "NV", region: "West" },
  { name: "Reno", slug: "reno", state: "Nevada", stateAbbr: "NV", region: "West" },
  { name: "North Las Vegas", slug: "north-las-vegas", state: "Nevada", stateAbbr: "NV", region: "West" },
  { name: "Sparks", slug: "sparks", state: "Nevada", stateAbbr: "NV", region: "West" },
  { name: "Carson City", slug: "carson-city", state: "Nevada", stateAbbr: "NV", region: "West" },

  // New Hampshire
  { name: "Manchester", slug: "manchester-nh", state: "New Hampshire", stateAbbr: "NH", region: "Northeast" },
  { name: "Nashua", slug: "nashua", state: "New Hampshire", stateAbbr: "NH", region: "Northeast" },
  { name: "Concord", slug: "concord-nh", state: "New Hampshire", stateAbbr: "NH", region: "Northeast" },
  { name: "Rochester", slug: "rochester-nh", state: "New Hampshire", stateAbbr: "NH", region: "Northeast" },
  { name: "Dover", slug: "dover-nh", state: "New Hampshire", stateAbbr: "NH", region: "Northeast" },

  // New Jersey
  { name: "Newark", slug: "newark", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Jersey City", slug: "jersey-city", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Paterson", slug: "paterson", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Elizabeth", slug: "elizabeth", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Trenton", slug: "trenton", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Clifton", slug: "clifton", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Camden", slug: "camden", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Cherry Hill", slug: "cherry-hill", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Princeton", slug: "princeton", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Hoboken", slug: "hoboken", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Union City", slug: "union-city-nj", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Bayonne", slug: "bayonne", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Vineland", slug: "vineland", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "New Brunswick", slug: "new-brunswick", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Perth Amboy", slug: "perth-amboy", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },
  { name: "Hackensack", slug: "hackensack", state: "New Jersey", stateAbbr: "NJ", region: "Northeast" },

  // New Mexico
  { name: "Albuquerque", slug: "albuquerque", state: "New Mexico", stateAbbr: "NM", region: "Southwest" },
  { name: "Las Cruces", slug: "las-cruces", state: "New Mexico", stateAbbr: "NM", region: "Southwest" },
  { name: "Santa Fe", slug: "santa-fe", state: "New Mexico", stateAbbr: "NM", region: "Southwest" },
  { name: "Rio Rancho", slug: "rio-rancho", state: "New Mexico", stateAbbr: "NM", region: "Southwest" },
  { name: "Roswell", slug: "roswell-nm", state: "New Mexico", stateAbbr: "NM", region: "Southwest" },
  { name: "Farmington", slug: "farmington-nm", state: "New Mexico", stateAbbr: "NM", region: "Southwest" },

  // New York
  { name: "New York City", slug: "new-york-city", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Buffalo", slug: "buffalo", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Rochester", slug: "rochester-ny", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Syracuse", slug: "syracuse", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Albany", slug: "albany", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Yonkers", slug: "yonkers", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "White Plains", slug: "white-plains", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "New Rochelle", slug: "new-rochelle", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Long Island", slug: "long-island", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Schenectady", slug: "schenectady", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Utica", slug: "utica", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Binghamton", slug: "binghamton", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Ithaca", slug: "ithaca", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Poughkeepsie", slug: "poughkeepsie", state: "New York", stateAbbr: "NY", region: "Northeast" },
  { name: "Saratoga Springs", slug: "saratoga-springs", state: "New York", stateAbbr: "NY", region: "Northeast" },

  // North Carolina
  { name: "Charlotte", slug: "charlotte", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Raleigh", slug: "raleigh", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Greensboro", slug: "greensboro", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Durham", slug: "durham", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Winston-Salem", slug: "winston-salem", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Fayetteville", slug: "fayetteville-nc", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Cary", slug: "cary", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Wilmington", slug: "wilmington-nc", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Asheville", slug: "asheville", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Concord", slug: "concord-nc", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "High Point", slug: "high-point", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Huntersville", slug: "huntersville", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Apex", slug: "apex", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Holly Springs", slug: "holly-springs", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Gastonia", slug: "gastonia", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Jacksonville", slug: "jacksonville-nc", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Chapel Hill", slug: "chapel-hill", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Burlington", slug: "burlington-nc", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Kannapolis", slug: "kannapolis", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Indian Trail", slug: "indian-trail", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Mooresville", slug: "mooresville", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },
  { name: "Wake Forest", slug: "wake-forest", state: "North Carolina", stateAbbr: "NC", region: "Southeast" },

  // North Dakota
  { name: "Fargo", slug: "fargo", state: "North Dakota", stateAbbr: "ND", region: "Midwest" },
  { name: "Bismarck", slug: "bismarck", state: "North Dakota", stateAbbr: "ND", region: "Midwest" },
  { name: "Grand Forks", slug: "grand-forks", state: "North Dakota", stateAbbr: "ND", region: "Midwest" },
  { name: "Minot", slug: "minot", state: "North Dakota", stateAbbr: "ND", region: "Midwest" },

  // Ohio
  { name: "Columbus", slug: "columbus-oh", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Cleveland", slug: "cleveland", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Cincinnati", slug: "cincinnati", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Toledo", slug: "toledo", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Akron", slug: "akron", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Dayton", slug: "dayton", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Canton", slug: "canton", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Youngstown", slug: "youngstown", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Lorain", slug: "lorain", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Hamilton", slug: "hamilton-oh", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Springfield", slug: "springfield-oh", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Lakewood", slug: "lakewood-oh", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Cuyahoga Falls", slug: "cuyahoga-falls", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Dublin", slug: "dublin-oh", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Westerville", slug: "westerville", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Kettering", slug: "kettering", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Elyria", slug: "elyria", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Mentor", slug: "mentor", state: "Ohio", stateAbbr: "OH", region: "Midwest" },
  { name: "Grove City", slug: "grove-city", state: "Ohio", stateAbbr: "OH", region: "Midwest" },

  // Oklahoma
  { name: "Oklahoma City", slug: "oklahoma-city", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Tulsa", slug: "tulsa", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Norman", slug: "norman", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Broken Arrow", slug: "broken-arrow", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Edmond", slug: "edmond", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Lawton", slug: "lawton", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Moore", slug: "moore", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Stillwater", slug: "stillwater", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Midwest City", slug: "midwest-city", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },
  { name: "Enid", slug: "enid", state: "Oklahoma", stateAbbr: "OK", region: "Southwest" },

  // Oregon
  { name: "Portland", slug: "portland-or", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Salem", slug: "salem", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Eugene", slug: "eugene", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Bend", slug: "bend", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Hillsboro", slug: "hillsboro", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Gresham", slug: "gresham", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Beaverton", slug: "beaverton", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Medford", slug: "medford", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Springfield", slug: "springfield-or", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Corvallis", slug: "corvallis", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Albany", slug: "albany-or", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Lake Oswego", slug: "lake-oswego", state: "Oregon", stateAbbr: "OR", region: "West" },
  { name: "Tigard", slug: "tigard", state: "Oregon", stateAbbr: "OR", region: "West" },

  // Pennsylvania
  { name: "Philadelphia", slug: "philadelphia", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Pittsburgh", slug: "pittsburgh", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Allentown", slug: "allentown", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Erie", slug: "erie", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Reading", slug: "reading", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Scranton", slug: "scranton", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Bethlehem", slug: "bethlehem", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Lancaster", slug: "lancaster", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Harrisburg", slug: "harrisburg", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "York", slug: "york-pa", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Wilkes-Barre", slug: "wilkes-barre", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "State College", slug: "state-college", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },
  { name: "Chester", slug: "chester-pa", state: "Pennsylvania", stateAbbr: "PA", region: "Northeast" },

  // Rhode Island
  { name: "Providence", slug: "providence", state: "Rhode Island", stateAbbr: "RI", region: "Northeast" },
  { name: "Warwick", slug: "warwick", state: "Rhode Island", stateAbbr: "RI", region: "Northeast" },
  { name: "Cranston", slug: "cranston", state: "Rhode Island", stateAbbr: "RI", region: "Northeast" },
  { name: "Pawtucket", slug: "pawtucket", state: "Rhode Island", stateAbbr: "RI", region: "Northeast" },

  // South Carolina
  { name: "Charleston", slug: "charleston-sc", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Columbia", slug: "columbia-sc", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Greenville", slug: "greenville-sc", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Myrtle Beach", slug: "myrtle-beach", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Rock Hill", slug: "rock-hill", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Mount Pleasant", slug: "mount-pleasant", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "North Charleston", slug: "north-charleston", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Spartanburg", slug: "spartanburg", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Summerville", slug: "summerville", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Hilton Head Island", slug: "hilton-head", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Florence", slug: "florence-sc", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Goose Creek", slug: "goose-creek", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Anderson", slug: "anderson", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },
  { name: "Greer", slug: "greer", state: "South Carolina", stateAbbr: "SC", region: "Southeast" },

  // South Dakota
  { name: "Sioux Falls", slug: "sioux-falls", state: "South Dakota", stateAbbr: "SD", region: "Midwest" },
  { name: "Rapid City", slug: "rapid-city", state: "South Dakota", stateAbbr: "SD", region: "Midwest" },
  { name: "Aberdeen", slug: "aberdeen-sd", state: "South Dakota", stateAbbr: "SD", region: "Midwest" },

  // Tennessee
  { name: "Nashville", slug: "nashville", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Memphis", slug: "memphis", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Knoxville", slug: "knoxville", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Chattanooga", slug: "chattanooga", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Clarksville", slug: "clarksville", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Murfreesboro", slug: "murfreesboro", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Franklin", slug: "franklin-tn", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Johnson City", slug: "johnson-city", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Jackson", slug: "jackson-tn", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Hendersonville", slug: "hendersonville-tn", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Smyrna", slug: "smyrna-tn", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Spring Hill", slug: "spring-hill", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Gallatin", slug: "gallatin", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Collierville", slug: "collierville", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Bartlett", slug: "bartlett", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Mount Juliet", slug: "mount-juliet", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },
  { name: "Cookeville", slug: "cookeville", state: "Tennessee", stateAbbr: "TN", region: "Southeast" },

  // Texas
  { name: "Houston", slug: "houston", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "San Antonio", slug: "san-antonio", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Dallas", slug: "dallas", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Austin", slug: "austin", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Fort Worth", slug: "fort-worth", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "El Paso", slug: "el-paso", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Arlington", slug: "arlington-tx", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Corpus Christi", slug: "corpus-christi", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Plano", slug: "plano", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Laredo", slug: "laredo", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Lubbock", slug: "lubbock", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Irving", slug: "irving", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Garland", slug: "garland", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Frisco", slug: "frisco", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "McKinney", slug: "mckinney", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Amarillo", slug: "amarillo", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Grand Prairie", slug: "grand-prairie", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Brownsville", slug: "brownsville", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Killeen", slug: "killeen", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Pasadena", slug: "pasadena-tx", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Denton", slug: "denton", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Midland", slug: "midland", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Round Rock", slug: "round-rock", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Waco", slug: "waco", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Sugar Land", slug: "sugar-land", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "The Woodlands", slug: "the-woodlands", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Allen", slug: "allen", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Pearland", slug: "pearland", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "League City", slug: "league-city", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Pflugerville", slug: "pflugerville", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Cedar Park", slug: "cedar-park", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "New Braunfels", slug: "new-braunfels", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Tyler", slug: "tyler", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Beaumont", slug: "beaumont", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Odessa", slug: "odessa", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Lewisville", slug: "lewisville", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Mansfield", slug: "mansfield", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Mesquite", slug: "mesquite", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Carrollton", slug: "carrollton", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Richardson", slug: "richardson", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Edinburg", slug: "edinburg", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Flower Mound", slug: "flower-mound", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "North Richland Hills", slug: "north-richland-hills", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Abilene", slug: "abilene", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "San Marcos", slug: "san-marcos", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Conroe", slug: "conroe", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Wylie", slug: "wylie", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Georgetown", slug: "georgetown-tx", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "College Station", slug: "college-station", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Temple", slug: "temple", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Burleson", slug: "burleson", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Missouri City", slug: "missouri-city", state: "Texas", stateAbbr: "TX", region: "Southwest" },
  { name: "Rowlett", slug: "rowlett", state: "Texas", stateAbbr: "TX", region: "Southwest" },

  // Utah
  { name: "Salt Lake City", slug: "salt-lake-city", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "West Valley City", slug: "west-valley-city", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Provo", slug: "provo", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "West Jordan", slug: "west-jordan", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Orem", slug: "orem", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Sandy", slug: "sandy-ut", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Ogden", slug: "ogden", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "St. George", slug: "st-george", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Lehi", slug: "lehi", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Layton", slug: "layton", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "South Jordan", slug: "south-jordan", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Taylorsville", slug: "taylorsville", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Logan", slug: "logan", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Draper", slug: "draper", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Riverton", slug: "riverton", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Herriman", slug: "herriman", state: "Utah", stateAbbr: "UT", region: "West" },
  { name: "Spanish Fork", slug: "spanish-fork", state: "Utah", stateAbbr: "UT", region: "West" },

  // Vermont
  { name: "Burlington", slug: "burlington-vt", state: "Vermont", stateAbbr: "VT", region: "Northeast" },

  // Virginia
  { name: "Virginia Beach", slug: "virginia-beach", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Norfolk", slug: "norfolk", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Chesapeake", slug: "chesapeake", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Richmond", slug: "richmond", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Arlington", slug: "arlington-va", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Newport News", slug: "newport-news", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Alexandria", slug: "alexandria", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Hampton", slug: "hampton", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Roanoke", slug: "roanoke", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Lynchburg", slug: "lynchburg", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Charlottesville", slug: "charlottesville", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Fredericksburg", slug: "fredericksburg", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Suffolk", slug: "suffolk", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Manassas", slug: "manassas", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Harrisonburg", slug: "harrisonburg", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Leesburg", slug: "leesburg", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Woodbridge", slug: "woodbridge", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Ashburn", slug: "ashburn", state: "Virginia", stateAbbr: "VA", region: "Southeast" },
  { name: "Centreville", slug: "centreville", state: "Virginia", stateAbbr: "VA", region: "Southeast" },

  // Washington
  { name: "Seattle", slug: "seattle", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Spokane", slug: "spokane", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Tacoma", slug: "tacoma", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Vancouver", slug: "vancouver-wa", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Bellevue", slug: "bellevue", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Kent", slug: "kent", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Everett", slug: "everett", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Renton", slug: "renton", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Olympia", slug: "olympia", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Federal Way", slug: "federal-way", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Spokane Valley", slug: "spokane-valley", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Kirkland", slug: "kirkland", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Auburn", slug: "auburn-wa", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Kennewick", slug: "kennewick", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Redmond", slug: "redmond", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Marysville", slug: "marysville", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Pasco", slug: "pasco", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Richland", slug: "richland", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Lacey", slug: "lacey", state: "Washington", stateAbbr: "WA", region: "West" },
  { name: "Bellingham", slug: "bellingham", state: "Washington", stateAbbr: "WA", region: "West" },

  // Washington D.C.
  { name: "Washington", slug: "washington-dc", state: "District of Columbia", stateAbbr: "DC", region: "Northeast" },

  // West Virginia
  { name: "Charleston", slug: "charleston-wv", state: "West Virginia", stateAbbr: "WV", region: "Southeast" },
  { name: "Huntington", slug: "huntington-wv", state: "West Virginia", stateAbbr: "WV", region: "Southeast" },
  { name: "Morgantown", slug: "morgantown", state: "West Virginia", stateAbbr: "WV", region: "Southeast" },
  { name: "Parkersburg", slug: "parkersburg", state: "West Virginia", stateAbbr: "WV", region: "Southeast" },

  // Wisconsin
  { name: "Milwaukee", slug: "milwaukee", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Madison", slug: "madison", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Green Bay", slug: "green-bay", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Kenosha", slug: "kenosha", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Racine", slug: "racine", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Appleton", slug: "appleton", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Waukesha", slug: "waukesha", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Oshkosh", slug: "oshkosh", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Eau Claire", slug: "eau-claire", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Janesville", slug: "janesville", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "West Allis", slug: "west-allis", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Brookfield", slug: "brookfield-wi", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "Fond du Lac", slug: "fond-du-lac", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },
  { name: "La Crosse", slug: "la-crosse", state: "Wisconsin", stateAbbr: "WI", region: "Midwest" },

  // Wyoming
  { name: "Cheyenne", slug: "cheyenne", state: "Wyoming", stateAbbr: "WY", region: "West" },
  { name: "Casper", slug: "casper", state: "Wyoming", stateAbbr: "WY", region: "West" },
  { name: "Laramie", slug: "laramie", state: "Wyoming", stateAbbr: "WY", region: "West" },
  { name: "Gillette", slug: "gillette", state: "Wyoming", stateAbbr: "WY", region: "West" },
  { name: "Rock Springs", slug: "rock-springs", state: "Wyoming", stateAbbr: "WY", region: "West" },
];

/* ─── FAQs ─── */

export interface FAQ {
  question: string;
  answer: string;
}

export const homeFAQs: FAQ[] = [
  {
    question: "What is a DSCR loan?",
    answer:
      "A DSCR (Debt Service Coverage Ratio) loan is a type of mortgage for investment properties that qualifies borrowers based on the property's rental income rather than personal income. If the property's rent covers the mortgage payment, you can qualify — regardless of your W-2 income, tax returns, or employment status.",
  },
  {
    question: "How is the debt service coverage ratio calculated?",
    answer:
      "DSCR is calculated by dividing the property's gross rental income by the total monthly debt service (PITIA — principal, interest, taxes, insurance, and HOA if applicable). For example, if rent is $2,000/month and the total PITIA is $1,600/month, the DSCR is 1.25.",
  },
  {
    question: "What DSCR ratio do I need to qualify?",
    answer:
      "Most lenders require a minimum DSCR of 1.0 (break-even), meaning the rent at least covers the mortgage payment. A DSCR of 1.25 or higher typically gets you the best rates. Some lenders offer programs for DSCR below 1.0, but expect higher rates and larger down payments.",
  },
  {
    question: "What credit score do I need for a DSCR loan?",
    answer:
      "Most DSCR lenders require a minimum credit score of 620–680. Higher credit scores (700+) unlock better interest rates and terms. Some lenders go as low as 620 but may require a larger down payment or higher DSCR ratio.",
  },
  {
    question: "Can I use a DSCR loan for a short-term rental (Airbnb)?",
    answer:
      "Yes. Many DSCR lenders now accept short-term rental income. They may use AirDNA projections, actual booking history (typically 12 months), or a blend of both to calculate the DSCR. This makes DSCR loans popular for Airbnb and VRBO investors.",
  },
  {
    question: "How much down payment do I need for a DSCR loan?",
    answer:
      "Most DSCR loans require 20–25% down payment. Some programs allow as little as 15% down for strong DSCR ratios and high credit scores. A larger down payment typically results in better rates.",
  },
  {
    question: "Can I close a DSCR loan in an LLC?",
    answer:
      "Yes — this is one of the biggest advantages of DSCR loans over conventional mortgages. You can vest the property in an LLC, corporation, or other entity, providing liability protection for your investment portfolio.",
  },
  {
    question: "How do DSCR loans compare to conventional investment property loans?",
    answer:
      "DSCR loans don't require income verification, have no DTI limits, allow LLC vesting, and have no property count limits. Conventional loans offer lower rates but require full income documentation, have a 10-property limit, and require personal-name vesting.",
  },
];

/* ─── Helper Functions ─── */

/** /services/dscr-loans */
export function getServiceUrl(service: Service): string {
  return `/services/${service.slug}`;
}

/** /locations/florida/miami */
export function getCityUrl(city: City): string {
  const stateSlug = city.state.toLowerCase().replace(/\s+/g, "-");
  return `/locations/${stateSlug}/${city.slug}`;
}

/** /locations/florida */
export function getStateUrl(stateName: string): string {
  return `/locations/${stateName.toLowerCase().replace(/\s+/g, "-")}`;
}

/** /locations/florida/miami/dscr-loans-short-term-rentals */
export function getCityServiceUrl(city: City, service: Service): string {
  const stateSlug = city.state.toLowerCase().replace(/\s+/g, "-");
  return `/locations/${stateSlug}/${city.slug}/${service.slug}`;
}

export function getStateSlug(stateName: string): string {
  return stateName.toLowerCase().replace(/\s+/g, "-");
}

export function findServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function findCityBySlug(stateSlug: string, citySlug: string): City | undefined {
  return cities.find(
    (c) => c.slug === citySlug && getStateSlug(c.state) === stateSlug
  );
}

export function getCitiesByState(stateAbbr: string): City[] {
  return cities.filter((c) => c.stateAbbr === stateAbbr);
}

export function getCitiesByStateName(stateName: string): City[] {
  return cities.filter((c) => getStateSlug(c.state) === stateName);
}

export function getCitiesByRegion(region: string): City[] {
  return cities.filter((c) => c.region === region);
}

export function getAllStates(): { name: string; abbr: string; slug: string; count: number }[] {
  const stateMap = new Map<string, { name: string; abbr: string; slug: string; count: number }>();
  for (const city of cities) {
    const existing = stateMap.get(city.stateAbbr);
    if (existing) {
      existing.count++;
    } else {
      stateMap.set(city.stateAbbr, {
        name: city.state,
        abbr: city.stateAbbr,
        slug: getStateSlug(city.state),
        count: 1,
      });
    }
  }
  return Array.from(stateMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getRegions(): string[] {
  return [...new Set(cities.map((c) => c.region))].sort();
}
