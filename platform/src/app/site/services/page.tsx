import Link from "next/link";

const services = [
  {
    name: "Standard Cleaning",
    description: "A thorough cleaning of your space including dusting, vacuuming, mopping, bathroom and kitchen sanitization. Perfect for regular upkeep.",
    price: "$120",
    duration: "2-3 hours",
  },
  {
    name: "Deep Cleaning",
    description: "An intensive, top-to-bottom clean covering baseboards, light fixtures, inside appliances, and hard-to-reach areas. Ideal for seasonal refreshes.",
    price: "$220",
    duration: "4-5 hours",
  },
  {
    name: "Move-In / Move-Out Cleaning",
    description: "Complete cleaning for empty or soon-to-be-empty spaces. Includes inside cabinets, closets, appliances, and all surfaces.",
    price: "$280",
    duration: "4-6 hours",
  },
  {
    name: "Commercial / Office Cleaning",
    description: "Professional cleaning for offices, retail spaces, and commercial properties. Flexible scheduling to minimize business disruption.",
    price: "$200",
    duration: "3-4 hours",
  },
  {
    name: "Post-Construction Cleaning",
    description: "Specialized cleaning to remove dust, debris, adhesive residue, and paint splatters after renovation or construction projects.",
    price: "$350",
    duration: "5-7 hours",
  },
  {
    name: "Carpet & Upholstery Cleaning",
    description: "Deep extraction cleaning for carpets, rugs, and upholstered furniture. Removes stains, allergens, and odors.",
    price: "$150",
    duration: "2-3 hours",
  },
  {
    name: "Window Cleaning",
    description: "Interior and exterior window cleaning including sills, tracks, and screens. Crystal clear results guaranteed.",
    price: "$100",
    duration: "1-2 hours",
  },
  {
    name: "Recurring Service Plan",
    description: "Set up weekly, bi-weekly, or monthly cleanings at a discounted rate. Consistent quality with the same trusted team each visit.",
    price: "$99/visit",
    duration: "2-3 hours",
  },
];

export default function ServicesPage() {
  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-slate-900">Our Services</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            We offer a full range of professional services to keep your home or business looking its best.
            All services include eco-friendly products and a satisfaction guarantee.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <div
              key={service.name}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all flex flex-col"
            >
              <h2 className="text-xl font-semibold text-slate-900">{service.name}</h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">{service.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-[var(--brand)]">{service.price}</span>
                  <span className="ml-2 text-sm text-slate-500">· {service.duration}</span>
                </div>
                <Link
                  href="/site/book"
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-slate-50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-slate-900">Not sure which service you need?</h2>
          <p className="mt-3 text-slate-600">
            Contact us for a free consultation. We&apos;ll recommend the perfect service for your space.
          </p>
          <Link
            href="/site/contact"
            className="mt-6 inline-flex items-center px-6 py-3 text-sm font-semibold text-[var(--brand)] border-2 border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white rounded-lg transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
