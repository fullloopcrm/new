import { IMG, unsplash } from "./images";

/** Map each blog post slug to a contextually appropriate Unsplash photo. */
const BLOG_IMAGE_IDS: Record<string, string> = {
  "what-to-do-when-your-car-breaks-down-in-nyc": IMG.roadsideScene,
  "flatbed-vs-wheel-lift-which-does-your-car-need": IMG.towTruckFlatbed,
  "nyc-tow-pound-recovery-guide": IMG.nycEmptyStreet,
  "dead-battery-in-winter-nyc": IMG.jumpStart,
  "flat-tire-on-the-bqe": IMG.flatTire,
  "ev-towing-nyc-what-owners-need-to-know": IMG.evCharging,
  "what-happens-after-a-collision-nyc": IMG.winchRecovery,
  "private-property-towing-nyc-rules": IMG.nycSubwayStreet,
  "junk-car-removal-nyc-cash-or-scrap": IMG.brokenCar,
  "motorcycle-towing-nyc-do-it-right": IMG.motorcycleRoad,
  "fleet-tow-account-worth-it": IMG.warehouseFleet,
  "nyc-tow-pricing-red-flags": IMG.handshakeBusiness,
  "locked-out-of-your-car-nyc": IMG.carKeys,
  "roadside-vs-national-network": IMG.highwayNight,
  "commercial-truck-breakdown-cross-bronx": IMG.truckRoad,
};

const DEFAULT_BLOG_IMAGE = IMG.towTruckNight;

export function getBlogImage(slug: string, width = 1600): string {
  const id = BLOG_IMAGE_IDS[slug] ?? DEFAULT_BLOG_IMAGE;
  return unsplash(id, width);
}
