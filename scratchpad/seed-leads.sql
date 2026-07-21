WITH new_clients AS (
  INSERT INTO clients (tenant_id, name, email, phone, address, city, state, zip, source, status, active, created_at, updated_at)
  VALUES
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Marissa Coletti','marissa.coletti.lead@example.com','(718) 555-0101','482 Marine Ave','Brooklyn','NY','11209','website','active',true, now() - interval '1 day', now() - interval '1 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Dominic Farrell','dominic.farrell.lead@example.com','(347) 555-0102','2210 Cropsey Ave','Brooklyn','NY','11214','google','active',true, now() - interval '2 day', now() - interval '2 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Priya Nandakumar','priya.nandakumar.lead@example.com','(917) 555-0103','88-40 Vanderveer St','Queens','NY','11421','referral','active',true, now() - interval '3 day', now() - interval '3 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Kevin O''Rourke','kevin.orourke.lead@example.com','(718) 555-0104','15 Ridgeview Ave','Staten Island','NY','10304','yelp','active',true, now() - interval '1 day', now() - interval '1 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Angela Tran','angela.tran.lead@example.com','(929) 555-0105','2145 Bronxdale Ave','Bronx','NY','10462','website','active',true, now() - interval '5 day', now() - interval '5 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Marcus Blackwell','marcus.blackwell.lead@example.com','(718) 555-0106','67 Beach 129th St','Queens','NY','11694','phone','active',true, now() - interval '4 hour', now() - interval '4 hour'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Sofia Delgado','sofia.delgado.lead@example.com','(347) 555-0107','309 Hicks St','Brooklyn','NY','11201','google','active',true, now() - interval '6 day', now() - interval '6 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Wesley Grant','wesley.grant.lead@example.com','(718) 555-0108','40-15 195th St','Queens','NY','11358','referral','active',true, now() - interval '2 day', now() - interval '2 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Nicole Abernathy','nicole.abernathy.lead@example.com','(917) 555-0109','1355 Sheepshead Bay Rd','Brooklyn','NY','11235','website','active',true, now() - interval '8 hour', now() - interval '8 hour'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Anthony Massaro','anthony.massaro.lead@example.com','(718) 555-0110','204 Forest Ave','Staten Island','NY','10301','yelp','active',true, now() - interval '7 day', now() - interval '7 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Latoya Freeman','latoya.freeman.lead@example.com','(929) 555-0111','3050 Grand Concourse','Bronx','NY','10458','google','active',true, now() - interval '3 day', now() - interval '3 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Brian Kowalczyk','brian.kowalczyk.lead@example.com','(718) 555-0112','62-14 78th St','Queens','NY','11379','referral','active',true, now() - interval '1 day', now() - interval '1 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Emily Sassone','emily.sassone.lead@example.com','(347) 555-0113','1810 E 22nd St','Brooklyn','NY','11229','website','active',true, now() - interval '9 day', now() - interval '9 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Raymond Achebe','raymond.achebe.lead@example.com','(718) 555-0114','89 Todt Hill Rd','Staten Island','NY','10314','phone','active',true, now() - interval '5 hour', now() - interval '5 hour'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Grace Lindqvist','grace.lindqvist.lead@example.com','(917) 555-0115','215-08 111th Ave','Queens','NY','11429','google','active',true, now() - interval '4 day', now() - interval '4 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Victor Espinal','victor.espinal.lead@example.com','(718) 555-0116','745 Pelham Pkwy','Bronx','NY','10467','yelp','active',true, now() - interval '2 day', now() - interval '2 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Hannah Ostrowski','hannah.ostrowski.lead@example.com','(347) 555-0117','1122 Ocean Pkwy','Brooklyn','NY','11230','referral','active',true, now() - interval '10 day', now() - interval '10 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Jamal Whitfield','jamal.whitfield.lead@example.com','(718) 555-0118','25 Innis St','Staten Island','NY','10306','website','active',true, now() - interval '6 hour', now() - interval '6 hour'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Christine Boudreau','christine.boudreau.lead@example.com','(929) 555-0119','108-22 Queens Blvd','Queens','NY','11375','google','active',true, now() - interval '3 day', now() - interval '3 day'),
    ('cf50c81f-f726-48e0-82a8-673f1112fbe8','Derek Palladino','derek.palladino.lead@example.com','(718) 555-0120','2 Manor Rd','Staten Island','NY','10314','phone','active',true, now() - interval '1 day', now() - interval '1 day')
  RETURNING id, email
)
INSERT INTO deals (tenant_id, client_id, title, stage, status, mode, value_cents, source, notes, created_at, updated_at, stage_changed_at, last_activity_at)
SELECT 'cf50c81f-f726-48e0-82a8-673f1112fbe8', nc.id, d.title, 'new', 'active', 'sales', d.value_cents, d.source, d.notes, nc_created, nc_created, nc_created, nc_created
FROM new_clients nc
JOIN (VALUES
  ('marissa.coletti.lead@example.com','Weekly Mowing - Small Corner Lot',22000,'website','Wants a standard weekly mow/edge/trim season contract, small 3,500 sqft corner lot, no gate access issue.'),
  ('dominic.farrell.lead@example.com','Full Property Fall Cleanup',65000,'google','Large maple + oak canopy, hasn''t been raked in 3 weeks, wants one-time full cleanup + haul-away before Thanksgiving.'),
  ('priya.nandakumar.lead@example.com','New Sod Install After Pool Removal',480000,'referral','Above-ground pool just removed, 900 sqft bare dirt patch, wants full sod + soil prep, referred by neighbor.'),
  ('kevin.orourke.lead@example.com','French Drain - Water Pooling at Foundation',350000,'yelp','Standing water along back foundation wall after every rain, worried about basement seepage, wants an assessment + drain quote.'),
  ('angela.tran.lead@example.com','Retaining Wall - Sloped Backyard Erosion',720000,'website','30ft slope losing soil every storm, wants a timber or block retaining wall, has photos ready to send.'),
  ('marcus.blackwell.lead@example.com','Paver Patio + Fire Pit',950000,'phone','Wants to convert unused side yard into an entertaining space, 400 sqft paver patio + built-in fire pit, flexible on timeline.'),
  ('sofia.delgado.lead@example.com','Dead Oak Removal Near Garage',180000,'google','60ft dead oak leaning toward detached garage, wants urgent quote, arborist already confirmed it''s dead.'),
  ('wesley.grant.lead@example.com','Stump Grinding - 4 Stumps',95000,'referral','Prior tree company left 4 stumps in the front yard from last year''s storm damage cleanup, wants them ground flush.'),
  ('nicole.abernathy.lead@example.com','Irrigation System Install - New Zones',540000,'website','Building a new flower bed + expanding lawn, wants 4 new sprinkler zones added to the existing system.'),
  ('anthony.massaro.lead@example.com','Aeration & Overseed - Patchy HOA Lawn',28000,'yelp','HOA sent a notice about the thin/patchy front lawn, wants core aeration + overseed before spring inspection.'),
  ('latoya.freeman.lead@example.com','Holiday Lighting - Storefront Install',60000,'google','Small retail storefront on Grand Concourse, wants warm white string lights + wreath install by Dec 1, recurring interest for next year too.'),
  ('brian.kowalczyk.lead@example.com','Snow Removal Contract - Commercial Lot',1200000,'referral','40-space commercial parking lot, wants a seasonal per-push contract, prior vendor was unreliable last winter.'),
  ('emily.sassone.lead@example.com','Mulch & Bed Refresh Before Listing House',42000,'website','Selling the house in 3 weeks, wants beds edged + fresh mulch + minor trimming for curb appeal photos.'),
  ('raymond.achebe.lead@example.com','Xeriscaping Consult - Drought-Tolerant Redesign',0,'phone','Wants to replace most of the front lawn with drought-tolerant native plantings to cut water bills, asking for a design consult first, no budget set yet.'),
  ('grace.lindqvist.lead@example.com','Cedar Privacy Fence Install',680000,'google','120 linear ft backyard perimeter, wants 6ft cedar privacy fence, has a dog so timeline matters (currently using temp fencing).'),
  ('victor.espinal.lead@example.com','Small Elevated Deck Off Kitchen',890000,'yelp','Wants a 12x14 elevated deck off the kitchen slider, needs to match existing exterior trim color, has HOA approval already.'),
  ('hannah.ostrowski.lead@example.com','Koi Pond Water Feature Install',1100000,'referral','Wants a backyard koi pond with a small waterfall feature, referred by a client Tucker''s did a patio for last year.'),
  ('jamal.whitfield.lead@example.com','HOA Multi-Building Landscaping Contract',3600000,'website','8-building HOA complex looking to switch landscaping vendors, wants a full-season maintenance + seasonal color bid.'),
  ('christine.boudreau.lead@example.com','Storm Cleanup - Fallen Branches, Urgent',38000,'google','Large branches down across the driveway and part of the lawn after last night''s storm, needs same-week cleanup.'),
  ('derek.palladino.lead@example.com','Full-Season Lawn Care Plan - New Homeowner',260000,'phone','Just bought the house, has never maintained a lawn before, wants a full mow+fert+weed-control season bundle explained simply.')
) AS d(email, title, value_cents, source, notes) ON nc.email = d.email
CROSS JOIN LATERAL (SELECT now() as nc_created) t
RETURNING id, title;
