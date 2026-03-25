import { getTenantFromHeaders, getTenantServices } from "@/lib/tenant-site";
import type { Metadata } from "next";
import BookingForm from "./booking-form";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `Book — ${tenant.name}` : "Book",
    description: tenant ? `Book an appointment with ${tenant.name}.` : "Book an appointment.",
  };
}

export default async function BookPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const services = await getTenantServices(tenant.id);

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Book an Appointment</h1>
          <p className="mt-4 text-lg text-slate-600">
            Select a service, pick a date and time, and fill in your details. We&apos;ll confirm your booking shortly.
          </p>
        </div>

        <BookingForm
          tenantId={tenant.id}
          services={services.map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          }))}
        />
      </div>
    </div>
  );
}
