"use client";

import { useState } from "react";

const services = [
  "Standard Cleaning",
  "Deep Cleaning",
  "Move-In / Move-Out Cleaning",
  "Commercial / Office Cleaning",
  "Post-Construction Cleaning",
  "Carpet & Upholstery Cleaning",
  "Window Cleaning",
];

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

export default function BookPage() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend wiring yet — placeholder
    alert("Booking submitted! (This is a placeholder — no data was sent.)");
  };

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Book an Appointment</h1>
          <p className="mt-4 text-lg text-slate-600">
            Select a service, pick a date and time, and fill in your details. We&apos;ll confirm your booking shortly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Service Selector */}
          <div>
            <label htmlFor="service" className="block text-sm font-semibold text-slate-900 mb-2">
              Select a Service
            </label>
            <select
              id="service"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              required
            >
              <option value="">Choose a service...</option>
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors shadow-lg shadow-teal-600/25"
          >
            Submit Booking Request
          </button>
        </form>
      </div>
    </div>
  );
}
