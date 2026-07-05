import type { ServiceContent } from "./serviceContentTypes";

export const batch2: Record<string, ServiceContent> = {
  "commercial-interior-design": {
    tableOfContents: [
      { id: "commercial-design-nyc", title: "Commercial Interior Design in NYC" },
      { id: "sector-expertise", title: "Sector-Specific Design Expertise" },
      { id: "compliance-and-codes", title: "Compliance, Codes, and Project Delivery" },
    ],
    sections: [
      {
        id: "commercial-design-nyc",
        title: "Commercial Interior Design in NYC",
        paragraphs: [
          "Commercial interior design in New York City operates at the intersection of brand identity, employee experience, and regulatory compliance. Whether you are designing an office in Midtown, a retail store in SoHo, a restaurant in the West Village, or a medical practice in Brooklyn, the interior must communicate your brand, function flawlessly for daily operations, and meet NYC's stringent commercial building codes.",
          "The stakes in commercial design are high — your space directly affects employee productivity, customer perception, and revenue. A well-designed restaurant increases table turnover and tips. A thoughtfully planned office improves recruitment, retention, and collaboration. A beautifully designed retail store increases dwell time and sales per square foot. Our commercial design team understands these business outcomes and designs spaces that deliver measurable results.",
        ],
      },
      {
        id: "sector-expertise",
        title: "Sector-Specific Design Expertise",
        paragraphs: [
          "Office design in the post-pandemic era requires flexible spaces that accommodate both collaborative work and focused individual tasks. We design offices with a mix of open workstations, private offices, phone rooms, huddle spaces, and lounge areas. Technology integration — video conferencing equipment, power access, network infrastructure — is planned from the start, not added as an afterthought.",
          "Retail and restaurant design demands deep understanding of customer flow, visual merchandising, and the sensory experience. We design retail spaces that guide customers through a curated journey, with lighting, materials, and fixture placement all optimized for discovery and purchase. Restaurant interiors balance atmosphere, acoustics, kitchen adjacency, and seating density — all while creating the distinctive vibe that makes an NYC restaurant a destination.",
          "Healthcare and wellness spaces require specialized knowledge of patient flow, privacy regulations, infection control materials, and ADA accessibility. We design medical offices, dental practices, therapy offices, and wellness studios that feel calming and professional while meeting all regulatory requirements.",
        ],
      },
      {
        id: "compliance-and-codes",
        title: "Compliance, Codes, and Project Delivery",
        paragraphs: [
          "Commercial interior projects in NYC must comply with building codes, fire safety regulations, ADA accessibility requirements, and the specific rules of your commercial lease. Occupancy classifications, egress requirements, sprinkler systems, and ventilation standards all affect design decisions. Our team coordinates with architects, engineers, and expeditors to ensure full code compliance from the start.",
          "We manage commercial projects from lease signing through opening day, including space planning, design development, permit filing, contractor coordination, furniture procurement, technology installation, and final styling. Our goal is to deliver a space that opens on schedule and on budget with no compliance surprises after move-in.",
        ],
      },
    ],
    faqs: [
      { question: "How much does commercial interior design cost in NYC?", answer: "Commercial design fees range from $5 to $25 per square foot depending on complexity. Total project costs including construction, furniture, and technology for a 2,000-square-foot office typically range from $100,000 to $300,000. Restaurant and retail build-outs are typically $150 to $400+ per square foot all-in." },
      { question: "How long does a commercial interior project take?", answer: "A standard 2,000-5,000 square foot office build-out takes 3-6 months from design through move-in. Restaurant and retail projects with custom millwork and specialized systems can take 4-8 months. We create detailed project schedules during the design phase and manage timelines through completion." },
      { question: "Do you handle ADA compliance?", answer: "Yes. ADA compliance is built into every commercial design we produce. This includes accessible entry, adequate circulation clearances, compliant restroom design, accessible reception and service counters, and proper signage. We coordinate with ADA consultants for complex projects to ensure full compliance." },
      { question: "Can you work within our existing lease constraints?", answer: "Absolutely. Most commercial leases have specific limitations on modifications, and landlords often require plan review before approving tenant improvements. We review your lease terms during the design phase and design within those constraints. We also coordinate with landlord representatives on approval requirements." },
    ],
    keyTakeaways: [
      "Commercial design directly impacts employee productivity, customer experience, and revenue",
      "Each commercial sector — office, retail, restaurant, healthcare — requires specialized expertise",
      "NYC commercial projects must navigate building codes, ADA requirements, and fire safety regulations",
      "Post-pandemic office design requires flexibility for hybrid work and collaboration",
      "Total timeline from lease signing to opening is typically 3-8 months depending on scope",
    ],
    relatedSlugs: ["space-planning", "lighting-design", "smart-home-integration", "furniture-selection"],
  },

  "space-planning": {
    tableOfContents: [
      { id: "why-space-planning", title: "Why Space Planning Is Essential in NYC" },
      { id: "our-planning-process", title: "Our Space Planning Process" },
      { id: "common-layout-solutions", title: "Common NYC Layout Solutions" },
    ],
    sections: [
      {
        id: "why-space-planning",
        title: "Why Space Planning Is Essential in NYC",
        paragraphs: [
          "In New York City, where the average apartment costs over $1,000 per square foot, every square foot must work hard. Space planning is the discipline of analyzing a floor plan and determining the optimal arrangement of furniture, zones, and circulation paths to maximize both function and perceived spaciousness. It is the foundation of every successful interior design project and arguably the single most impactful service we offer.",
          "A professionally planned space feels larger, functions better, and eliminates the frustration of furniture that does not fit, traffic bottlenecks, and wasted areas that serve no purpose. Before any material is selected or any piece of furniture is purchased, the space plan must be right. It is the blueprint that everything else builds upon.",
        ],
      },
      {
        id: "our-planning-process",
        title: "Our Space Planning Process",
        paragraphs: [
          "Our space planning service begins with precise measurement of your entire home or office, documented in a detailed floor plan. We analyze traffic patterns, natural light throughout the day, structural elements that cannot move, sight lines between rooms, and the specific activities that each space must accommodate.",
          "We then develop multiple layout options — typically three to five alternatives — each with different furniture arrangements, zone configurations, and functional priorities. Each option is presented as a scaled floor plan with furniture drawn to actual dimensions, so you can see exactly how each arrangement will work. We discuss the trade-offs of each option and help you choose the layout that best matches your lifestyle.",
          "For renovation projects, space planning extends to architectural changes: which walls can be removed or modified, where new openings can be created, and how the floor plan can be reconfigured to better serve modern living. We coordinate with structural engineers to verify feasibility before finalizing any plans that involve wall modifications.",
        ],
      },
      {
        id: "common-layout-solutions",
        title: "Common NYC Layout Solutions",
        paragraphs: [
          "Multi-functional zones are the most common space planning solution in NYC. A dining table that doubles as a workspace, a living room alcove that serves as a reading nook and guest sleeping area, or a bedroom wall that incorporates a built-in desk and storage system all use clever zoning to serve multiple needs without dedicated rooms.",
          "Circulation optimization is another critical element. In compact apartments, the path from the front door through the living room to the bedroom should be clear and direct, not a maze of furniture. We map circulation paths on every floor plan and adjust furniture placement to ensure smooth flow throughout the home. Even small changes — rotating a sofa 90 degrees, shifting a dining table two feet — can dramatically improve how an apartment feels and functions.",
        ],
      },
    ],
    faqs: [
      { question: "How much does space planning cost?", answer: "Space planning as a standalone service starts at $1,500 for a studio or one-bedroom apartment and ranges to $5,000+ for larger homes. When included as part of a full interior design project, space planning is integrated into the design fee. The investment pays for itself by preventing expensive furniture mistakes." },
      { question: "Can space planning help me before I buy an apartment?", answer: "Absolutely. We offer pre-purchase space planning where we review floor plans of apartments you are considering and show you how furniture would fit and how the space would function. This helps you evaluate whether a potential apartment will actually work for your lifestyle before you commit." },
      { question: "Do you provide 3D renderings of the space plan?", answer: "Yes. In addition to scaled 2D floor plans, we provide 3D renderings that show how the space will look from eye level with furniture in place. This is especially valuable for clients who have difficulty visualizing layouts from a bird's-eye floor plan view." },
    ],
    keyTakeaways: [
      "Space planning is the most impactful step in any NYC interior design project",
      "Professionally planned spaces feel larger and function significantly better",
      "Multiple layout options allow you to choose the arrangement that best fits your lifestyle",
      "Pre-purchase space planning helps you evaluate apartments before buying",
      "Even small furniture adjustments can dramatically improve an apartment's functionality",
    ],
    relatedSlugs: ["full-home-interior-design", "furniture-selection", "home-office-design", "living-room-design"],
  },

  "color-consultation": {
    tableOfContents: [
      { id: "color-matters", title: "Why Color Matters More in NYC" },
      { id: "our-color-process", title: "Our Color Consultation Process" },
      { id: "nyc-color-challenges", title: "NYC-Specific Color Challenges" },
    ],
    sections: [
      {
        id: "color-matters",
        title: "Why Color Matters More in NYC",
        paragraphs: [
          "Color sets the emotional tone of every room, and in NYC apartments where spaces are compact and natural light varies dramatically, the impact of color choices is amplified. A color that reads as warm and inviting in a sun-drenched townhouse can feel drab and lifeless in a north-facing apartment. A bold accent wall that looks dramatic in a 500-square-foot loft can feel oppressive in a 150-square-foot bedroom.",
          "Professional color consultation eliminates the expensive trial-and-error that most homeowners experience when choosing paint. We analyze your specific light conditions, existing furnishings, architectural features, and personal preferences to develop a palette that works in your exact space — not in a paint store's lighting or on a computer screen.",
        ],
      },
      {
        id: "our-color-process",
        title: "Our Color Consultation Process",
        paragraphs: [
          "Our process begins with an in-home assessment where we evaluate natural light at different times of day, note the color temperature of your existing lighting, catalog any fixed elements (flooring, countertops, tile) that the palette must complement, and discuss your color preferences and the mood you want each room to convey.",
          "We then develop a whole-home color palette with specific paint colors (brand, name, and sheen level) for every wall, ceiling, trim, door, and accent surface. We apply large paint samples directly to your walls so you can see each color in your actual light conditions before committing. This sampling step is critical — colors look completely different on a 2-inch chip than they do on a full wall in your specific room.",
        ],
      },
      {
        id: "nyc-color-challenges",
        title: "NYC-Specific Color Challenges",
        paragraphs: [
          "North-facing apartments are the most common color challenge in NYC. These spaces receive cool, indirect light all day, which makes cool-toned colors (blue-grays, sage greens) look even cooler and can make whites look stark or clinical. We counter this by specifying warm-toned neutrals and warm whites that add coziness without looking yellow.",
          "Small rooms require special color strategy. Contrary to popular belief, dark colors can actually make a small room feel larger by blurring the boundaries between walls and creating a cocooning effect. The key is committing fully — painting walls, trim, and ceiling in the same color eliminates visual breaks that make the room feel chopped up. We advise clients on when to go light for airiness and when to go dark for drama based on their specific room proportions and light conditions.",
        ],
      },
    ],
    faqs: [
      { question: "How much does a color consultation cost?", answer: "Standalone color consultation for a full apartment starts at $750 for a studio and ranges to $2,500+ for larger homes. This includes in-home assessment, palette development, paint specification, and sample testing. When included as part of a full interior design project, color consultation is integrated into the design fee." },
      { question: "Which paint brands do you recommend?", answer: "We primarily specify Benjamin Moore and Farrow & Ball for residential projects. Benjamin Moore offers excellent quality, vast color selection, and easy availability. Farrow & Ball provides uniquely rich, complex colors with a depth that standard paints cannot match. We also work with Sherwin-Williams and specialty brands when specific colors or finishes are needed." },
      { question: "Can you match colors to my existing furniture?", answer: "Yes. We bring your existing fixed elements — flooring, countertops, tile, key furniture pieces — into the palette development process. We select wall colors that complement and enhance what you already have rather than clashing with it." },
    ],
    keyTakeaways: [
      "NYC light conditions dramatically affect how paint colors appear on your walls",
      "Large on-wall samples are essential — never choose paint from a small chip alone",
      "Warm-toned neutrals counter the cool light in north-facing apartments",
      "Dark colors can make small rooms feel larger when applied consistently",
      "A whole-home palette ensures cohesive color flow from room to room",
    ],
    relatedSlugs: ["full-home-interior-design", "wallpaper-wall-treatments", "living-room-design", "bedroom-design"],
  },

  "furniture-selection": {
    tableOfContents: [
      { id: "trade-access-advantage", title: "The Trade-Access Advantage" },
      { id: "procurement-logistics", title: "NYC Procurement and Delivery Logistics" },
      { id: "building-a-collection", title: "Building a Curated Collection" },
    ],
    sections: [
      {
        id: "trade-access-advantage",
        title: "The Trade-Access Advantage",
        paragraphs: [
          "One of the most valuable benefits of working with an interior designer is access to trade-only showrooms, custom fabricators, and pricing that is not available to the public. The NYC Design District (centered on the D&D Building, 200 Lexington, and the New York Design Center) houses hundreds of showrooms representing the world's finest furniture, fabric, and lighting brands. Most of these showrooms are trade-only — they do not sell directly to consumers.",
          "Working through our firm, you gain access to these resources at trade pricing, which is typically 20-40% below retail. We also have relationships with custom furniture makers, upholstery workshops, and vintage dealers who provide pieces that are not available in any store. This combination of trade access, custom capability, and curatorial expertise means your home will have furniture you cannot find anywhere else, often at better prices than retail alternatives.",
        ],
      },
      {
        id: "procurement-logistics",
        title: "NYC Procurement and Delivery Logistics",
        paragraphs: [
          "Buying furniture for an NYC apartment is not as simple as ordering online and waiting for delivery. Building delivery restrictions (specific days, limited hours, freight elevator requirements), narrow doorways and hallways that limit furniture dimensions, stairway access in walk-up buildings, and the need for certificates of insurance all complicate the process. A single oversized sofa that does not fit through the elevator door can result in a costly return and weeks of delay.",
          "Our procurement service handles every logistical detail. We verify dimensions against your building's access constraints before ordering, coordinate delivery windows with building management, arrange white-glove delivery services, and oversee placement and assembly on installation day. We also manage the inevitable complications — backorders, shipping damage, vendor errors — so you do not have to.",
        ],
      },
      {
        id: "building-a-collection",
        title: "Building a Curated Collection",
        paragraphs: [
          "Great interior design is not about buying matching furniture sets — it is about curating a collection of pieces that work together while each contributing something unique. We mix new and vintage, high and low, custom and found, creating interiors that feel collected and personal rather than showroom-purchased.",
          "Budget management is central to our furniture selection service. We develop detailed procurement budgets with line-item pricing for every piece, presenting options at multiple price points so you can decide where to invest and where to save. A typical strategy is to invest in key pieces you will keep for decades (sofa, dining table, bed frame) and use more affordable options for trend-sensitive items (accent chairs, throw pillows, decorative objects) that you may want to refresh in a few years.",
        ],
      },
    ],
    faqs: [
      { question: "How much do you mark up furniture prices?", answer: "We do not mark up furniture. Our design fee covers our selection, specification, and procurement services. You pay the trade or retail price for each item, and we provide full transparency on all pricing. This approach builds trust and ensures you know exactly where your budget is going." },
      { question: "Can you work within a specific budget?", answer: "Absolutely. We design to your budget, not ours. During the proposal phase, we discuss your total furniture budget and allocate it strategically across rooms and categories. We always present options at multiple price points and help you prioritize investments where they will have the most impact." },
      { question: "How long does furniture procurement take?", answer: "Lead times vary by item: in-stock retail pieces arrive in 2-4 weeks, custom upholstery takes 8-12 weeks, custom millwork takes 10-16 weeks, and imported pieces can take 12-20 weeks. We map the critical path for every project and order long-lead items first to keep the overall timeline on track." },
      { question: "What if a piece arrives damaged?", answer: "We inspect every delivery and manage all damage claims, returns, and replacements. Our relationships with vendors and delivery companies mean we can resolve issues faster than individual consumers. White-glove delivery services include inspection at your door before items are brought inside." },
    ],
    keyTakeaways: [
      "Trade-only showroom access provides 20-40% savings and exclusive product selection",
      "NYC delivery logistics require careful planning around building access constraints",
      "Budget transparency with line-item pricing ensures you control where money is spent",
      "A curated mix of new, vintage, and custom pieces creates the most compelling interiors",
      "Long-lead custom items should be ordered early to keep the overall project on schedule",
    ],
    relatedSlugs: ["full-home-interior-design", "space-planning", "living-room-design", "staging-styling"],
  },

  "lighting-design": {
    tableOfContents: [
      { id: "lighting-transforms-everything", title: "How Lighting Transforms NYC Interiors" },
      { id: "three-layers", title: "The Three Layers of Residential Lighting" },
      { id: "fixture-selection-controls", title: "Fixture Selection and Smart Controls" },
    ],
    sections: [
      {
        id: "lighting-transforms-everything",
        title: "How Lighting Transforms NYC Interiors",
        paragraphs: [
          "Lighting is the single most underinvested element in most NYC apartments. Builders install the minimum required fixtures — a central ceiling light in each room — and homeowners never upgrade beyond that. The result is flat, uninviting spaces where every room looks the same regardless of how much was spent on furniture and finishes.",
          "Professional lighting design creates dimension, mood, and visual hierarchy. It highlights your best features, minimizes imperfections, and makes every material in your home look its best. In NYC apartments with limited natural light, artificial lighting design is even more critical — it must compensate for what sunlight cannot provide and create warmth and ambiance that makes the apartment feel like home at any hour.",
        ],
      },
      {
        id: "three-layers",
        title: "The Three Layers of Residential Lighting",
        paragraphs: [
          "Every well-lit room combines three layers: ambient (general illumination), task (focused light for activities), and accent (decorative and highlighting). Ambient light comes from recessed fixtures, cove lighting, or semi-flush ceiling mounts. Task light comes from under-cabinet kitchen lights, desk lamps, and vanity lighting. Accent light comes from picture lights, shelf lighting, uplights on plants, and decorative table and floor lamps.",
          "The interplay between these layers creates a room that feels rich and three-dimensional rather than flat. In a well-designed living room, ambient light from recessed fixtures provides overall illumination, floor lamps next to seating create cozy reading pools, art lights draw the eye to focal points, and table lamps add warmth at human height. Each layer is on a separate dimmer or smart switch, allowing you to adjust the room's mood instantly.",
        ],
      },
      {
        id: "fixture-selection-controls",
        title: "Fixture Selection and Smart Controls",
        paragraphs: [
          "Fixture selection is where lighting design meets interior design. We specify fixtures that serve their lighting function while contributing aesthetically to the room's design. A statement pendant over a dining table becomes a focal point. Sconces flanking a bed add warmth and eliminate the need for nightstand lamps, saving precious surface space. Linear LED fixtures in a kitchen provide clean, even task lighting while reinforcing a modern aesthetic.",
          "Smart lighting controls have become standard in our projects. Systems like Lutron Caseta, Lutron RadioRA, and Philips Hue allow you to create lighting scenes (morning, dinner, movie night), control fixtures from your phone, and set automated schedules. Dimming capability on every fixture is non-negotiable — the ability to adjust light levels throughout the day is the single most impactful lighting upgrade you can make.",
        ],
      },
    ],
    faqs: [
      { question: "Can you design lighting for an apartment without adding new wiring?", answer: "Yes. Plug-in solutions including floor lamps, table lamps, picture lights, and plug-in sconces can transform an apartment's lighting without any electrical work. Smart bulbs add dimming and color temperature control to existing fixtures. For rentals where wiring changes are not possible, we design comprehensive plug-in lighting plans." },
      { question: "What color temperature should I use?", answer: "We recommend 2700K (warm white) for living rooms and bedrooms, 3000K for kitchens and bathrooms, and 3500-4000K for home offices and task areas. Consistent color temperature within each room is important — mixing warm and cool bulbs in the same space creates a discordant feel." },
      { question: "How much does a lighting redesign cost?", answer: "A lighting consultation with fixture specification starts at $1,500 for a single room and $3,000-$8,000 for a full apartment. Fixture costs are separate and vary widely — a basic recessed lighting plan might cost $2,000-$5,000 in fixtures, while a full apartment with designer pendants, sconces, and smart controls can range from $10,000-$30,000+." },
    ],
    keyTakeaways: [
      "Lighting is the most impactful and most underinvested design element in NYC apartments",
      "Three layers — ambient, task, accent — create dimension and mood in every room",
      "Every fixture should be on a dimmer for maximum flexibility throughout the day",
      "Smart lighting controls allow scene-setting and automation for daily convenience",
      "Plug-in solutions can transform lighting without any electrical work or renovation",
    ],
    relatedSlugs: ["full-home-interior-design", "living-room-design", "kitchen-design", "smart-home-integration"],
  },

  "custom-closet-design": {
    tableOfContents: [
      { id: "nyc-closet-crisis", title: "The NYC Closet Crisis" },
      { id: "custom-design-approach", title: "Our Custom Closet Design Approach" },
      { id: "closet-types-solutions", title: "Closet Types and Storage Solutions" },
    ],
    sections: [
      {
        id: "nyc-closet-crisis",
        title: "The NYC Closet Crisis",
        paragraphs: [
          "NYC apartments are notorious for inadequate closet space. Pre-war apartments often have no bedroom closets at all, just a single coat closet near the front door. Post-war apartments have small reach-in closets with a single rod and shelf that wastes enormous vertical space. In both cases, standard closet configurations leave 40-60% of potential storage unused.",
          "A custom closet system transforms these underperforming spaces by tailoring every inch to your specific wardrobe and storage needs. Double-hung rods effectively double hanging capacity. Adjustable shelving accommodates folded items of different heights. Pull-out drawers replace the inefficient shelf-stacking that most people resort to. Specialty inserts for shoes, jewelry, ties, and accessories keep everything organized and visible.",
        ],
      },
      {
        id: "custom-design-approach",
        title: "Our Custom Closet Design Approach",
        paragraphs: [
          "We begin every closet project with a wardrobe audit. Before designing the closet, we need to understand what goes in it: how many items you hang, fold, and store; how many shoes, bags, and accessories you own; whether you need seasonal rotation space; and what your daily getting-dressed routine looks like. This audit ensures the closet is designed for your actual needs, not a generic template.",
          "The design itself is precision-measured and drawn to exact dimensions. We specify materials, finishes, hardware, and lighting for the closet interior. Walk-in closets get island units, seating, and mirrors when space permits. Reach-in closets get every possible optimization. The final design includes 3D renderings so you can see exactly how your closet will look and function before installation begins.",
        ],
      },
      {
        id: "closet-types-solutions",
        title: "Closet Types and Storage Solutions",
        paragraphs: [
          "Walk-in closets in NYC are a luxury typically found in master bedrooms of larger apartments, brownstones, and suburban homes. We design these spaces as rooms unto themselves, with curated lighting, full-length mirrors, seating, and display areas for accessories and shoes. A well-designed walk-in is both highly functional and a pleasure to use every day.",
          "Reach-in closets — the standard in most NYC apartments — benefit most from custom systems because the existing configuration is so inefficient. A 6-foot-wide reach-in closet with a custom system can hold as much as an 8-foot walk-in with a standard rod-and-shelf setup. We maximize every vertical inch from floor to ceiling with a combination of hanging, shelving, drawers, and specialty storage.",
        ],
      },
    ],
    faqs: [
      { question: "How much does a custom closet system cost?", answer: "Custom closet systems for NYC apartments range from $2,000 to $5,000 for a standard reach-in closet and $5,000 to $15,000+ for a walk-in closet. Pricing depends on size, materials (melamine vs. wood veneer vs. solid wood), and features (drawers, glass doors, LED lighting, specialty inserts). We provide detailed pricing during the design phase." },
      { question: "How long does closet installation take?", answer: "A reach-in closet system typically installs in one day. Walk-in closets take 1-2 days. The design phase takes 2-3 weeks, and manufacturing takes 3-4 weeks after design approval. Total timeline from first meeting to installed closet is typically 6-8 weeks." },
      { question: "Can you add a closet where there is none?", answer: "Yes. We design freestanding wardrobe solutions, built-in closet systems that are constructed into the room, and alcove closets that utilize unused spaces like room corners, alcoves, or short walls. In pre-war apartments without bedroom closets, creating a built-in closet wall is one of the most popular and impactful upgrades we do." },
    ],
    keyTakeaways: [
      "Standard NYC closets waste 40-60% of their potential storage capacity",
      "A wardrobe audit ensures the closet is designed for your actual storage needs",
      "Custom reach-in systems can match the capacity of walk-in closets twice their size",
      "Professional closet design increases both daily convenience and property value",
      "Installation is fast — most closet systems are completed in 1-2 days",
    ],
    relatedSlugs: ["bedroom-design", "full-home-interior-design", "space-planning", "renovation-management"],
  },
};
