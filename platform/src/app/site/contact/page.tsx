"use client";

import { useState } from "react";

const hours = [
  { day: "Monday - Friday", time: "8:00 AM - 6:00 PM" },
  { day: "Saturday", time: "9:00 AM - 4:00 PM" },
  { day: "Sunday", time: "Closed" },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Message sent! (This is a placeholder — no data was sent.)");
  };

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-slate-900">Contact Us</h1>
          <p className="mt-4 text-lg text-slate-600">
            Have a question or need a custom quote? Reach out and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none"
                  placeholder="Tell us about your needs..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors shadow-lg shadow-teal-600/25"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-8">
            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Office</h3>
              <p className="text-slate-600">
                123 Main Street, Suite 100
                <br />
                New York, NY 10001
              </p>
            </div>

            {/* Phone & Email */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Get in Touch</h3>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <span className="font-medium text-slate-800">Phone:</span>{" "}
                  <a href="tel:5551234567" className="hover:text-[var(--brand)] transition-colors">(555) 123-4567</a>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Email:</span>{" "}
                  <a href="mailto:hello@yourbusiness.com" className="hover:text-[var(--brand)] transition-colors">hello@yourbusiness.com</a>
                </li>
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Hours of Operation</h3>
              <ul className="space-y-2">
                {hours.map((h) => (
                  <li key={h.day} className="flex justify-between text-sm">
                    <span className="text-slate-800 font-medium">{h.day}</span>
                    <span className="text-slate-600">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Map Placeholder */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Location</h3>
              <div className="w-full h-64 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-sm border border-slate-300">
                Map placeholder — embed Google Maps here
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
