const team = [
  { name: "Alex Johnson", role: "Founder & CEO", bio: "15+ years of industry experience. Passionate about delivering exceptional service." },
  { name: "Maria Santos", role: "Operations Manager", bio: "Ensures every job meets our high standards. Detail-oriented and customer-focused." },
  { name: "David Kim", role: "Lead Technician", bio: "Certified professional with expertise across residential and commercial projects." },
  { name: "Priya Patel", role: "Customer Success", bio: "Your point of contact for scheduling, questions, and making sure you're 100% satisfied." },
];

const values = [
  { title: "Quality First", description: "We never cut corners. Every job is completed to the highest standard, period." },
  { title: "Reliability", description: "We show up on time, every time. You can count on us to deliver consistently." },
  { title: "Transparency", description: "No hidden fees, no surprises. Clear pricing and honest communication always." },
  { title: "Customer Focus", description: "Your satisfaction drives everything we do. We listen, adapt, and go the extra mile." },
];

export default function AboutPage() {
  return (
    <div>
      {/* Company Story */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-slate-900">About Us</h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              Founded over a decade ago, we set out with a simple mission: provide honest, high-quality
              service that people can rely on. What started as a small local operation has grown into a
              trusted name serving thousands of satisfied customers.
            </p>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              We believe that every customer deserves professional-grade service at a fair price.
              Our team is fully trained, background-checked, and passionate about what they do.
              When you choose us, you&apos;re choosing peace of mind.
            </p>
          </div>
        </div>
      </section>

      {/* Values / Mission */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Our Values</h2>
            <p className="mt-3 text-slate-600">The principles that guide everything we do.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-[var(--brand)]">{value.title}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Meet the Team</h2>
            <p className="mt-3 text-slate-600">The people behind the service you trust.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                {/* Photo placeholder */}
                <div className="w-24 h-24 mx-auto bg-slate-200 rounded-full flex items-center justify-center text-slate-400 text-3xl font-bold">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{member.name}</h3>
                <p className="text-sm text-[var(--brand)] font-medium">{member.role}</p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
