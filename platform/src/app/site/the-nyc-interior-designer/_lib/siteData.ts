/* ─── Site Constants ─── */

export const SITE_NAME = "The NYC Interior Designer";
export const SITE_DOMAIN = "https://www.thenycinteriordesigner.com";
export const PHONE = "(917) 473-2013";
export const PHONE_HREF = "tel:9174732013";
export const SMS_HREF = "sms:9174732013";
export const EMAIL = "hello@thenycinteriordesigner.com";
export const ADDRESS = "150 W 47th St, New York, NY 10036";

/* ─── Service Interface & Data ─── */

export type ServiceCategory = "design" | "contractor";

export interface Service {
  name: string;
  h1: string;
  slug: string;
  tagline: string;
  shortDesc: string;
  description: string;
  features: string[];
  category: ServiceCategory;
}

export const services: Service[] = [
  {
    name: "Full-Home Interior Design",
    h1: "Full-Home Interior Design Services for NYC Apartments, Brownstones & Condos",
    slug: "full-home-interior-design",
    tagline: "End-to-end residential interior design covering every room — from pre-war apartments on the Upper West Side to new-construction condos in Hudson Yards. Space planning, custom furniture, lighting, and full project management included.",
    shortDesc:
      "End-to-end interior design services for apartments, brownstones, townhouses, and condos across New York City.",
    description:
      "Our full-home interior design service covers every room in your NYC residence from concept to completion. We handle space planning, material selection, custom furniture sourcing, lighting design, and project management — transforming your entire home into a cohesive, functional, and stunning living environment. Whether you're renovating a pre-war apartment on the Upper West Side or designing a new-construction condo in Hudson Yards, our team delivers personalized interiors that reflect your lifestyle.",
    features: [
      "Comprehensive space planning and layout optimization",
      "Custom furniture sourcing and procurement",
      "Material and finish selection (flooring, cabinetry, countertops)",
      "Lighting design and fixture specification",
      "Color palette development and paint selection",
      "Window treatment design and installation",
      "Art curation and accessory styling",
      "Full project management and contractor coordination",
    ],
    category: "design",
  },
  {
    name: "Kitchen Design",
    h1: "Custom Kitchen Interior Design for NYC Apartments, Brownstones & Condos",
    slug: "kitchen-design",
    tagline: "From galley kitchen makeovers in Manhattan studios to chef-grade installations in Brooklyn brownstones — our designers maximize every square inch with custom cabinetry, premium countertops, and smart storage solutions built for New York City living.",
    shortDesc:
      "Expert kitchen design and renovation services tailored to New York City's unique layouts and building requirements.",
    description:
      "The kitchen is the heart of every NYC home, and our design team specializes in maximizing every square inch. We create custom kitchen layouts that balance style, storage, and functionality — from galley kitchens in studio apartments to chef-grade installations in brownstone renovations. Every design considers NYC-specific challenges like building codes, co-op board approvals, and the logistics of material delivery in high-rise buildings.",
    features: [
      "Custom cabinetry design and specification",
      "Countertop material selection (marble, quartz, granite)",
      "Appliance specification and placement planning",
      "Lighting design including under-cabinet and pendant fixtures",
      "Backsplash and tile design",
      "Storage optimization for small NYC kitchens",
      "NYC DOB permit coordination for plumbing and electrical",
      "Co-op and condo board alteration agreement support",
    ],
    category: "design",
  },
  {
    name: "Bathroom Design",
    h1: "Luxury Bathroom Design & Spa-Inspired Renovation for NYC Apartments & Townhouses",
    slug: "bathroom-design",
    tagline: "Transform compact NYC bathrooms into spa-quality retreats with premium tile, custom vanities, walk-in showers, heated floors, and smart storage — fully designed for co-op and condo building requirements.",
    shortDesc:
      "Spa-inspired bathroom design and renovation for apartments, townhouses, and commercial properties across NYC.",
    description:
      "NYC bathrooms may be compact, but they can be extraordinary. Our bathroom design service transforms cramped, outdated spaces into luxurious retreats with thoughtful layouts, premium materials, and smart storage solutions. We handle everything from tile selection and vanity design to shower systems and lighting — all while navigating NYC's strict plumbing codes and building requirements.",
    features: [
      "Complete bathroom layout and space planning",
      "Tile design and material selection",
      "Custom vanity and cabinetry design",
      "Shower and tub specification",
      "Lighting design for ambiance and function",
      "Heated flooring and towel warmer integration",
      "Waterproofing and ventilation planning",
      "NYC plumbing code compliance and permit coordination",
    ],
    category: "design",
  },
  {
    name: "Living Room Design",
    h1: "Living Room Interior Design & Furniture Layout for NYC Apartments & Homes",
    slug: "living-room-design",
    tagline: "Create a living room that works as hard as you do — open-concept layouts, multi-functional furniture, custom built-ins, and curated styling for apartments where the living room doubles as dining room, home office, and guest space.",
    shortDesc:
      "Custom living room design that maximizes space, comfort, and style for New York City apartments and homes.",
    description:
      "Your living room is where you relax, entertain, and spend the most time at home. In NYC, where living rooms often double as dining areas, home offices, and guest rooms, smart design is essential. We create living room interiors that feel spacious, functional, and beautifully styled — selecting furniture scaled to your space, designing custom built-ins, and curating every detail from rugs to lighting.",
    features: [
      "Furniture layout and space planning",
      "Custom sofa, seating, and table selection",
      "Built-in storage and shelving design",
      "Fireplace surround design and renovation",
      "Window treatment and drapery design",
      "Rug, textile, and pillow curation",
      "Art placement and gallery wall design",
      "Media and entertainment center integration",
    ],
    category: "design",
  },
  {
    name: "Bedroom Design",
    h1: "Bedroom Interior Design & Custom Storage Solutions for NYC Apartments",
    slug: "bedroom-design",
    tagline: "Design a restful retreat from the energy of New York City — master suites with walk-in closets, compact bedrooms with floor-to-ceiling storage, luxury bedding, blackout window treatments, and ambient lighting tailored to your space.",
    shortDesc:
      "Personalized bedroom design services creating restful, beautiful retreats in NYC apartments and townhouses.",
    description:
      "A well-designed bedroom is your sanctuary from the energy of New York City. We design bedrooms that prioritize comfort, tranquility, and smart storage — from master suites with walk-in closets to compact bedrooms where every inch serves a purpose. Our designs balance luxury with practicality, incorporating quality bedding, thoughtful lighting, and custom closet systems.",
    features: [
      "Bed frame and headboard selection",
      "Custom closet and wardrobe design",
      "Nightstand and dresser specification",
      "Bedding and textile curation",
      "Ambient and task lighting design",
      "Blackout window treatment solutions",
      "Accent wall and wallpaper design",
      "Nursery and children's room design",
    ],
    category: "design",
  },
  {
    name: "Home Office Design",
    h1: "Home Office Design for NYC Remote Workers, Entrepreneurs & Creative Professionals",
    slug: "home-office-design",
    tagline: "Purpose-built workspaces that boost productivity and look great on video calls — ergonomic layouts, acoustic treatments, integrated tech, and dual-purpose room design for NYC apartments where every square foot counts.",
    shortDesc:
      "Functional and inspiring home office design for remote workers, entrepreneurs, and creatives in New York City.",
    description:
      "With remote and hybrid work now permanent for many NYC professionals, a well-designed home office is essential. We create workspaces that boost productivity, minimize distractions, and look great on video calls — whether you have a dedicated room or need to carve out a work zone in your living room or bedroom. Every design considers ergonomics, acoustics, lighting, and technology integration.",
    features: [
      "Desk and workstation layout planning",
      "Ergonomic chair and furniture selection",
      "Built-in shelving and storage solutions",
      "Video call backdrop design",
      "Task lighting and ambient lighting balance",
      "Acoustic treatment for noise reduction",
      "Cable management and tech integration",
      "Dual-purpose room design (office/guest room)",
    ],
    category: "design",
  },
  {
    name: "Commercial Interior Design",
    h1: "Commercial Interior Design for NYC Offices, Retail Stores, Restaurants & Hotels",
    slug: "commercial-interior-design",
    tagline: "Full-service commercial design that reinforces your brand and impresses every client who walks through the door — offices, co-working spaces, retail shops, restaurants, medical practices, and hospitality venues across all five boroughs.",
    shortDesc:
      "Full-service interior design for offices, retail spaces, restaurants, hotels, and commercial properties in New York City.",
    description:
      "First impressions matter in business, and your commercial interior sets the tone for every client, customer, and employee interaction. We provide comprehensive commercial interior design for offices, retail stores, restaurants, hotels, medical offices, and co-working spaces throughout NYC. Our commercial team understands the demands of high-traffic spaces and delivers designs that reinforce your brand while meeting ADA compliance and NYC building codes.",
    features: [
      "Office layout and space planning",
      "Retail store design and visual merchandising",
      "Restaurant and hospitality interior design",
      "Reception area and lobby design",
      "Conference room and meeting space design",
      "ADA compliance and accessibility planning",
      "Brand identity integration into physical spaces",
      "NYC DOB permit and code compliance coordination",
    ],
    category: "design",
  },
  {
    name: "Space Planning & Layout",
    h1: "NYC Apartment Space Planning, Floor Plan Optimization & Furniture Layout Design",
    slug: "space-planning",
    tagline: "Make every square foot count with professional floor plan analysis, 3D renderings, traffic flow optimization, and furniture placement guides — the difference between an NYC apartment that feels cramped and one that feels twice its size.",
    shortDesc:
      "Professional floor plan optimization and furniture layout services for maximizing every square foot of your NYC property.",
    description:
      "In New York City, square footage is precious — and smart space planning is the difference between a home that feels cramped and one that feels spacious. Our space planning service analyzes your floor plan, traffic flow, and lifestyle needs to create optimized layouts that make the most of every room. We provide detailed floor plans, furniture placement guides, and 3D renderings before any purchases are made.",
    features: [
      "Detailed floor plan analysis and measurement",
      "Traffic flow optimization",
      "Furniture placement and scale planning",
      "3D renderings and virtual walkthroughs",
      "Multi-functional room design",
      "Storage optimization strategies",
      "Open-concept vs. defined-room recommendations",
      "Pre-purchase layout planning for new apartments",
    ],
    category: "design",
  },
  {
    name: "Color Consultation",
    h1: "Interior Color Consultation & Paint Selection for NYC Apartments & Homes",
    slug: "color-consultation",
    tagline: "Whole-home color palettes developed for NYC light conditions — accounting for natural light, ceiling height, room size, and surrounding views to choose paint colors, accent tones, and material finishes that transform your interior.",
    shortDesc:
      "Expert color palette development and paint selection services for residential and commercial interiors in NYC.",
    description:
      "Color sets the mood of every room, and choosing the right palette for NYC interiors requires understanding how natural light, room size, ceiling height, and surrounding views affect perception. Our color consultation service develops cohesive palettes that flow throughout your home, selecting specific paint colors, accent tones, and complementary materials that work with your furniture, art, and lifestyle.",
    features: [
      "Whole-home color palette development",
      "Paint color selection with brand specification",
      "Accent wall and feature color design",
      "Natural light analysis by room and season",
      "Color coordination with existing furniture",
      "Wallpaper and textured finish recommendations",
      "Exterior door and trim color selection",
      "Sample testing and on-site evaluation",
    ],
    category: "design",
  },
  {
    name: "Furniture Selection & Procurement",
    h1: "Furniture Selection, Sourcing & Procurement for NYC Apartments — Trade-Only Access",
    slug: "furniture-selection",
    tagline: "Access trade-only showrooms, custom fabricators, and curated vintage dealers — plus full procurement, delivery coordination past tight NYC doorways and freight elevators, and white-glove installation so you never lift a finger.",
    shortDesc:
      "Professional furniture sourcing, procurement, and installation services with access to trade-only showrooms and custom makers.",
    description:
      "Finding the right furniture for a NYC home means navigating thousands of options while accounting for tight doorways, narrow staircases, freight elevator schedules, and building delivery restrictions. Our furniture selection service gives you access to trade-only showrooms, custom fabricators, and curated vintage dealers — plus we handle all procurement, delivery coordination, and installation so you don't have to.",
    features: [
      "Access to trade-only showrooms and pricing",
      "Custom furniture design and fabrication",
      "Vintage and antique sourcing",
      "Delivery logistics and building coordination",
      "Fabric and upholstery selection",
      "Furniture plan with dimensions and specifications",
      "Budget management and price negotiations",
      "White-glove delivery and installation oversight",
    ],
    category: "design",
  },
  {
    name: "Lighting Design",
    h1: "Residential & Commercial Lighting Design for NYC Apartments, Homes & Offices",
    slug: "lighting-design",
    tagline: "Layered lighting plans combining ambient, task, and accent lighting — recessed layouts, pendant placement, under-cabinet fixtures, smart dimmer systems, and natural light optimization designed specifically for New York City interiors.",
    shortDesc:
      "Layered lighting design that enhances ambiance, functionality, and architectural features in every room.",
    description:
      "Great lighting transforms a room more than almost any other design element. Our lighting design service creates layered lighting plans that combine ambient, task, and accent lighting to highlight your interior's best features while serving every functional need. We specify fixtures, bulb temperatures, dimmer systems, and smart controls — all coordinated with your interior design for a seamless result.",
    features: [
      "Layered lighting plans (ambient, task, accent)",
      "Fixture selection and specification",
      "Recessed lighting layout design",
      "Pendant and chandelier placement",
      "Under-cabinet and cove lighting",
      "Smart lighting and dimmer system integration",
      "Natural light optimization strategies",
      "NYC electrical code compliance coordination",
    ],
    category: "design",
  },
  {
    name: "Custom Closet Design",
    h1: "Custom Closet Design & Organization Systems for Small NYC Apartments & Walk-Ins",
    slug: "custom-closet-design",
    tagline: "Double or triple your closet storage capacity with custom-built systems — hanging rods, adjustable shelving, pull-out drawers, shoe storage, and seasonal rotation solutions designed and measured for your exact NYC closet dimensions.",
    shortDesc:
      "Maximize storage with custom-designed closet systems built specifically for New York City's compact spaces.",
    description:
      "NYC closets are notoriously small, but a custom closet system can double or triple your storage capacity. We design closet interiors that organize every item — from clothing and shoes to accessories and seasonal storage — using a combination of hanging rods, shelving, drawers, and specialty inserts. Every design is custom-measured and built to fit your exact closet dimensions.",
    features: [
      "Custom closet system design and specification",
      "Walk-in closet layout optimization",
      "Reach-in closet maximization",
      "Shoe storage and display solutions",
      "Drawer and pull-out accessory organizers",
      "Seasonal rotation and storage planning",
      "Pantry and linen closet organization",
      "Installation coordination and oversight",
    ],
    category: "design",
  },
  {
    name: "Renovation Management",
    h1: "NYC Apartment Renovation Project Management — Permits, Contractors & Timeline Control",
    slug: "renovation-management",
    tagline: "We handle every logistical detail of your NYC renovation — DOB permits, co-op board approvals, contractor coordination, material lead times, building schedules, and budget tracking so you focus on design decisions, not construction chaos.",
    shortDesc:
      "End-to-end renovation project management for apartment, brownstone, and townhouse renovations across New York City.",
    description:
      "NYC renovations are complex — co-op board approvals, DOB permits, contractor coordination, material lead times, building schedules, and neighbor notifications all need to be managed simultaneously. Our renovation management service handles every logistical detail so you can focus on the design. We coordinate architects, contractors, and tradespeople while maintaining quality, budget, and timeline control throughout the project.",
    features: [
      "Contractor vetting, bidding, and selection",
      "NYC DOB permit filing and expediting",
      "Co-op and condo alteration agreement management",
      "Construction schedule and timeline management",
      "Budget tracking and change order control",
      "Quality inspections and punch list management",
      "Material ordering and delivery coordination",
      "Building management and neighbor coordination",
    ],
    category: "design",
  },
  {
    name: "Window Treatment Design",
    h1: "Custom Window Treatments, Curtains, Blinds & Motorized Shades for NYC Apartments",
    slug: "window-treatment-design",
    tagline: "Bespoke drapery, Roman shades, motorized blinds, plantation shutters, and blackout layering systems — measured, sourced from premium textile houses, and professionally installed to control light, add privacy, and frame your NYC views.",
    shortDesc:
      "Bespoke curtains, blinds, shades, and drapery design for residential and commercial spaces in New York City.",
    description:
      "Window treatments are one of the most impactful design elements in any NYC interior — they control light, provide privacy, add softness, and frame your views. Our window treatment design service covers everything from custom drapery and Roman shades to motorized blinds and plantation shutters. We measure, specify, source, and coordinate installation for a perfect result every time.",
    features: [
      "Custom drapery and curtain design",
      "Roman shade and roller shade specification",
      "Motorized blind and shade systems",
      "Sheer and blackout layering options",
      "Fabric selection from premium textile houses",
      "Hardware and rod selection and installation",
      "Plantation shutter design and fitting",
      "Energy-efficient window treatment solutions",
    ],
    category: "design",
  },
  {
    name: "Art Curation & Styling",
    h1: "Art Curation, Selection & Professional Installation for NYC Homes & Offices",
    slug: "art-curation",
    tagline: "Build a collection that reflects your taste and complements your interior — original artwork, limited editions, photography, and sculpture sourced from galleries, emerging artists, and private dealers, with professional hanging and art lighting.",
    shortDesc:
      "Expert art selection, placement, and installation services that bring personality and sophistication to your interior.",
    description:
      "Art completes an interior, and our curation service helps you build a collection that reflects your taste, complements your design, and appreciates in value. We work with galleries, emerging artists, print houses, and private dealers to source original artwork, limited editions, photography, and sculpture. Every piece is selected for its relationship to your space — scale, color, subject, and placement are all considered.",
    features: [
      "Original artwork and limited edition sourcing",
      "Gallery and artist relationship access",
      "Photography and print curation",
      "Sculpture and 3D art placement",
      "Gallery wall design and layout",
      "Professional art hanging and installation",
      "Art lighting specification",
      "Collection management and rotation planning",
    ],
    category: "design",
  },
  {
    name: "Staging & Styling",
    h1: "NYC Home Staging & Real Estate Styling — Sell Faster at a Higher Price",
    slug: "staging-styling",
    tagline: "Professional staging that transforms empty or lived-in properties into aspirational spaces — furniture rental, photography-ready styling, luxury staging for high-end listings, and open house preparation designed for NYC's competitive real estate market.",
    shortDesc:
      "Real estate staging and interior styling services that maximize property value and accelerate sales in the NYC market.",
    description:
      "In NYC's competitive real estate market, staging can mean the difference between a quick sale at asking price and months of price reductions. Our staging service transforms empty or lived-in properties into aspirational spaces that photograph beautifully and appeal to the broadest range of buyers. We handle everything from furniture rental and styling to photography coordination and open house preparation.",
    features: [
      "Vacant property staging with rented furnishings",
      "Occupied home editing and restyling",
      "Furniture rental coordination and logistics",
      "Photography-ready styling and set dressing",
      "Luxury staging for high-end listings",
      "Model apartment and new development staging",
      "Open house preparation and styling",
      "Post-sale furniture removal and return",
    ],
    category: "design",
  },
  {
    name: "Wallpaper & Wall Treatments",
    h1: "Designer Wallpaper, Venetian Plaster & Custom Wall Treatments for NYC Interiors",
    slug: "wallpaper-wall-treatments",
    tagline: "Go beyond paint with designer wallpaper, hand-painted murals, Venetian plaster, lime wash finishes, wood paneling, and upholstered accent walls — sourced from the world's best manufacturers and professionally installed in your NYC home or office.",
    shortDesc:
      "Custom wallpaper selection, murals, textured finishes, and accent wall design for residential and commercial spaces.",
    description:
      "Wall treatments add depth, texture, and personality that paint alone cannot achieve. Our service covers everything from designer wallpaper and hand-painted murals to Venetian plaster, wood paneling, and upholstered walls. We help you select the right treatment for each room, source materials from the world's best manufacturers, and coordinate professional installation.",
    features: [
      "Designer wallpaper selection and specification",
      "Custom mural and hand-painted wall design",
      "Venetian plaster and lime wash finishes",
      "Wood paneling and wainscoting design",
      "Upholstered wall and acoustic panel installation",
      "Textured plaster and specialty finishes",
      "Accent wall concept and design",
      "Professional wallpaper installation coordination",
    ],
    category: "design",
  },
  {
    name: "Smart Home Integration",
    h1: "Smart Home Automation & Technology Integration for NYC Apartments & Residences",
    slug: "smart-home-integration",
    tagline: "Seamless smart home systems that enhance daily comfort without cluttering your interior — automated lighting scenes, motorized shades, whole-home audio, climate zones, security integration, and voice control with minimal visible hardware.",
    shortDesc:
      "Seamless technology integration including smart lighting, climate control, audio, security, and automation systems.",
    description:
      "Modern NYC living demands smart technology that enhances comfort without cluttering your interior. We design smart home systems that integrate seamlessly with your interior design — from automated lighting scenes and motorized shades to whole-home audio, climate control, and security. Every system is designed for intuitive daily use with minimal visible hardware.",
    features: [
      "Smart lighting control and scene programming",
      "Motorized shade and drapery automation",
      "Whole-home audio system design",
      "Smart thermostat and climate zone planning",
      "Security camera and intercom integration",
      "Automated door lock and access systems",
      "Hidden TV and media equipment solutions",
      "Voice control and smart assistant setup",
    ],
    category: "design",
  },

  /* ── Contractor Services (18) ── */

  {
    name: "Kitchen Renovation & Remodeling",
    h1: "Kitchen Renovation & Remodeling Contractors in NYC — Licensed, Insured & DOB-Permitted",
    slug: "kitchen-renovation",
    tagline: "Full gut renovations to modern remodels — demolition, plumbing rough-in, custom cabinet installation, countertop fabrication, backsplash tiling, and electrical hookups with DOB permits, co-op board coordination, and freight elevator scheduling handled for you.",
    shortDesc:
      "Gut renovations, cabinet installation, countertop fabrication, plumbing, electrical, and tile work for NYC kitchens.",
    description:
      "Our kitchen renovation team handles every phase of construction — from demolition and plumbing rough-in to cabinet installation, countertop fabrication, backsplash tiling, and final electrical hookups. We manage DOB permits, coordinate freight elevator access for material deliveries, and work within co-op and condo alteration agreements. Whether you need a full gut renovation of a pre-war galley kitchen or a modern remodel in a new-construction high-rise, our licensed contractors deliver quality craftsmanship on schedule.",
    features: [
      "Full gut renovation and demolition",
      "Custom and pre-fabricated cabinet installation",
      "Countertop templating, fabrication, and installation",
      "Plumbing rough-in and fixture installation",
      "Electrical rewiring, outlet relocation, and lighting",
      "Backsplash and floor tile installation",
      "NYC DOB permit filing and expediting",
      "Co-op and condo alteration agreement coordination",
    ],
    category: "contractor",
  },
  {
    name: "Bathroom Renovation & Remodeling",
    h1: "Bathroom Renovation & Remodeling Contractors in NYC — Gut Renos, Tile & Plumbing",
    slug: "bathroom-renovation",
    tagline: "Complete bathroom gut renovations with waterproofing, shower pan construction, floor and wall tile installation, vanity fitting, plumbing rough-in, heated flooring, and ventilation upgrades — all DOB-permitted and co-op board compliant.",
    shortDesc:
      "Complete bathroom gut renos including tile installation, plumbing rough-in, vanity installation, and waterproofing.",
    description:
      "Bathroom renovations in NYC require specialized expertise — from waterproofing membrane installation and plumbing rough-in to precise tile work and vanity fitting. Our crews manage the entire process, including demolition, subfloor preparation, shower pan construction, fixture installation, and ventilation upgrades. We handle building logistics like freight elevator scheduling, material staging, and neighbor notifications, plus all DOB permits and co-op board requirements.",
    features: [
      "Full bathroom demolition and gut renovation",
      "Waterproofing membrane and shower pan installation",
      "Floor and wall tile installation (ceramic, porcelain, marble)",
      "Vanity and cabinetry installation",
      "Plumbing rough-in and fixture hookup",
      "Heated flooring system installation",
      "Ventilation fan installation and ductwork",
      "NYC plumbing permits and code compliance",
    ],
    category: "contractor",
  },
  {
    name: "General Contracting",
    h1: "Licensed General Contractors for NYC Apartment, Brownstone & Condo Renovations",
    slug: "general-contracting",
    tagline: "Single-point accountability for renovations of any scale — we coordinate plumbing, electrical, carpentry, painting, tiling, and HVAC under one roof with DOB permits, structural engineering, co-op board alteration agreements, and building logistics managed start to finish.",
    shortDesc:
      "Full-scale residential and commercial renovation management, structural work, and NYC code compliance.",
    description:
      "Our general contracting service provides comprehensive project management for renovations of any scale across New York City. We coordinate all trades — plumbing, electrical, carpentry, painting, tiling, and HVAC — under a single point of accountability. From pre-war brownstone restorations to modern high-rise condo buildouts, we handle DOB permits, structural engineering coordination, co-op board alteration agreements, and building management logistics so your renovation runs smoothly from start to finish.",
    features: [
      "Full renovation project management and scheduling",
      "Trade coordination (plumbing, electrical, carpentry, HVAC)",
      "Structural modification and load-bearing wall removal",
      "NYC DOB permit filing and inspection coordination",
      "Co-op and condo alteration agreement management",
      "Budget tracking and change order management",
      "Material procurement and delivery logistics",
      "Building management and freight elevator coordination",
    ],
    category: "contractor",
  },
  {
    name: "Painting & Wall Finishing",
    h1: "Interior & Exterior Painting, Venetian Plaster & Wall Finishing Services in NYC",
    slug: "painting-services",
    tagline: "Meticulous prep work followed by expert application of premium paints, Venetian plaster, lime wash, skim coating, and wallpaper installation — with building common area protection, zero neighbor disruption, and flawless results every time.",
    shortDesc:
      "Interior and exterior painting, Venetian plaster, skim coating, wallpaper installation, and accent walls across NYC.",
    description:
      "A flawless paint job or specialty wall finish transforms any NYC interior. Our painting crews deliver meticulous prep work — patching, sanding, skim coating, and priming — followed by expert application of premium paints and finishes. We specialize in Venetian plaster, lime wash, wallpaper installation, and decorative accent walls. For co-ops and condos, we protect common areas during work, coordinate building access, and ensure zero disruption to neighbors.",
    features: [
      "Interior painting (walls, ceilings, trim, doors)",
      "Venetian plaster and lime wash application",
      "Skim coating and wall smoothing",
      "Wallpaper installation and removal",
      "Accent wall and feature wall creation",
      "Exterior painting and facade touch-ups",
      "Lead paint testing and safe abatement prep",
      "Building common area protection and cleanup",
    ],
    category: "contractor",
  },
  {
    name: "Flooring Installation",
    h1: "Hardwood, Tile & Luxury Vinyl Flooring Installation for NYC Apartments & Homes",
    slug: "flooring-installation",
    tagline: "Precision installation of hardwood, engineered wood, tile, marble, luxury vinyl plank, and carpet — with subfloor leveling, moisture testing, soundproofing underlayment for co-op STC compliance, and radiant heat flooring available.",
    shortDesc:
      "Hardwood, tile, marble, LVP, carpet, and radiant heat flooring installation with subfloor prep for NYC properties.",
    description:
      "Flooring is one of the most impactful upgrades in any NYC home, and proper installation is critical for longevity and appearance. Our flooring team handles everything from subfloor leveling and moisture testing to precision installation of hardwood, engineered wood, tile, marble, luxury vinyl plank, and carpet. We coordinate freight elevator access for material deliveries and work within building noise restrictions. For co-ops requiring 80% floor coverage or STC ratings, we install appropriate underlayment and soundproofing.",
    features: [
      "Hardwood and engineered wood installation",
      "Tile and natural stone flooring (marble, slate, travertine)",
      "Luxury vinyl plank (LVP) installation",
      "Carpet installation and stretching",
      "Subfloor preparation, leveling, and moisture mitigation",
      "Radiant heat flooring system installation",
      "Soundproofing underlayment for co-op compliance",
      "Hardwood refinishing and restoration",
    ],
    category: "contractor",
  },
  {
    name: "Custom Carpentry & Millwork",
    h1: "Custom Carpentry, Built-In Cabinetry & Millwork for NYC Apartments & Townhouses",
    slug: "custom-carpentry",
    tagline: "One-of-a-kind built-ins, bookshelves, entertainment centers, wainscoting, coffered ceilings, and bespoke furniture — built on-site or in our shop, measured to your exact dimensions, and finished to match your building's architectural character.",
    shortDesc:
      "Built-in cabinetry, bookshelves, wainscoting, crown molding, and custom furniture building for NYC homes.",
    description:
      "Custom carpentry transforms NYC apartments and townhouses with one-of-a-kind built-ins, cabinetry, and millwork that maximize space and add architectural character. Our carpenters build everything on-site or in our shop — custom bookshelves, entertainment centers, window seats, wainscoting, coffered ceilings, and bespoke furniture pieces. Every project is measured to your exact dimensions and finished to the highest standard, with careful attention to the architectural style of your building.",
    features: [
      "Custom built-in cabinetry and bookshelves",
      "Wainscoting and wall paneling installation",
      "Crown molding and decorative trim",
      "Custom entertainment centers and media walls",
      "Window seat and banquette construction",
      "Coffered and tray ceiling installation",
      "Custom furniture building and restoration",
      "On-site fabrication and precision fitting",
    ],
    category: "contractor",
  },
  {
    name: "Electrical Services",
    h1: "Licensed Electricians for NYC Apartment Renovations — Rewiring, Panels & Recessed Lighting",
    slug: "electrical-services",
    tagline: "Panel upgrades, circuit additions, complete rewiring, recessed lighting installation, outlet relocation, and smart home wiring — all performed to NYC electrical code with DOB permits, inspections, and building management coordination included.",
    shortDesc:
      "Rewiring, panel upgrades, recessed lighting, outlet relocation, smart home wiring, and full NYC code compliance.",
    description:
      "NYC's aging electrical infrastructure means many apartments and brownstones need significant electrical work during renovations. Our licensed electricians handle panel upgrades, circuit additions, complete rewiring, recessed lighting installation, outlet relocation, and smart home wiring. Every job is performed to NYC electrical code with proper DOB permits and sign-offs. We coordinate with building management on shutdowns and work within the strict scheduling requirements of co-ops and condos.",
    features: [
      "Electrical panel upgrades and circuit additions",
      "Complete apartment and brownstone rewiring",
      "Recessed lighting layout and installation",
      "Outlet and switch relocation",
      "Smart home and low-voltage wiring",
      "Dedicated appliance circuits (ranges, HVAC, laundry)",
      "NYC DOB electrical permits and inspections",
      "Emergency electrical repairs and troubleshooting",
    ],
    category: "contractor",
  },
  {
    name: "Plumbing Services",
    h1: "Licensed Plumbers for NYC Kitchen & Bathroom Renovations, Pipe Replacement & Gas Lines",
    slug: "plumbing-services",
    tagline: "Fixture swaps to complete re-piping — kitchen and bathroom rough-in, gas line installation, water heater replacement, drain cleaning, and sewer repair with DOB permits filed, water shutoffs coordinated, and every inspection passed on the first attempt.",
    shortDesc:
      "Pipe replacement, fixture installation, gas line work, water heaters, and kitchen/bath plumbing rough-in across NYC.",
    description:
      "NYC plumbing work requires licensed professionals who understand the city's complex piping systems, building codes, and permit requirements. Our plumbers handle everything from basic fixture swaps to complete re-piping, gas line installation, water heater replacement, and kitchen and bathroom rough-in for renovations. We coordinate water shutoffs with building management, file all required DOB permits, and ensure every installation passes inspection on the first attempt.",
    features: [
      "Pipe replacement and re-piping (copper, PEX)",
      "Kitchen and bathroom plumbing rough-in",
      "Fixture installation (sinks, toilets, tubs, showers)",
      "Gas line installation and leak repair",
      "Water heater installation and replacement",
      "Drain cleaning and sewer line repair",
      "NYC DOB plumbing permits and inspections",
      "Building water shutoff coordination",
    ],
    category: "contractor",
  },
  {
    name: "Drywall & Plastering",
    h1: "Drywall Installation, Skim Coating & Plaster Repair for NYC Apartments & Brownstones",
    slug: "drywall-plastering",
    tagline: "New partition walls, historic plaster and lath repair, flawless skim coating, soundproofing drywall assemblies for co-op noise requirements, and Level 5 finishes — with fire-rated assemblies where required by NYC building code.",
    shortDesc:
      "Sheetrock installation, skim coating, plaster repair, soundproofing, and partition wall construction across NYC.",
    description:
      "Whether you need new partition walls, plaster repair in a pre-war apartment, or a flawless skim coat over damaged surfaces, our drywall and plastering team delivers smooth, paint-ready walls every time. We build new walls to create rooms, repair damaged plaster and lath, install soundproofing drywall assemblies for co-op noise requirements, and provide Level 5 finishes for the most demanding projects. All work includes proper fire-rated assemblies where required by NYC building code.",
    features: [
      "Sheetrock installation and taping",
      "Skim coating over plaster and drywall",
      "Historic plaster and lath repair",
      "Soundproofing wall assemblies (STC-rated)",
      "Partition wall construction and room division",
      "Fire-rated drywall assembly installation",
      "Ceiling repair and replacement",
      "Smooth Level 5 finish for premium results",
    ],
    category: "contractor",
  },
  {
    name: "Tile & Stone Installation",
    h1: "Tile & Natural Stone Installation for NYC Kitchens, Bathrooms & Floors — Marble, Porcelain & Mosaic",
    slug: "tile-installation",
    tagline: "Precision tile setting for ceramic, porcelain, marble, granite, slate, glass mosaic, and large-format slabs — kitchen backsplashes, bathroom shower surrounds, full-floor marble installations with tight grout lines and seamless transitions.",
    shortDesc:
      "Ceramic, porcelain, marble, natural stone, mosaic, backsplash, and floor and wall tile installation for NYC properties.",
    description:
      "Precision tile and stone installation requires experienced craftspeople who understand substrate preparation, waterproofing, layout geometry, and material handling. Our tile setters work with every material — ceramic, porcelain, marble, granite, slate, travertine, glass mosaic, and large-format slabs. From kitchen backsplashes and bathroom shower surrounds to full-floor marble installations, we deliver flawless results with tight grout lines and seamless transitions. Materials are delivered and staged with building coordination to minimize disruption.",
    features: [
      "Ceramic and porcelain tile installation",
      "Marble and natural stone floor and wall tile",
      "Mosaic and glass tile accent installation",
      "Kitchen backsplash installation",
      "Shower surround and tub deck tiling",
      "Large-format slab installation",
      "Substrate preparation and waterproofing",
      "Grout sealing and stone sealing",
    ],
    category: "contractor",
  },
  {
    name: "Cabinet Installation",
    h1: "Kitchen Cabinet & Bathroom Vanity Installation in NYC — Custom, Semi-Custom & Stock",
    slug: "cabinet-installation",
    tagline: "Level, plumb, and perfectly aligned cabinet installations regardless of your building's walls and floors — measurement, template verification, delivery coordination, hardware mounting, soft-close upgrades, and final adjustment all included.",
    shortDesc:
      "Kitchen cabinets, bathroom vanities, built-in storage, custom closet systems, and hardware installation across NYC.",
    description:
      "Proper cabinet installation is essential for both function and appearance in NYC kitchens, bathrooms, and living spaces. Our installers work with every cabinet type — custom, semi-custom, and stock — ensuring level, plumb, and perfectly aligned results regardless of your building's walls and floors. We handle everything from initial measurement and template verification through delivery coordination, installation, hardware mounting, and final adjustment. Freight elevator scheduling, building protection, and debris removal are all included.",
    features: [
      "Kitchen cabinet installation (custom and stock)",
      "Bathroom vanity installation",
      "Built-in storage and wardrobe systems",
      "Custom closet system installation",
      "Hardware and pull installation",
      "Soft-close hinge and drawer slide upgrades",
      "Countertop support and preparation",
      "Freight elevator and delivery coordination",
    ],
    category: "contractor",
  },
  {
    name: "Demolition & Gut Renovation",
    h1: "Interior Demolition & Gut Renovation Services in NYC — Permitted, Insured & Code-Compliant",
    slug: "demolition-gut-renovation",
    tagline: "Controlled selective and full interior demolition — asbestos testing coordination, lead paint assessment, DOB demolition permits, debris removal logistics, structural engineer coordination, and building protection for floors, elevators, and hallways.",
    shortDesc:
      "Selective and full demolition, asbestos abatement coordination, debris removal, and structural modification in NYC.",
    description:
      "Gut renovation starts with controlled demolition — and in NYC, that means navigating strict building rules, noise ordinances, debris removal logistics, and potential hazardous material concerns. Our demolition crews perform selective and full interior demolition with precision, protecting structural elements, adjacent units, and building common areas. We coordinate asbestos testing and abatement, file DOB demolition permits, arrange debris chutes and dumpster placement, and prepare the space for your renovation team.",
    features: [
      "Full interior gut demolition",
      "Selective demolition and surgical removal",
      "Asbestos testing coordination and abatement referral",
      "Lead paint assessment and safe removal prep",
      "Debris removal, dumpster, and chute logistics",
      "Structural assessment and engineer coordination",
      "DOB demolition permits and compliance",
      "Building protection (floors, elevators, hallways)",
    ],
    category: "contractor",
  },
  {
    name: "Door & Window Installation",
    h1: "Interior Door, Pocket Door & Window Replacement Installation for NYC Apartments & Homes",
    slug: "door-window-installation",
    tagline: "Interior door replacement, pocket door construction, barn door systems, and full window replacement — custom-fitted for pre-war buildings where nothing is plumb or square, with Landmarks Preservation Commission coordination when required.",
    shortDesc:
      "Interior doors, pocket doors, sliding doors, window replacement, and trim and casing installation across NYC.",
    description:
      "Doors and windows define the flow, light, and character of every NYC interior. Our installers handle interior door replacement, pocket door construction, barn door and sliding door systems, and full window replacement projects. We work with pre-war buildings where nothing is plumb or square, custom-fitting each installation for a flawless result. For window replacements, we coordinate with building management, file Landmarks Preservation Commission applications when required, and ensure proper insulation and weathersealing.",
    features: [
      "Interior door installation and replacement",
      "Pocket door construction and installation",
      "Sliding barn door and track systems",
      "Window replacement and new construction windows",
      "Door and window trim, casing, and molding",
      "French door and double door installation",
      "Weatherstripping and insulation upgrades",
      "Landmarks Preservation Commission coordination",
    ],
    category: "contractor",
  },
  {
    name: "Crown Molding & Trim Work",
    h1: "Crown Molding, Baseboard & Decorative Trim Installation for NYC Apartments & Brownstones",
    slug: "crown-molding-trim",
    tagline: "Precision-installed crown molding, baseboards, chair rails, picture rails, wainscoting, and panel molding — matching existing historic profiles in pre-war apartments or creating new modern details with seamless, gap-free results.",
    shortDesc:
      "Crown molding, baseboards, chair rails, wainscoting, decorative trim, and panel molding for NYC interiors.",
    description:
      "Architectural trim and molding add elegance, character, and value to any NYC interior. Our finish carpenters install crown molding, baseboards, chair rails, picture rails, wainscoting, and decorative panel molding with precision — matching existing historic profiles or creating new modern details. We work in pre-war apartments where walls and ceilings are rarely level, using expert techniques to deliver seamless, gap-free results that look like they have always been part of the building.",
    features: [
      "Crown molding installation (classic and modern profiles)",
      "Baseboard installation and replacement",
      "Chair rail and picture rail installation",
      "Wainscoting and raised panel wall treatment",
      "Decorative panel molding and box trim",
      "Window and door casing installation",
      "Historic molding profile matching and replication",
      "Caulking, filling, and paint-ready finishing",
    ],
    category: "contractor",
  },
  {
    name: "Shelving & Built-in Installation",
    h1: "Custom Bookshelves, Floating Shelves & Built-In Storage Installation for NYC Apartments",
    slug: "shelving-built-ins",
    tagline: "Make every wall work harder — custom bookshelves, floating shelves, entertainment centers, mudroom systems, pantry shelving, and display niches custom-measured and anchored to NYC's mix of plaster, drywall, brick, and concrete construction.",
    shortDesc:
      "Custom bookshelves, floating shelves, entertainment centers, mudroom built-ins, and pantry shelving for NYC homes.",
    description:
      "Built-in shelving and storage are essential in NYC apartments where closet space is limited and every wall should work harder. Our team designs and installs custom bookshelves, floating shelves, entertainment centers, mudroom and entryway systems, pantry shelving, and display niches. Every installation is custom-measured, level, and secured to your walls with proper anchoring for NYC's mix of plaster, drywall, brick, and concrete construction.",
    features: [
      "Custom built-in bookshelf construction",
      "Floating shelf installation with hidden brackets",
      "Entertainment center and media wall built-ins",
      "Mudroom and entryway storage systems",
      "Pantry and kitchen shelving installation",
      "Display niche and alcove shelving",
      "Proper wall anchoring (plaster, brick, concrete)",
      "Painting, staining, and finish work",
    ],
    category: "contractor",
  },
  {
    name: "Furniture Assembly & Installation",
    h1: "White-Glove Furniture Assembly, Wall Mounting & Installation for NYC Apartments",
    slug: "furniture-assembly",
    tagline: "Full assembly for all major brands, wall-mounted shelving and mirrors, anti-tip anchoring for tall pieces, Murphy bed installation, and delivery coordination past narrow hallways, tight stairwells, and strict NYC building delivery windows.",
    shortDesc:
      "White-glove furniture assembly, wall mounting, anchoring, and delivery coordination for NYC apartments.",
    description:
      "Getting furniture into a NYC apartment is half the battle — narrow hallways, tight stairwells, small elevators, and strict building delivery windows make assembly and installation a real challenge. Our team provides white-glove furniture assembly for all major brands, wall-mounted furniture and shelving installation, earthquake-style anchoring for tall pieces, and coordination with delivery companies and building management to ensure everything arrives and gets installed without damage or delays.",
    features: [
      "Full furniture assembly (all brands and styles)",
      "Wall mounting for shelves, mirrors, and cabinets",
      "Tall furniture anchoring and anti-tip installation",
      "Delivery coordination and building scheduling",
      "Furniture disassembly and reassembly for moves",
      "Murphy bed and wall bed installation",
      "Desk and workstation assembly and setup",
      "Building protection during delivery and install",
    ],
    category: "contractor",
  },
  {
    name: "TV Mounting & Media Setup",
    h1: "TV Wall Mounting, In-Wall Cable Concealment & Surround Sound Installation in NYC",
    slug: "tv-mounting-media",
    tagline: "Clean, organized entertainment setups — TV mounting on drywall, plaster, brick, or concrete with hidden cables, surround sound systems, soundbar installation, streaming device configuration, and smart home integration for Sonos, Control4, and Lutron.",
    shortDesc:
      "TV wall mounting, cable concealment, surround sound, media cabinet setup, and smart home integration across NYC.",
    description:
      "A properly mounted TV and media system keeps your NYC living space clean, organized, and optimized for entertainment. Our technicians handle TV wall mounting on every surface — drywall, plaster, brick, and concrete — with in-wall cable concealment for a seamless look. We install surround sound systems, soundbars, media cabinets, streaming device setups, and smart home integration. Every installation accounts for viewing angles, glare management, and cable routing to keep your walls pristine.",
    features: [
      "TV wall mounting (all sizes, all wall types)",
      "In-wall cable concealment and power relocation",
      "Surround sound and soundbar installation",
      "Media cabinet and equipment rack setup",
      "Streaming device and smart TV configuration",
      "Smart home integration (Sonos, Control4, Lutron)",
      "Projector and screen installation",
      "Multi-room audio and video distribution",
    ],
    category: "contractor",
  },
  {
    name: "Handyman Services",
    h1: "Reliable Handyman Services for NYC Apartments — Repairs, Installations & Maintenance",
    slug: "handyman-services",
    tagline: "Skilled handymen for the jobs that don't need a full crew — fixture replacements, picture hanging, caulking, minor plumbing and electrical, touch-up painting, weather stripping, and dozens of other tasks done right the first time.",
    shortDesc:
      "General repairs, fixture swaps, picture hanging, caulking, minor plumbing and electrical, and touch-up painting.",
    description:
      "Not every project requires a full renovation crew — sometimes you just need a skilled handyman to handle the small jobs that keep your NYC apartment or home in top shape. Our handyman service covers general repairs, fixture replacements, picture and mirror hanging, caulking and grouting, minor plumbing fixes, light electrical work, touch-up painting, weather stripping, and dozens of other tasks. We show up on time, protect your space, and get the job done right the first time.",
    features: [
      "General home repairs and maintenance",
      "Light fixture and ceiling fan installation",
      "Picture, mirror, and art hanging",
      "Caulking, grouting, and sealant work",
      "Minor plumbing repairs (faucets, toilets, drains)",
      "Minor electrical work (outlets, switches, dimmers)",
      "Touch-up painting and patching",
      "Door adjustments, locks, and hardware swaps",
    ],
    category: "contractor",
  },
];

/* ─── Area Interface & Data ─── */

export interface Area {
  name: string;
  slug: string;
  borough: string;
  boroughSlug: string;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function area(name: string, borough: string, boroughSlug: string): Area {
  return { name, slug: slug(name), borough, boroughSlug };
}

export const areas: Area[] = [
  /* ── Manhattan (30) ── */
  area("Upper East Side", "Manhattan", "manhattan"),
  area("Upper West Side", "Manhattan", "manhattan"),
  area("Midtown", "Manhattan", "manhattan"),
  area("Chelsea", "Manhattan", "manhattan"),
  area("Greenwich Village", "Manhattan", "manhattan"),
  area("East Village", "Manhattan", "manhattan"),
  area("West Village", "Manhattan", "manhattan"),
  area("SoHo", "Manhattan", "manhattan"),
  area("Tribeca", "Manhattan", "manhattan"),
  area("Lower East Side", "Manhattan", "manhattan"),
  area("Financial District", "Manhattan", "manhattan"),
  area("Harlem", "Manhattan", "manhattan"),
  area("East Harlem", "Manhattan", "manhattan"),
  area("Washington Heights", "Manhattan", "manhattan"),
  area("Inwood", "Manhattan", "manhattan"),
  area("Hell's Kitchen", "Manhattan", "manhattan"),
  area("Murray Hill", "Manhattan", "manhattan"),
  area("Gramercy", "Manhattan", "manhattan"),
  area("Flatiron", "Manhattan", "manhattan"),
  area("NoHo", "Manhattan", "manhattan"),
  area("Nolita", "Manhattan", "manhattan"),
  area("Chinatown", "Manhattan", "manhattan"),
  area("Battery Park", "Manhattan", "manhattan"),
  area("Hudson Yards", "Manhattan", "manhattan"),
  area("Roosevelt Island", "Manhattan", "manhattan"),
  area("Morningside Heights", "Manhattan", "manhattan"),
  area("Hamilton Heights", "Manhattan", "manhattan"),
  area("Kips Bay", "Manhattan", "manhattan"),
  area("Stuyvesant Town", "Manhattan", "manhattan"),
  area("Central Park South", "Manhattan", "manhattan"),

  /* ── Brooklyn (25) ── */
  area("Park Slope", "Brooklyn", "brooklyn"),
  area("Williamsburg", "Brooklyn", "brooklyn"),
  area("DUMBO", "Brooklyn", "brooklyn"),
  area("Brooklyn Heights", "Brooklyn", "brooklyn"),
  area("Cobble Hill", "Brooklyn", "brooklyn"),
  area("Carroll Gardens", "Brooklyn", "brooklyn"),
  area("Greenpoint", "Brooklyn", "brooklyn"),
  area("Bushwick", "Brooklyn", "brooklyn"),
  area("Bed-Stuy", "Brooklyn", "brooklyn"),
  area("Crown Heights", "Brooklyn", "brooklyn"),
  area("Flatbush", "Brooklyn", "brooklyn"),
  area("Bay Ridge", "Brooklyn", "brooklyn"),
  area("Sunset Park", "Brooklyn", "brooklyn"),
  area("Prospect Heights", "Brooklyn", "brooklyn"),
  area("Fort Greene", "Brooklyn", "brooklyn"),
  area("Clinton Hill", "Brooklyn", "brooklyn"),
  area("Red Hook", "Brooklyn", "brooklyn"),
  area("Windsor Terrace", "Brooklyn", "brooklyn"),
  area("Ditmas Park", "Brooklyn", "brooklyn"),
  area("Bensonhurst", "Brooklyn", "brooklyn"),
  area("Sheepshead Bay", "Brooklyn", "brooklyn"),
  area("Brighton Beach", "Brooklyn", "brooklyn"),
  area("Kensington", "Brooklyn", "brooklyn"),
  area("Gowanus", "Brooklyn", "brooklyn"),
  area("Boerum Hill", "Brooklyn", "brooklyn"),

  /* ── Queens (20) ── */
  area("Astoria", "Queens", "queens"),
  area("Long Island City", "Queens", "queens"),
  area("Flushing", "Queens", "queens"),
  area("Forest Hills", "Queens", "queens"),
  area("Jackson Heights", "Queens", "queens"),
  area("Bayside", "Queens", "queens"),
  area("Rego Park", "Queens", "queens"),
  area("Woodside", "Queens", "queens"),
  area("Elmhurst", "Queens", "queens"),
  area("Corona", "Queens", "queens"),
  area("Kew Gardens", "Queens", "queens"),
  area("Sunnyside", "Queens", "queens"),
  area("Jamaica", "Queens", "queens"),
  area("Howard Beach", "Queens", "queens"),
  area("Whitestone", "Queens", "queens"),
  area("Douglaston", "Queens", "queens"),
  area("Fresh Meadows", "Queens", "queens"),
  area("Ridgewood", "Queens", "queens"),
  area("Middle Village", "Queens", "queens"),
  area("Maspeth", "Queens", "queens"),

  /* ── Bronx (15) ── */
  area("Riverdale", "Bronx", "bronx"),
  area("Pelham Bay", "Bronx", "bronx"),
  area("Throgs Neck", "Bronx", "bronx"),
  area("City Island", "Bronx", "bronx"),
  area("Morris Park", "Bronx", "bronx"),
  area("Fordham", "Bronx", "bronx"),
  area("Belmont", "Bronx", "bronx"),
  area("Kingsbridge", "Bronx", "bronx"),
  area("Mott Haven", "Bronx", "bronx"),
  area("Hunts Point", "Bronx", "bronx"),
  area("Concourse", "Bronx", "bronx"),
  area("Woodlawn", "Bronx", "bronx"),
  area("Wakefield", "Bronx", "bronx"),
  area("Parkchester", "Bronx", "bronx"),
  area("Co-op City", "Bronx", "bronx"),

  /* ── Staten Island (12) ── */
  area("St. George", "Staten Island", "staten-island"),
  area("Todt Hill", "Staten Island", "staten-island"),
  area("Great Kills", "Staten Island", "staten-island"),
  area("New Dorp", "Staten Island", "staten-island"),
  area("Tottenville", "Staten Island", "staten-island"),
  area("Stapleton", "Staten Island", "staten-island"),
  area("Westerleigh", "Staten Island", "staten-island"),
  area("Eltingville", "Staten Island", "staten-island"),
  area("Annadale", "Staten Island", "staten-island"),
  area("Huguenot", "Staten Island", "staten-island"),
  area("Rossville", "Staten Island", "staten-island"),
  area("Travis", "Staten Island", "staten-island"),

  /* ── Long Island (20) ── */
  area("Garden City", "Long Island", "long-island"),
  area("Great Neck", "Long Island", "long-island"),
  area("Manhasset", "Long Island", "long-island"),
  area("Roslyn", "Long Island", "long-island"),
  area("Port Washington", "Long Island", "long-island"),
  area("Oyster Bay", "Long Island", "long-island"),
  area("Huntington", "Long Island", "long-island"),
  area("Northport", "Long Island", "long-island"),
  area("Cold Spring Harbor", "Long Island", "long-island"),
  area("Syosset", "Long Island", "long-island"),
  area("Jericho", "Long Island", "long-island"),
  area("Massapequa", "Long Island", "long-island"),
  area("Babylon", "Long Island", "long-island"),
  area("Islip", "Long Island", "long-island"),
  area("Smithtown", "Long Island", "long-island"),
  area("Commack", "Long Island", "long-island"),
  area("Dix Hills", "Long Island", "long-island"),
  area("Woodbury", "Long Island", "long-island"),
  area("Old Westbury", "Long Island", "long-island"),
  area("Brookville", "Long Island", "long-island"),

  /* ── Westchester (15) ── */
  area("Scarsdale", "Westchester", "westchester"),
  area("Bronxville", "Westchester", "westchester"),
  area("Larchmont", "Westchester", "westchester"),
  area("Rye", "Westchester", "westchester"),
  area("Mamaroneck", "Westchester", "westchester"),
  area("New Rochelle", "Westchester", "westchester"),
  area("White Plains", "Westchester", "westchester"),
  area("Pelham", "Westchester", "westchester"),
  area("Dobbs Ferry", "Westchester", "westchester"),
  area("Irvington", "Westchester", "westchester"),
  area("Tarrytown", "Westchester", "westchester"),
  area("Hastings-on-Hudson", "Westchester", "westchester"),
  area("Yonkers", "Westchester", "westchester"),
  area("Mount Vernon", "Westchester", "westchester"),
  area("Eastchester", "Westchester", "westchester"),

  /* ── New Jersey / Hudson River (15) ── */
  area("Hoboken", "New Jersey", "new-jersey"),
  area("Jersey City", "New Jersey", "new-jersey"),
  area("Weehawken", "New Jersey", "new-jersey"),
  area("West New York", "New Jersey", "new-jersey"),
  area("Edgewater", "New Jersey", "new-jersey"),
  area("Fort Lee", "New Jersey", "new-jersey"),
  area("Cliffside Park", "New Jersey", "new-jersey"),
  area("North Bergen", "New Jersey", "new-jersey"),
  area("Secaucus", "New Jersey", "new-jersey"),
  area("Bayonne", "New Jersey", "new-jersey"),
  area("Union City", "New Jersey", "new-jersey"),
  area("Guttenberg", "New Jersey", "new-jersey"),
  area("Fairview", "New Jersey", "new-jersey"),
  area("Palisades Park", "New Jersey", "new-jersey"),
  area("Englewood", "New Jersey", "new-jersey"),
];

/* ─── Borough Display Names ─── */

const BOROUGH_NAMES: Record<string, string> = {
  manhattan: "Manhattan",
  brooklyn: "Brooklyn",
  queens: "Queens",
  bronx: "Bronx",
  "staten-island": "Staten Island",
  "long-island": "Long Island",
  westchester: "Westchester",
  "new-jersey": "New Jersey",
};

/* ─── Helper Functions ─── */

export function findServiceBySlug(serviceSlug: string): Service | undefined {
  return services.find((s) => s.slug === serviceSlug);
}

export function findAreaBySlug(
  boroughSlug: string,
  areaSlug: string
): Area | undefined {
  return areas.find(
    (a) => a.boroughSlug === boroughSlug && a.slug === areaSlug
  );
}

export function getAllBoroughs(): {
  name: string;
  slug: string;
  count: number;
}[] {
  const seen = new Map<string, { name: string; slug: string; count: number }>();
  for (const a of areas) {
    const existing = seen.get(a.boroughSlug);
    if (existing) {
      existing.count++;
    } else {
      seen.set(a.boroughSlug, {
        name: BOROUGH_NAMES[a.boroughSlug] ?? a.borough,
        slug: a.boroughSlug,
        count: 1,
      });
    }
  }
  return Array.from(seen.values());
}

export function getAreasByBorough(boroughSlug: string): Area[] {
  return areas.filter((a) => a.boroughSlug === boroughSlug);
}

export function getBoroughUrl(boroughSlug: string): string {
  return `/areas/${boroughSlug}`;
}

export function getAreaUrl(a: Area): string {
  return `/areas/${a.boroughSlug}/${a.slug}`;
}

export function getAreaServiceUrl(a: Area, service: Service): string {
  return `/areas/${a.boroughSlug}/${a.slug}/${service.slug}`;
}

export function getServiceUrl(service: Service): string {
  return `/services/${service.slug}`;
}

export function getDesignServices(): Service[] {
  return services.filter((s) => s.category === "design");
}

export function getContractorServices(): Service[] {
  return services.filter((s) => s.category === "contractor");
}
