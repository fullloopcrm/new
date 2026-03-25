"use client";

import { useState } from "react";

const timeSlots = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

interface BookingFormProps {
  tenantId: string;
  services: { id: string; name: string }[];
}

export default function BookingForm({ tenantId, services }: BookingFormProps) {
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setError("Please select a preferred time.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          service_type_id: selectedService,
          date: selectedDate,
          time: selectedTime,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
          source: "website_booking",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit booking");
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-xl font-bold text-slate-900">Booking Submitted!</h3>
        <p className="mt-2 text-slate-600">We&apos;ll confirm your appointment shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Service Selector */}
      <div>
        <label htmlFor="service" className="block text-sm font-semibold text-slate-900 mb-2">
          Select a Service
        </label>
        {services.length > 0 ? (
          <select
            id="service"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            required
          >
            <option value="">Choose a service...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-slate-500">No services available. Please contact us directly.</p>
        )}
      </div>

      {/* Date Picker */}
      <div>
        <label htmlFor="date" className="block text-sm font-semibold text-slate-900 mb-2">
          Preferred Date
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          required
        />
      </div>

      {/* Time Slots */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-3">
          Preferred Time
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedTime(slot)}
              className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                selectedTime === slot
                  ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                  : "bg-white text-slate-700 border-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Your Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              placeholder="jane@example.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              placeholder="(555) 123-4567"
              required
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
              Service Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              placeholder="123 Main St, Apt 4B"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none"
            placeholder="Any special instructions, access codes, pet info, etc."
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors shadow-lg disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Booking Request"}
      </button>
    </form>
  );
}
