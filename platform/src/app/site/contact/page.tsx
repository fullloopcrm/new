import { getTenantFromHeaders } from "@/lib/tenant-site";
import type { Metadata } from "next";
import ContactForm from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `Contact — ${tenant.name}` : "Contact",
    description: tenant ? `Get in touch with ${tenant.name}.` : "Contact us.",
  };
}

export default async function ContactPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const phone = tenant.phone || "";
  const email = tenant.email || "";
  const address = tenant.address || "";

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-slate-900">Contact {tenant.name}</h1>
          <p className="mt-4 text-lg text-slate-600">
            Have a question or need a custom quote? Reach out and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send Us a Message</h2>
            <ContactForm tenantId={tenant.id} />
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-8">
            {/* Address */}
            {address && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Location</h3>
                <p className="text-slate-600">{address}</p>
              </div>
            )}

            {/* Phone & Email */}
            {(phone || email) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Get in Touch</h3>
                <ul className="space-y-2 text-slate-600">
                  {phone && (
                    <li>
                      <span className="font-medium text-slate-800">Phone:</span>{" "}
                      <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="hover:text-[var(--brand)] transition-colors">{phone}</a>
                    </li>
                  )}
                  {email && (
                    <li>
                      <span className="font-medium text-slate-800">Email:</span>{" "}
                      <a href={`mailto:${email}`} className="hover:text-[var(--brand)] transition-colors">{email}</a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
