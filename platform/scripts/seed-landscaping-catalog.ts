/**
 * One-off: seed 220 real, varied landscaping/lawn-care catalog services onto
 * the "Tucker's Landscaping Company" test tenant's service_types catalog
 * (tenant_id cf50c81f-f726-48e0-82a8-673f1112fbe8). Tenant-scoped test data,
 * not a global/shared table and not a schema change — safe to run directly.
 *
 * USAGE: cd platform && npx tsx scripts/seed-landscaping-catalog.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\\n$/, '')
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1) }
const supabase = createClient(url, key, { auth: { persistSession: false } })

const TENANT_ID = 'cf50c81f-f726-48e0-82a8-673f1112fbe8'

type ItemType = 'service' | 'project' | 'product'
type PerUnit = 'hour' | 'job' | 'unit' | 'sqft' | 'linear_ft' | 'visit' | 'day' | 'custom'
// [name, description, category, item_type, per_unit, priceDollars, durationHours]
type Row = [string, string, string, ItemType, PerUnit, number, number | null]

const ROWS: Row[] = [
  // Mowing & Lawn Maintenance
  ['Weekly Mowing Service', 'Standard residential mow, edge, trim, and blow', 'Mowing & Lawn Maintenance', 'service', 'visit', 55, 1],
  ['Bi-Weekly Mowing Service', 'Reduced-frequency mow for slower-growth season', 'Mowing & Lawn Maintenance', 'service', 'visit', 65, 1],
  ['Small Lot Mowing (Under 5,000 sqft)', 'Quick-turn mow for compact yards', 'Mowing & Lawn Maintenance', 'service', 'visit', 40, 1],
  ['Large Property Mowing (1+ Acre)', 'Zero-turn mowing for expansive lawns', 'Mowing & Lawn Maintenance', 'service', 'visit', 95, 2],
  ['Estate Lawn Mowing (2+ Acres)', 'Multi-mower crew for large estate properties', 'Mowing & Lawn Maintenance', 'service', 'visit', 175, 3],
  ['Commercial Lot Mowing', 'Weekly mow for retail and office grounds', 'Mowing & Lawn Maintenance', 'service', 'visit', 120, 2],
  ['HOA Common Area Mowing', 'Recurring mow for shared community grounds', 'Mowing & Lawn Maintenance', 'service', 'visit', 150, 2],
  ['First-of-Season Mow & Cleanup', 'Season-opening mow with light debris removal', 'Mowing & Lawn Maintenance', 'service', 'job', 85, 2],
  ['String Trimming & Edging', 'Precision edge along walks, drives, and beds', 'Mowing & Lawn Maintenance', 'service', 'visit', 35, 1],
  ['Sidewalk & Curb Edging', 'Mechanical edge along hardscape borders', 'Mowing & Lawn Maintenance', 'service', 'linear_ft', 2, null],
  ['Athletic Field Mowing & Striping', 'Sports-field mow with painted line striping', 'Mowing & Lawn Maintenance', 'service', 'visit', 225, 3],
  ['Golf-Style Fairway Mowing', 'Precision low-cut mowing for manicured turf', 'Mowing & Lawn Maintenance', 'service', 'visit', 195, 3],

  // Trimming & Pruning
  ['Hedge Trimming (Formal Shape)', 'Clean geometric hedge shaping', 'Trimming & Pruning', 'service', 'hour', 65, 1],
  ['Shrub Pruning', 'Health and shape pruning for ornamental shrubs', 'Trimming & Pruning', 'service', 'hour', 60, 1],
  ['Ornamental Tree Pruning', 'Structural pruning for small ornamental trees', 'Trimming & Pruning', 'service', 'hour', 75, 1],
  ['Ornamental Grass Cutback', 'Late-winter cutback of perennial grasses', 'Trimming & Pruning', 'service', 'job', 45, 1],
  ['Perennial Deadheading', 'Spent-bloom removal to extend flowering', 'Trimming & Pruning', 'service', 'hour', 50, 1],
  ['Rose Bush Pruning & Care', 'Seasonal pruning and disease prevention', 'Trimming & Pruning', 'service', 'job', 55, 1],
  ['Boxwood Topiary Shaping', 'Detailed hand-shaping of formal topiary', 'Trimming & Pruning', 'service', 'hour', 85, 2],
  ['Privacy Hedge Maintenance', 'Recurring trim for tall privacy hedges', 'Trimming & Pruning', 'service', 'job', 95, 2],
  ['Foundation Shrub Trim', 'Trim shrubs away from home foundation and siding', 'Trimming & Pruning', 'service', 'job', 65, 1],
  ['Vine & Climbing Plant Control', 'Cut back invasive vines from structures', 'Trimming & Pruning', 'service', 'hour', 60, 1],
  ['Fruit Tree Pruning', 'Dormant-season pruning for fruit production', 'Trimming & Pruning', 'service', 'hour', 80, 2],
  ['Crown Thinning (Small Tree)', 'Selective branch removal to reduce canopy density', 'Trimming & Pruning', 'service', 'job', 250, 3],

  // Mulching & Bed Care
  ['Mulch Installation (Bulk, per yard)', 'Delivered and hand-spread hardwood mulch', 'Mulching & Bed Care', 'service', 'unit', 65, null],
  ['Mulch Refresh (Top-Dress)', 'Thin top-up layer over existing mulch beds', 'Mulching & Bed Care', 'service', 'job', 145, 2],
  ['Dyed Mulch Upgrade', 'Colored mulch (black, red, or brown) install', 'Mulching & Bed Care', 'service', 'unit', 75, null],
  ['Rubber Mulch Installation', 'Playground-grade rubber mulch install', 'Mulching & Bed Care', 'service', 'unit', 145, null],
  ['Bed Edging Install (Steel)', 'Clean steel border between bed and lawn', 'Mulching & Bed Care', 'service', 'linear_ft', 8, null],
  ['Bed Edging Install (Plastic)', 'Budget poly edging install', 'Mulching & Bed Care', 'service', 'linear_ft', 4, null],
  ['Natural Stone Bed Border', 'Fieldstone border installation around beds', 'Mulching & Bed Care', 'service', 'linear_ft', 14, null],
  ['Weed Barrier Fabric Install', 'Landscape fabric laid under mulch or rock beds', 'Mulching & Bed Care', 'service', 'job', 95, 2],
  ['Decorative Rock Installation', 'River rock or lava rock ground cover', 'Mulching & Bed Care', 'service', 'unit', 85, null],
  ['Flower Bed Weeding & Cleanup', 'Hand-weeding and bed detailing', 'Mulching & Bed Care', 'service', 'hour', 55, 1],

  // Fertilization & Weed Control
  ['5-Step Fertilization Program (Annual)', 'Full-season granular feeding program', 'Fertilization & Weed Control', 'service', 'job', 495, null],
  ['Single Application Fertilization', 'One-time granular lawn feeding', 'Fertilization & Weed Control', 'service', 'visit', 65, 1],
  ['Organic Fertilization Program', 'Slow-release organic feed program, full season', 'Fertilization & Weed Control', 'service', 'job', 585, null],
  ['Pre-Emergent Weed Control', 'Spring crabgrass and weed prevention application', 'Fertilization & Weed Control', 'service', 'visit', 70, 1],
  ['Post-Emergent Broadleaf Control', 'Targeted spray for existing broadleaf weeds', 'Fertilization & Weed Control', 'service', 'visit', 65, 1],
  ['Grub Control Treatment', 'Preventive grub control application', 'Fertilization & Weed Control', 'service', 'visit', 85, 1],
  ['Lime Application (pH Balancing)', 'Soil pH correction application', 'Fertilization & Weed Control', 'service', 'visit', 60, 1],
  ['Soil Test & Analysis', 'Lab soil test with amendment recommendations', 'Fertilization & Weed Control', 'service', 'job', 75, 1],
  ['Compost Top-Dressing', 'Organic compost applied to lawn surface', 'Fertilization & Weed Control', 'service', 'job', 195, 2],
  ['Deep Root Tree Fertilization', 'Injected fertilization for tree root zones', 'Fertilization & Weed Control', 'service', 'unit', 95, null],
  ['Fungicide Treatment', 'Lawn disease treatment application', 'Fertilization & Weed Control', 'service', 'visit', 90, 1],
  ['Insect Control Application', 'Surface insecticide for lawn pests', 'Fertilization & Weed Control', 'service', 'visit', 80, 1],
  ['Tick & Flea Yard Treatment', 'Perimeter spray for tick and flea control', 'Fertilization & Weed Control', 'service', 'visit', 95, 1],
  ['Mosquito Control Program (Seasonal)', 'Monthly barrier spray, May through September', 'Fertilization & Weed Control', 'service', 'job', 450, null],

  // Aeration, Seeding & Lawn Renovation
  ['Core Aeration (Standard Lawn)', 'Mechanical core aeration with plug removal', 'Aeration, Seeding & Renovation', 'service', 'job', 95, 1],
  ['Core Aeration + Overseed Combo', 'Aeration paired with seed application', 'Aeration, Seeding & Renovation', 'service', 'job', 165, 2],
  ['Liquid Aeration', 'Soil-penetrating liquid aeration treatment', 'Aeration, Seeding & Renovation', 'service', 'job', 110, 1],
  ['Overseeding Service', 'Broadcast seeding over thinning turf', 'Aeration, Seeding & Renovation', 'service', 'job', 145, 1],
  ['Slice Seeding', 'Mechanical slit-seeding for bare or thin areas', 'Aeration, Seeding & Renovation', 'service', 'job', 225, 2],
  ['Hydroseeding (Small Area)', 'Sprayed seed and mulch slurry application', 'Aeration, Seeding & Renovation', 'service', 'sqft', 0.35, null],
  ['Dethatching Service', 'Power-rake thatch removal', 'Aeration, Seeding & Renovation', 'service', 'job', 165, 2],
  ['Lawn Renovation Package', 'Full kill-till-reseed lawn rebuild', 'Aeration, Seeding & Renovation', 'project', 'job', 1250, 8],
  ['Bare Spot Repair', 'Patch seeding for damaged lawn areas', 'Aeration, Seeding & Renovation', 'service', 'job', 85, 1],
  ['Grading & Leveling (Minor)', 'Light regrade of uneven lawn areas', 'Aeration, Seeding & Renovation', 'service', 'job', 350, 3],

  // Sod & Turf Installation
  ['Sod Installation (Kentucky Bluegrass)', 'Full sod install, cool-season blend', 'Sod & Turf Installation', 'project', 'sqft', 1.15, null],
  ['Sod Installation (Fescue Blend)', 'Shade-tolerant fescue sod install', 'Sod & Turf Installation', 'project', 'sqft', 1.10, null],
  ['Sod Installation (Bermuda)', 'Warm-season Bermuda sod install', 'Sod & Turf Installation', 'project', 'sqft', 1.05, null],
  ['Sod Installation (Zoysia)', 'Premium Zoysia sod install', 'Sod & Turf Installation', 'project', 'sqft', 1.45, null],
  ['Sod Removal & Haul-Away', 'Old turf removal ahead of renovation', 'Sod & Turf Installation', 'service', 'sqft', 0.65, null],
  ['Artificial Turf Installation (Residential)', 'Synthetic turf install with base prep', 'Sod & Turf Installation', 'project', 'sqft', 9.50, null],
  ['Artificial Turf Installation (Pet Area)', 'Drainage-optimized pet turf install', 'Sod & Turf Installation', 'project', 'sqft', 11.00, null],
  ['Putting Green Installation', 'Backyard synthetic putting green build', 'Sod & Turf Installation', 'project', 'sqft', 14.00, null],
  ['Batting Cage Turf Install', 'Sports-grade turf for batting cages', 'Sod & Turf Installation', 'project', 'sqft', 12.50, null],
  ['Playground Turf Installation', 'Impact-rated safety turf for play areas', 'Sod & Turf Installation', 'project', 'sqft', 13.00, null],

  // Irrigation
  ['Sprinkler System Inspection', 'Zone-by-zone function and coverage check', 'Irrigation', 'service', 'job', 85, 1],
  ['Irrigation Repair (Broken Head)', 'Diagnose and replace a damaged sprinkler head', 'Irrigation', 'service', 'job', 65, 1],
  ['Irrigation Repair (Line Break)', 'Locate and repair an underground line break', 'Irrigation', 'service', 'job', 165, 2],
  ['Irrigation Winterization (Blowout)', 'Compressed-air line blowout for winter', 'Irrigation', 'service', 'job', 75, 1],
  ['Irrigation Spring Startup', 'System activation, leak check, and adjustment', 'Irrigation', 'service', 'job', 85, 1],
  ['New Irrigation Zone Install', 'Add a zone to an existing sprinkler system', 'Irrigation', 'service', 'job', 450, 3],
  ['Full Irrigation System Install', 'New multi-zone system for new construction', 'Irrigation', 'project', 'sqft', 0.85, null],
  ['Drip Irrigation Install (Bed)', 'Low-flow drip line for planting beds', 'Irrigation', 'service', 'linear_ft', 3.50, null],
  ['Smart Controller Install & Setup', 'Wi-Fi irrigation controller with programming', 'Irrigation', 'service', 'job', 285, 2],
  ['Backflow Preventer Testing', 'Certified annual backflow test', 'Irrigation', 'service', 'job', 95, 1],
  ['Backflow Preventer Install', 'New backflow prevention device installation', 'Irrigation', 'service', 'job', 350, 2],
  ['Rain/Freeze Sensor Install', 'Weather-sensing shutoff device install', 'Irrigation', 'service', 'job', 95, 1],
  ['Well Pump Service Call', 'Diagnose and service an irrigation well pump', 'Irrigation', 'service', 'job', 175, 2],
  ['Irrigation Controller Reprogramming', 'Seasonal watering schedule adjustment', 'Irrigation', 'service', 'job', 55, 1],

  // Tree Service
  ['Tree Trimming (Small, Under 20ft)', 'Shaping and deadwood removal', 'Tree Service', 'service', 'job', 195, 2],
  ['Tree Trimming (Medium, 20-40ft)', 'Canopy shaping and clearance pruning', 'Tree Service', 'service', 'job', 395, 3],
  ['Tree Trimming (Large, 40ft+)', 'Full-canopy pruning with bucket truck', 'Tree Service', 'service', 'job', 695, 5],
  ['Tree Removal (Small)', 'Complete removal of a small tree, haul-away included', 'Tree Service', 'service', 'job', 450, 3],
  ['Tree Removal (Medium)', 'Complete removal, sectioned takedown', 'Tree Service', 'service', 'job', 950, 5],
  ['Tree Removal (Large)', 'Full removal of a large mature tree', 'Tree Service', 'service', 'job', 1850, 8],
  ['Emergency Storm Tree Removal', '24/7 urgent storm-damage response', 'Tree Service', 'service', 'day', 850, 8],
  ['Stump Grinding (Single)', 'Grind stump below grade, haul chips', 'Tree Service', 'service', 'job', 175, 1],
  ['Stump Grinding (Multiple)', 'Multi-stump grinding, per-stump rate', 'Tree Service', 'service', 'unit', 145, null],
  ['Tree Planting (Small/Ornamental)', 'Install and stake a new ornamental tree', 'Tree Service', 'service', 'job', 225, 2],
  ['Tree Planting (Large/Shade)', 'Install a large shade tree with root prep', 'Tree Service', 'service', 'job', 495, 3],
  ['Tree Cabling & Bracing', 'Structural support install for weak limbs', 'Tree Service', 'service', 'job', 450, 3],
  ['Crown Raising', 'Remove lower limbs for clearance', 'Tree Service', 'service', 'job', 275, 2],
  ['Crown Reduction', 'Reduce overall canopy size and height', 'Tree Service', 'service', 'job', 450, 3],
  ['Deep Root Aeration (Tree)', 'Air-spade root zone decompaction', 'Tree Service', 'service', 'job', 175, 1],
  ['Tree Health Assessment', 'Certified arborist site consultation', 'Tree Service', 'service', 'job', 125, 1],
  ['Storm Damage Cleanup (Trees)', 'Debris removal after a wind or storm event', 'Tree Service', 'service', 'day', 350, 8],
  ['Invasive Tree/Vine Removal', 'Removal of invasive species (bamboo, kudzu, etc.)', 'Tree Service', 'service', 'job', 495, 4],

  // Hardscaping Installs
  ['Paver Patio Installation', 'Full-base paver patio build', 'Hardscaping', 'project', 'sqft', 18.00, null],
  ['Paver Walkway Installation', 'Paver path with compacted base', 'Hardscaping', 'project', 'sqft', 16.00, null],
  ['Paver Driveway Installation', 'Structural paver driveway build', 'Hardscaping', 'project', 'sqft', 22.00, null],
  ['Stamped Concrete Patio', 'Decorative stamped and colored concrete patio', 'Hardscaping', 'project', 'sqft', 14.00, null],
  ['Flagstone Patio Installation', 'Natural flagstone patio, mortared or dry-laid', 'Hardscaping', 'project', 'sqft', 24.00, null],
  ['Concrete Walkway Pour', 'New poured concrete walkway', 'Hardscaping', 'service', 'sqft', 9.00, null],
  ['Concrete Driveway Pour', 'New poured concrete driveway', 'Hardscaping', 'service', 'sqft', 11.00, null],
  ['Retaining Wall (Block)', 'Engineered block retaining wall', 'Hardscaping', 'project', 'sqft', 28.00, null],
  ['Retaining Wall (Natural Stone)', 'Dry-stacked or mortared stone wall', 'Hardscaping', 'project', 'sqft', 38.00, null],
  ['Retaining Wall (Timber)', 'Pressure-treated timber retaining wall', 'Hardscaping', 'project', 'sqft', 20.00, null],
  ['Boulder Placement & Accents', 'Large decorative boulder placement', 'Hardscaping', 'service', 'unit', 195, null],
  ['Dry Creek Bed Installation', 'Decorative rock drainage feature', 'Hardscaping', 'service', 'linear_ft', 22.00, null],
  ['Steps & Staircase Install (Stone/Paver)', 'Outdoor stone or paver step construction', 'Hardscaping', 'service', 'unit', 450, null],
  ['Gravel Path Installation', 'Decorative gravel walking path', 'Hardscaping', 'service', 'sqft', 6.50, null],
  ['Paver Repair & Releveling', 'Reset sunken or shifted pavers', 'Hardscaping', 'service', 'sqft', 8.00, null],
  ['Concrete Crack Repair', 'Seal and patch cracked concrete', 'Hardscaping', 'service', 'linear_ft', 12.00, null],
  ['Driveway Sealing', 'Asphalt or concrete sealcoat application', 'Hardscaping', 'service', 'sqft', 0.65, null],
  ['Paver Sealing', 'Protective sealant applied to paver surfaces', 'Hardscaping', 'service', 'sqft', 1.10, null],

  // Outdoor Living / Structures
  ['Fire Pit Installation (Wood-Burning)', 'Stone or paver fire pit build', 'Outdoor Living & Structures', 'project', 'job', 1450, 8],
  ['Fire Pit Installation (Gas)', 'Gas line fire pit with igniter', 'Outdoor Living & Structures', 'project', 'job', 2450, 8],
  ['Outdoor Kitchen Build', 'Full outdoor kitchen with grill island', 'Outdoor Living & Structures', 'project', 'job', 8500, 8],
  ['Pergola Construction', 'Custom wood or vinyl pergola build', 'Outdoor Living & Structures', 'project', 'job', 3200, 8],
  ['Gazebo Installation', 'Prefab or custom gazebo assembly and install', 'Outdoor Living & Structures', 'project', 'job', 4200, 8],
  ['Arbor Installation', 'Garden arbor build and install', 'Outdoor Living & Structures', 'service', 'job', 950, 4],
  ['Wood Deck Construction', 'New pressure-treated deck build', 'Outdoor Living & Structures', 'project', 'sqft', 32.00, null],
  ['Composite Deck Construction', 'Low-maintenance composite deck build', 'Outdoor Living & Structures', 'project', 'sqft', 42.00, null],
  ['Deck Staining & Sealing', 'Clean, stain, and seal an existing deck', 'Outdoor Living & Structures', 'service', 'sqft', 2.50, null],
  ['Deck Repair', 'Board replacement and structural repair', 'Outdoor Living & Structures', 'service', 'job', 450, 3],
  ['Pergola Staining', 'Refinish weathered pergola wood', 'Outdoor Living & Structures', 'service', 'job', 395, 3],
  ['Privacy Fence Installation (Wood)', 'New wood privacy fence build', 'Outdoor Living & Structures', 'service', 'linear_ft', 32.00, null],
  ['Privacy Fence Installation (Vinyl)', 'Low-maintenance vinyl fence build', 'Outdoor Living & Structures', 'service', 'linear_ft', 38.00, null],
  ['Chain Link Fence Installation', 'Utility chain link fence build', 'Outdoor Living & Structures', 'service', 'linear_ft', 18.00, null],
  ['Fence Repair', 'Post reset and board/panel replacement', 'Outdoor Living & Structures', 'service', 'job', 275, 2],
  ['Fence Staining', 'Stain and seal an existing wood fence', 'Outdoor Living & Structures', 'service', 'linear_ft', 3.50, null],
  ['Pergola/Arbor Lighting Integration', 'Wired accent lighting on a structure', 'Outdoor Living & Structures', 'service', 'job', 385, 3],
  ['Dog Run / Kennel Installation', 'Fenced dog run with turf or gravel base', 'Outdoor Living & Structures', 'service', 'job', 1250, 6],
  ['Raised Garden Bed Construction', 'Cedar-framed raised vegetable bed build', 'Outdoor Living & Structures', 'service', 'unit', 195, null],
  ['Greenhouse Assembly & Install', 'Prefab greenhouse setup on a pad', 'Outdoor Living & Structures', 'service', 'job', 2200, 6],

  // Water Features
  ['Backyard Pond Installation', 'Small ecosystem pond with pump and filter', 'Water Features', 'project', 'job', 3200, 8],
  ['Koi Pond Installation', 'Larger pond built for koi and fish habitat', 'Water Features', 'project', 'job', 5800, 8],
  ['Waterfall Feature Installation', 'Rock waterfall feature build', 'Water Features', 'project', 'job', 2400, 8],
  ['Fountain Installation', 'Freestanding garden fountain install', 'Water Features', 'service', 'job', 950, 4],
  ['Pond Cleaning & Maintenance', 'Seasonal pond debris and algae service', 'Water Features', 'service', 'job', 225, 2],
  ['Pond Winterization', 'Pump removal, netting, and cold-season prep', 'Water Features', 'service', 'job', 165, 1],

  // Drainage & Grading
  ['French Drain Installation', 'Subsurface perforated-pipe drain system', 'Drainage & Grading', 'service', 'linear_ft', 22.00, null],
  ['Dry Well Installation', 'Underground drainage catch and dispersal well', 'Drainage & Grading', 'service', 'job', 1450, 6],
  ['Downspout Extension Installation', 'Buried downspout line routed to daylight', 'Drainage & Grading', 'service', 'job', 175, 1],
  ['Catch Basin Installation', 'Yard drain grate with underground outlet', 'Drainage & Grading', 'service', 'job', 395, 3],
  ['Yard Grading & Regrading', 'Reshape yard for proper water flow', 'Drainage & Grading', 'service', 'sqft', 1.25, null],
  ['Erosion Control Matting', 'Slope stabilization fabric or mat install', 'Drainage & Grading', 'service', 'sqft', 2.75, null],
  ['Riprap Slope Stabilization', 'Rock erosion barrier on slopes and banks', 'Drainage & Grading', 'service', 'sqft', 9.50, null],
  ['Silt Fence Installation', 'Temporary erosion control barrier', 'Drainage & Grading', 'service', 'linear_ft', 3.00, null],
  ['Sump Pump Discharge Line', 'Exterior drainage line for a sump pump', 'Drainage & Grading', 'service', 'job', 385, 2],

  // Seasonal Cleanup
  ['Spring Cleanup Package', 'Full-property spring debris and bed cleanup', 'Seasonal Cleanup', 'service', 'job', 275, 3],
  ['Fall Cleanup Package', 'Leaf removal, bed cutback, and winterizing', 'Seasonal Cleanup', 'service', 'job', 295, 3],
  ['Leaf Removal (Curbside Blow)', 'Blow leaves to curb for municipal pickup', 'Seasonal Cleanup', 'service', 'visit', 85, 1],
  ['Leaf Removal (Bagged Haul-Away)', 'Bag and remove all lawn debris', 'Seasonal Cleanup', 'service', 'visit', 145, 2],
  ['Storm Debris Cleanup', 'Post-storm branch and debris removal', 'Seasonal Cleanup', 'service', 'job', 250, 3],
  ['Gutter Cleaning', 'Clear leaves and flush downspouts', 'Seasonal Cleanup', 'service', 'job', 95, 1],
  ['Gutter Guard Installation', 'Leaf-guard system install', 'Seasonal Cleanup', 'service', 'linear_ft', 7.50, null],
  ['Pressure Washing (Patio/Walkway)', 'Surface clean of hardscape areas', 'Seasonal Cleanup', 'service', 'sqft', 0.45, null],
  ['Pressure Washing (House Exterior)', 'Soft-wash siding and trim clean', 'Seasonal Cleanup', 'service', 'job', 285, 3],
  ['Window Well Cleanout', 'Clear debris from basement window wells', 'Seasonal Cleanup', 'service', 'unit', 45, null],
  ['End-of-Season Bed Cutback', 'Cut back perennials ahead of winter', 'Seasonal Cleanup', 'service', 'job', 195, 2],

  // Snow & Ice Management
  ['Residential Driveway Plowing (Per Push)', 'Single-storm driveway plow', 'Snow & Ice Management', 'service', 'visit', 75, 1],
  ['Seasonal Snow Contract (Per Push)', 'Recurring-storm driveway service', 'Snow & Ice Management', 'service', 'visit', 65, 1],
  ['Commercial Lot Plowing', 'Per-storm plow for commercial parking lots', 'Snow & Ice Management', 'service', 'visit', 195, 2],
  ['HOA Snow Removal Contract', 'Common-area and road snow service', 'Snow & Ice Management', 'service', 'visit', 275, 3],
  ['Sidewalk & Walkway Shoveling', 'Hand-clear walks and entryways', 'Snow & Ice Management', 'service', 'visit', 45, 1],
  ['Ice Melt / De-Icing Application', 'Salt or calcium chloride application', 'Snow & Ice Management', 'service', 'visit', 55, 1],
  ['Snow Hauling & Relocation', 'Remove excess snow piles from site', 'Snow & Ice Management', 'service', 'job', 350, 3],
  ['Roof Snow Raking', 'Reduce snow load on the roofline', 'Snow & Ice Management', 'service', 'job', 175, 2],
  ['Ice Dam Removal', 'Steam removal of roof ice dams', 'Snow & Ice Management', 'service', 'job', 395, 3],
  ['Emergency Storm Response (Snow)', 'Priority dispatch during a major storm', 'Snow & Ice Management', 'service', 'job', 250, 2],

  // Holiday & Landscape Lighting
  ['Landscape Lighting Design & Install', 'Low-voltage path and accent lighting', 'Holiday & Landscape Lighting', 'project', 'job', 1450, 6],
  ['Uplighting Installation (Per Fixture)', 'Tree or architectural uplighting', 'Holiday & Landscape Lighting', 'service', 'unit', 145, null],
  ['Pathway Lighting Installation', 'Low-voltage path light run', 'Holiday & Landscape Lighting', 'service', 'linear_ft', 18.00, null],
  ['Landscape Lighting Maintenance', 'Bulb replacement and system check', 'Holiday & Landscape Lighting', 'service', 'job', 125, 1],
  ['Holiday Light Installation (Roofline)', 'Professional roofline holiday lighting', 'Holiday & Landscape Lighting', 'service', 'linear_ft', 4.50, null],
  ['Holiday Light Installation (Trees/Shrubs)', 'Wrapped holiday lighting on plantings', 'Holiday & Landscape Lighting', 'service', 'unit', 65, null],
  ['Holiday Light Takedown & Storage', 'Post-season removal and boxed storage', 'Holiday & Landscape Lighting', 'service', 'job', 225, 2],
  ['Holiday Light Repair', 'Diagnose and fix strand or timer issues', 'Holiday & Landscape Lighting', 'service', 'job', 85, 1],
  ['Wreath & Garland Installation', 'Seasonal wreath and garland hanging', 'Holiday & Landscape Lighting', 'service', 'job', 145, 1],
  ['String Light Installation (Patio)', 'Bistro/cafe string lighting for patios', 'Holiday & Landscape Lighting', 'service', 'linear_ft', 6.00, null],

  // Pest, Disease & Wildlife Control
  ['Grub Control (Preventive)', 'Season-long grub prevention treatment', 'Pest, Disease & Wildlife Control', 'service', 'visit', 85, 1],
  ['Grub Control (Curative)', 'Active-infestation grub treatment', 'Pest, Disease & Wildlife Control', 'service', 'visit', 105, 1],
  ['Mole & Vole Control', 'Trapping and repellent program', 'Pest, Disease & Wildlife Control', 'service', 'job', 165, 2],
  ['Deer Repellent Application', 'Recurring deer-deterrent spray program', 'Pest, Disease & Wildlife Control', 'service', 'visit', 65, 1],
  ['Rabbit Fencing Installation', 'Low fencing barrier around beds', 'Pest, Disease & Wildlife Control', 'service', 'linear_ft', 6.00, null],
  ['Japanese Beetle Treatment', 'Targeted treatment for beetle damage', 'Pest, Disease & Wildlife Control', 'service', 'visit', 95, 1],
  ['Fungal Disease Treatment (Lawn)', 'Brown patch and dollar spot treatment', 'Pest, Disease & Wildlife Control', 'service', 'visit', 90, 1],
  ['Tree & Shrub Insecticide Spray', 'Preventive pest spray for woody plants', 'Pest, Disease & Wildlife Control', 'service', 'job', 145, 1],
  ['Wasp/Hornet Nest Removal (Landscape)', 'Safe removal of yard nests', 'Pest, Disease & Wildlife Control', 'service', 'job', 125, 1],

  // Xeriscaping / Native & Pollinator Gardens
  ['Xeriscape Design & Conversion', 'Drought-tolerant landscape redesign', 'Xeriscaping & Native Gardens', 'project', 'sqft', 8.50, null],
  ['Native Plant Garden Installation', 'Region-native perennial garden install', 'Xeriscaping & Native Gardens', 'service', 'job', 1250, 6],
  ['Pollinator Garden Installation', 'Bee and butterfly-friendly planting design', 'Xeriscaping & Native Gardens', 'service', 'job', 950, 4],
  ['Rain Garden Installation', 'Stormwater-absorbing native planting bed', 'Xeriscaping & Native Gardens', 'service', 'job', 1450, 6],
  ['Drought-Tolerant Groundcover Install', 'Low-water groundcover planting', 'Xeriscaping & Native Gardens', 'service', 'sqft', 3.25, null],
  ['Xeric Mulch & Rock Ground Cover', 'Decorative rock replacing turf areas', 'Xeriscaping & Native Gardens', 'service', 'sqft', 4.50, null],

  // Planting & Garden Design
  ['Seasonal Annual Color Rotation (Spring)', 'Fresh spring annual planting', 'Planting & Garden Design', 'service', 'job', 285, 2],
  ['Seasonal Annual Color Rotation (Fall)', 'Fall mum and annual planting refresh', 'Planting & Garden Design', 'service', 'job', 275, 2],
  ['Bulb Planting Service', 'Fall-planted spring bulb installation', 'Planting & Garden Design', 'service', 'job', 195, 2],
  ['Perennial Bed Design & Install', 'Custom perennial garden design and build', 'Planting & Garden Design', 'project', 'job', 1650, 8],
  ['Foundation Planting Design', 'Shrub and plant design around the home base', 'Planting & Garden Design', 'service', 'job', 950, 4],
  ['Privacy Screen Planting', 'Evergreen row for visual and sound buffer', 'Planting & Garden Design', 'service', 'job', 1850, 6],
  ['Windbreak Planting', 'Tree and shrub row for wind protection', 'Planting & Garden Design', 'service', 'job', 1450, 6],
  ['Container Garden Design & Install', 'Custom potted planting arrangements', 'Planting & Garden Design', 'service', 'unit', 95, null],
  ['Vegetable Garden Bed Installation', 'Full vegetable garden bed build-out', 'Planting & Garden Design', 'service', 'job', 650, 4],
  ['Orchard Row Maintenance', 'Fruit-tree row pruning and care', 'Planting & Garden Design', 'service', 'job', 495, 3],

  // Commercial / HOA / Grounds Maintenance
  ['Commercial Grounds Maintenance Contract', 'Weekly full-property care package', 'Commercial & HOA Grounds', 'service', 'visit', 350, 3],
  ['HOA Common Area Maintenance Contract', 'Recurring shared-space landscaping', 'Commercial & HOA Grounds', 'service', 'visit', 425, 4],
  ['Parking Lot Island Maintenance', 'Mow, trim, and weed small landscaped islands', 'Commercial & HOA Grounds', 'service', 'visit', 95, 1],
  ['Retail Property Curb Appeal Service', 'Weekly storefront grounds detailing', 'Commercial & HOA Grounds', 'service', 'visit', 145, 2],
  ['Municipal Median Maintenance', 'Roadway median mow and cleanup', 'Commercial & HOA Grounds', 'service', 'visit', 250, 2],
  ['Corporate Campus Landscaping', 'Multi-acre office park maintenance', 'Commercial & HOA Grounds', 'service', 'visit', 595, 5],
  ['Property Management Turnover Cleanup', 'Rental turnover landscape reset', 'Commercial & HOA Grounds', 'service', 'job', 225, 2],

  // Products & Materials
  ['Bulk Topsoil Delivery (Per Yard)', 'Screened topsoil delivered and dumped', 'Products & Materials', 'product', 'unit', 55, null],
  ['Bulk Mulch Delivery (Per Yard, Undelivered Spread)', 'Delivery only, mulch not spread', 'Products & Materials', 'product', 'unit', 45, null],
  ['Playground Mulch Delivery', 'Certified safety-rated playground mulch', 'Products & Materials', 'product', 'unit', 68, null],
  ['Grass Seed (Premium Blend, 25lb Bag)', 'Regionally-suited seed blend', 'Products & Materials', 'product', 'unit', 85, null],
]

async function main() {
  if (ROWS.length !== 220) {
    console.error(`Expected 220 rows, got ${ROWS.length}`)
    process.exit(1)
  }

  const { data: existing, error: existingErr } = await supabase
    .from('service_types')
    .select('name, sort_order')
    .eq('tenant_id', TENANT_ID)
    .order('sort_order', { ascending: false })
  if (existingErr) { console.error(existingErr); process.exit(1) }
  const existingNames = new Set((existing || []).map((r) => r.name))
  const alreadySeeded = ROWS.some(([name]) => existingNames.has(name))
  if (alreadySeeded) {
    console.error('One or more catalog names already exist for this tenant — refusing to insert duplicates. Re-run only after clearing prior seed rows.')
    process.exit(1)
  }
  let nextSort = (existing?.[0]?.sort_order ?? 0) + 1

  const payload = ROWS.map(([name, description, category, item_type, per_unit, priceDollars, durationHours]) => ({
    tenant_id: TENANT_ID,
    name,
    description,
    category,
    item_type,
    per_unit,
    unit_label: null,
    price_cents: Math.round(priceDollars * 100),
    min_charge_cents: null,
    cost_cents: null,
    taxable: true,
    default_duration_hours: durationHours,
    active: true,
    sort_order: nextSort++,
  }))

  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < payload.length; i += BATCH) {
    const chunk = payload.slice(i, i + BATCH)
    const { data, error } = await supabase.from('service_types').insert(chunk).select('id')
    if (error) { console.error('Insert failed at batch', i, error); process.exit(1) }
    inserted += data?.length ?? 0
    console.log(`Inserted ${inserted}/${payload.length}`)
  }

  const { count, error: countErr } = await supabase
    .from('service_types')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
  if (countErr) { console.error(countErr); process.exit(1) }
  console.log(`Done. Tenant now has ${count} total catalog items.`)
}

main()
