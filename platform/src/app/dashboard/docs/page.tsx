export default function DocsPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Documentation</h2>
      <p className="text-slate-400 text-sm mb-8">Everything you need to run your business on Full Loop CRM.</p>

      <div className="space-y-8">
        {/* Getting Started */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Getting Started</h3>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p>
              Welcome to Full Loop CRM. Your account has been pre-configured with services, settings, and everything you need to start managing your business. Here&apos;s a quick overview of how to get up and running.
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li><strong>Review your services</strong> &mdash; Go to Settings &rarr; Services to check your service types, pricing, and durations. These were set up during onboarding but you can adjust them anytime.</li>
              <li><strong>Add your clients</strong> &mdash; Navigate to Clients to add your existing customers. You can add them one by one or import them later.</li>
              <li><strong>Create bookings</strong> &mdash; Go to Bookings to schedule jobs. Select a client, service, date/time, and team member.</li>
              <li><strong>Add your team</strong> &mdash; If you have a team, go to Team to add members. Each team member gets a PIN for the mobile team portal.</li>
              <li><strong>Set up billing info</strong> &mdash; Confirm your payment method in Settings so your account stays active.</li>
            </ol>
          </div>
        </section>

        {/* Bookings */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Bookings</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Bookings are the core of Full Loop. Each booking tracks a job from scheduling through completion and payment.</p>
            <p><strong>Status flow:</strong> Scheduled &rarr; Confirmed &rarr; In Progress &rarr; Completed &rarr; Paid</p>
            <p><strong>Creating a booking:</strong> Click &quot;New Booking&quot; on the Bookings page. Select a client, service type, date and time, and optionally assign a team member. The system auto-calculates the price based on your service rates.</p>
            <p><strong>Recurring bookings:</strong> For repeat clients, use the Schedules page to set up weekly, bi-weekly, or monthly recurring jobs. The system auto-generates bookings 4 weeks ahead.</p>
          </div>
        </section>

        {/* Clients */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Clients</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The Clients page is your customer database. Each client profile includes contact info, booking history, payment history, and notes.</p>
            <p><strong>Lifecycle status:</strong> Clients are automatically categorized as New, Active, At-Risk, or Churned based on their booking activity. This helps you identify who needs attention.</p>
            <p><strong>Source tracking:</strong> When clients book through your website or referral links, the source is automatically tracked so you know where your customers come from.</p>
          </div>
        </section>

        {/* Team */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Team Members</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Add your field workers on the Team page. Each team member gets a 4-digit PIN for the mobile team portal.</p>
            <p><strong>Team portal:</strong> Your team members use a separate mobile-friendly portal (no app download needed). They can view today&apos;s jobs, check in/out with GPS verification, and track their earnings.</p>
            <p><strong>Pay tracking:</strong> The system tracks hours and calculates pay based on each member&apos;s hourly rate. View pending payroll in Finance.</p>
          </div>
        </section>

        {/* Finance */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Finance</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The Finance page gives you a complete picture of your business financials.</p>
            <p><strong>Revenue:</strong> Track income by day, week, month, or year. See which services generate the most revenue.</p>
            <p><strong>Payroll:</strong> View pending team pay and mark payments as completed. Supports Zelle, Apple Cash, and other methods.</p>
            <p><strong>Expenses:</strong> Track business expenses across categories like supplies, transport, insurance, and more. Upload receipts for record-keeping.</p>
            <p><strong>P&amp;L:</strong> Automatic profit and loss calculation: Revenue - Labor - Expenses = Net Profit.</p>
          </div>
        </section>

        {/* Leads */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Leads &amp; Analytics</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The Leads page shows you where your customers are coming from and how your website is performing.</p>
            <p><strong>Traffic tracking:</strong> See visits to your website broken down by source (Google, social media, direct, referrals).</p>
            <p><strong>Conversions:</strong> Track the journey from website visit to booking request to paying customer.</p>
          </div>
        </section>

        {/* Communications */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Communications</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p><strong>Email (Resend):</strong> Connected via your Resend API key in Settings &rarr; Integrations. Used for booking confirmations, reminders, review requests, and campaigns.</p>
            <p><strong>SMS (Telnyx):</strong> Connected via your Telnyx API key and phone number in Settings &rarr; Integrations. Used for appointment reminders, team notifications, and SMS campaigns.</p>
            <p><strong>Campaigns:</strong> Send email or SMS campaigns to your clients. Filter by lifecycle status, service history, or send to everyone.</p>
          </div>
        </section>

        {/* Settings */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Settings</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Configure your business from the Settings page:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Business</strong> &mdash; Name, phone, email, address, timezone, hours</li>
              <li><strong>Services</strong> &mdash; Add, edit, reorder, and toggle services</li>
              <li><strong>Integrations</strong> &mdash; Connect Resend (email), Telnyx (SMS), Stripe (payments), and Google (reviews)</li>
              <li><strong>Branding</strong> &mdash; Colors, logo, tagline</li>
            </ul>
          </div>
        </section>

        {/* Support */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Need Help?</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>If you need assistance or have questions about your account, reach out to us:</p>
            <p><strong>Email:</strong> support@fullloopcrm.com</p>
            <p>We typically respond within a few hours during business hours.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
