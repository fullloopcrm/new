// @ts-nocheck
// Topic-matched Pexels photos for roadside assistance scenes.
// Each URL was fetched from the Pexels search API and manually picked for
// topical accuracy. Pexels permits hot-linking; photographers credited inline.

export interface SitePhoto {
  url: string;
  alt: string;
  credit: string;
}

export const HERO_PHOTO: SitePhoto = {
  url: "https://images.pexels.com/photos/6720546/pexels-photo-6720546.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
  alt: "Smiling roadside technician in uniform working on a service truck",
  credit: "Photo: Gustavo Fring / Pexels",
};

export const SERVICE_PHOTOS: Record<string, SitePhoto> = {
  "jump-start-service": {
    url: "https://images.pexels.com/photos/6473244/pexels-photo-6473244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Car battery being jump-started with cables in an engine bay",
    credit: "Photo: Julia Avamotive / Pexels",
  },
  "flat-tire-change": {
    url: "https://images.pexels.com/photos/34261459/pexels-photo-34261459.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Technician repairing a flat tire on a blue truck at the roadside",
    credit: "Photo: Eddie O. / Pexels",
  },
  "car-lockout-service": {
    url: "https://images.pexels.com/photos/17124737/pexels-photo-17124737.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Locksmith tool inserted into a car door lock for no-damage entry",
    credit: "Photo: My Car Key Hero / Pexels",
  },
  "fuel-delivery-service": {
    url: "https://images.pexels.com/photos/27665488/pexels-photo-27665488.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Person filling a car's fuel tank from a portable fuel container",
    credit: "Photo: Pexels",
  },
  "tow-truck-service": {
    url: "https://images.pexels.com/photos/17429097/pexels-photo-17429097.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Tow truck operator loading a pickup truck onto a flatbed",
    credit: "Photo: Jonathan Reynaga / Pexels",
  },
  "winch-out-recovery": {
    url: "https://images.pexels.com/photos/28996084/pexels-photo-28996084.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Cars stuck in deep snow during a winter blizzard",
    credit: "Photo: Charles Criscuolo / Pexels",
  },
  "battery-replacement-on-site": {
    url: "https://images.pexels.com/photos/37177070/pexels-photo-37177070.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Orange car battery installed inside a vehicle engine bay",
    credit: "Photo: Ayyeee Ayyeee / Pexels",
  },
  "motorcycle-roadside": {
    url: "https://images.pexels.com/photos/20806421/pexels-photo-20806421.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Classic motorcycle parked on a rural road",
    credit: "Photo: Diego Flores / Pexels",
  },
  "rv-roadside-service": {
    url: "https://images.pexels.com/photos/24698/pexels-photo-24698.jpg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Campervan driving on a winding road through autumn forest",
    credit: "Photo: Tim Gouw / Pexels",
  },
  "diesel-truck-roadside": {
    url: "https://images.pexels.com/photos/27099095/pexels-photo-27099095.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Red semi-trailer truck driving on an open highway",
    credit: "Photo: Pexels",
  },
  "key-fob-battery": {
    url: "https://images.pexels.com/photos/842528/pexels-photo-842528.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Car keys and key fob with keychain on a white surface",
    credit: "Photo: Brett Jordan / Pexels",
  },
  "ev-charging-delivery": {
    url: "https://images.pexels.com/photos/36405842/pexels-photo-36405842.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Close-up of a person plugging in an electric car at a charging station",
    credit: "Photo: Holiday Extras / Pexels",
  },
  "mobile-tire-replacement": {
    url: "https://images.pexels.com/photos/9996404/pexels-photo-9996404.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Close-up of a mounted tire on a vehicle",
    credit: "Photo: Volker Thimm / Pexels",
  },
  "trunk-lockout-service": {
    url: "https://images.pexels.com/photos/18393010/pexels-photo-18393010.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Rear view of a modern black car with open trunk",
    credit: "Photo: Mike Bird / Pexels",
  },
  "broken-key-extraction": {
    url: "https://images.pexels.com/photos/115642/pexels-photo-115642.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Close-up of a metallic key with lock cylinder",
    credit: "Photo: George Becker / Pexels",
  },
  "accident-tow-service": {
    url: "https://images.pexels.com/photos/17429097/pexels-photo-17429097.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Tow truck operator loading a pickup truck onto a flatbed",
    credit: "Photo: Jonathan Reynaga / Pexels",
  },
};

export const CUSTOMER_PHOTOS: Record<string, SitePhoto> = {
  commuters: {
    url: "https://images.pexels.com/photos/30549219/pexels-photo-30549219.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Highway in early morning mist with light commuter traffic",
    credit: "Photo: Pexels",
  },
  "rideshare-drivers": {
    url: "https://images.pexels.com/photos/23319099/pexels-photo-23319099.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Rideshare driver inside a car at night using a smartphone for navigation",
    credit: "Photo: Pexels",
  },
  parents: {
    url: "https://images.pexels.com/photos/6182086/pexels-photo-6182086.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Parent smiling at a baby in a car seat",
    credit: "Photo: Pexels",
  },
  "fleet-managers": {
    url: "https://images.pexels.com/photos/4620555/pexels-photo-4620555.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Two white delivery vans parked in a depot lot",
    credit: "Photo: Pexels",
  },
  "long-haul-drivers": {
    url: "https://images.pexels.com/photos/27099095/pexels-photo-27099095.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Red semi-trailer truck on an open highway",
    credit: "Photo: Pexels",
  },
  "rv-travelers": {
    url: "https://images.pexels.com/photos/24698/pexels-photo-24698.jpg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "RV driving through autumn forest scenery",
    credit: "Photo: Tim Gouw / Pexels",
  },
  "motorcycle-riders": {
    url: "https://images.pexels.com/photos/20806421/pexels-photo-20806421.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Motorcycle parked on a country road",
    credit: "Photo: Diego Flores / Pexels",
  },
  "elderly-drivers": {
    url: "https://images.pexels.com/photos/3831552/pexels-photo-3831552.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Elderly man in the front seat of a contemporary car, side view",
    credit: "Photo: Pexels",
  },
  "road-trippers": {
    url: "https://images.pexels.com/photos/35746669/pexels-photo-35746669.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Car driving on a scenic mountain road at sunset, viewed from the vehicle interior",
    credit: "Photo: Pexels",
  },
  dealerships: {
    url: "https://images.pexels.com/photos/17632052/pexels-photo-17632052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Car dealership showroom with luxury vehicles on display",
    credit: "Photo: Pexels",
  },
  "rental-car": {
    url: "https://images.pexels.com/photos/26919330/pexels-photo-26919330.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Rental car bus at an airport terminal pickup",
    credit: "Photo: Pexels",
  },
  "winter-drivers": {
    url: "https://images.pexels.com/photos/35636308/pexels-photo-35636308.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Snow-covered road winding through a tranquil winter forest",
    credit: "Photo: Magda Ehlers / Pexels",
  },
  "construction-contractors": {
    url: "https://images.pexels.com/photos/4496282/pexels-photo-4496282.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Contractor work van with a ladder on top parked outdoors",
    credit: "Photo: Pexels",
  },
  "after-hours": {
    url: "https://images.pexels.com/photos/28447796/pexels-photo-28447796.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    alt: "Red tow truck on a wet urban street at night",
    credit: "Photo: Helena Jankovičová Kováčová / Pexels",
  },
};

export const SECTION_PHOTOS = {
  technician: {
    url: "https://images.pexels.com/photos/6720546/pexels-photo-6720546.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Smiling roadside technician in uniform performing service on a truck",
    credit: "Photo: Gustavo Fring / Pexels",
  },
  truckAtNight: {
    url: "https://images.pexels.com/photos/28447796/pexels-photo-28447796.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Red tow truck parked on a wet street at night",
    credit: "Photo: Helena Jankovičová Kováčová / Pexels",
  },
  cityNight: {
    url: "https://images.pexels.com/photos/36331525/pexels-photo-36331525.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Long exposure of a highway at night with dynamic light trails",
    credit: "Photo: Freek Wolsink / Pexels",
  },
  workshop: {
    url: "https://images.pexels.com/photos/29181493/pexels-photo-29181493.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Mechanic organizing engine parts and tools in a workshop",
    credit: "Photo: Sergei Starostin / Pexels",
  },
  rainyRoad: {
    url: "https://images.pexels.com/photos/9846091/pexels-photo-9846091.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Black car driving on a rainy highway in motion",
    credit: "Photo: Erik Mclean / Pexels",
  },
  brokenDown: {
    url: "https://images.pexels.com/photos/4173093/pexels-photo-4173093.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Driver on phone next to a broken-down car with the hood open",
    credit: "Photo: Pexels",
  },
  dispatch: {
    url: "https://images.pexels.com/photos/4267531/pexels-photo-4267531.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Dispatcher with headset operating a console",
    credit: "Photo: Pexels",
  },
  highwayUSA: {
    url: "https://images.pexels.com/photos/36467340/pexels-photo-36467340.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Long-exposure view of Interstate 81 with a passing truck",
    credit: "Photo: Pexels",
  },
  serviceTruck: {
    url: "https://images.pexels.com/photos/6720551/pexels-photo-6720551.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Mechanic in a garage repairing the wheel of a blue truck",
    credit: "Photo: Pexels",
  },
  snowRoad: {
    url: "https://images.pexels.com/photos/35636308/pexels-photo-35636308.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    alt: "Snow-covered road winding through a forest in winter",
    credit: "Photo: Magda Ehlers / Pexels",
  },
} as const;