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
              Welcome to Full Loop CRM. Your account has been pre-configured with services, settings, and everything you need to start managing your business. Here&apos;s how to get up and running.
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li><strong>Review your services</strong> &mdash; Go to Settings &rarr; Services to check your service types, pricing, and durations. These were set up during onboarding but you can adjust them anytime.</li>
              <li><strong>Add your clients</strong> &mdash; Navigate to Clients to add your existing customers. You can add them one by one or import them later.</li>
              <li><strong>Create bookings</strong> &mdash; Go to Bookings to schedule jobs. Select a client, service, date/time, and team member.</li>
              <li><strong>Add your team</strong> &mdash; Go to Team to add members. Each team member gets a 4-digit PIN for the mobile team portal (see Team Members section below).</li>
              <li><strong>Turn on Selena AI</strong> &mdash; Visit the Selena page to activate your AI booking agent. Selena handles incoming SMS messages and web chat conversations, so new clients can book 24/7 without you lifting a finger.</li>
              <li><strong>Set up your web chat</strong> &mdash; Go to Connect to grab the chat widget code for your website. This lets visitors start a conversation with Selena directly from your site.</li>
              <li><strong>Set up billing info</strong> &mdash; Confirm your payment method in Settings so your account stays active.</li>
            </ol>
          </div>
        </section>

        {/* Bookings */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Bookings</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Bookings are the core of Full Loop. Each booking tracks a job from scheduling through completion and payment.</p>

            <p><strong>Status flow:</strong> Scheduled &rarr; Confirmed &rarr; In Progress &rarr; Completed &rarr; Paid. Each status change is tracked with a timestamp so you have a full audit trail.</p>

            <p><strong>Creating a booking:</strong> Click &quot;New Booking&quot; on the Bookings page. Select a client, service type, date and time, and optionally assign a team member. The system auto-calculates the price based on your service rates.</p>

            <p><strong>Check-in &amp; check-out:</strong> When a team member arrives at a job, they check in from the team portal. GPS location is recorded to verify they&apos;re at the right address. When the job is done, they check out the same way. This gives you verified start and end times for every job.</p>

            <p><strong>15-minute heads up:</strong> Team members can tap the &quot;Heads Up&quot; button from their portal to let you know they&apos;re 15 minutes away from their next job. You&apos;ll get a notification in your dashboard so you always know where your team is.</p>

            <p><strong>Half-hour rounding with 10-minute grace:</strong> Job durations are rounded to the nearest half hour for clean payroll calculation. There&apos;s a built-in 10-minute grace period &mdash; so if a 3-hour job takes 3 hours and 8 minutes, it&apos;s still billed as 3 hours. If it goes to 3 hours and 12 minutes, it rounds up to 3.5 hours.</p>

            <p><strong>Video walkthroughs:</strong> Team members can upload before and after walkthrough videos for each booking. These are attached to the booking record and visible in the client&apos;s portal, giving your customers proof of work and building trust.</p>

            <p><strong>Recurring schedules:</strong> For repeat clients, use the Schedules page to set up weekly, bi-weekly, or monthly recurring jobs. The system auto-generates bookings 4 weeks ahead so your calendar stays full and your team knows what&apos;s coming.</p>
          </div>
        </section>

        {/* Selena AI */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Selena AI</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Selena is your AI-powered booking agent. She handles incoming SMS messages and web chat conversations automatically, booking new clients and managing requests around the clock.</p>

            <p><strong>How it works:</strong> When someone texts your business number or starts a web chat, Selena takes over the conversation. She introduces herself, collects the information needed to book an appointment, and creates the booking in your system &mdash; all without you needing to respond.</p>

            <p><strong>Booking checklist:</strong> Selena walks through a checklist to gather everything she needs: the client&apos;s name, the service they want, their preferred date and time, and their address. She only creates the booking once she has all the details confirmed.</p>

            <p><strong>Returning client recognition:</strong> When a returning client texts in, Selena recognizes their phone number and greets them by name. She already knows their address and service preferences, so the booking process is faster.</p>

            <p><strong>Escalation:</strong> If Selena encounters a question she can&apos;t handle &mdash; like a custom pricing request or a complaint &mdash; she lets the client know that someone from your team will follow up, and sends you a notification so nothing falls through the cracks.</p>

            <p><strong>Conversation reset:</strong> After a conversation is complete (booking confirmed or escalated), the conversation resets so the next time that person texts, Selena starts fresh and doesn&apos;t get confused by old context.</p>

            <p><strong>Admin dashboard:</strong> Visit the Selena page in your dashboard to see conversation stats, filter by date range, and review recent conversations. You can see how many bookings Selena has handled, how many were escalated, and how your conversion rate is trending.</p>
          </div>
        </section>

        {/* Clients */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Clients</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The Clients page is your customer database. Each client profile includes contact info, booking history, payment history, and notes.</p>

            <p><strong>Lifecycle tracking:</strong> Clients are automatically categorized as New, Active, At-Risk, or Churned based on their booking activity. This helps you see at a glance who&apos;s a regular, who hasn&apos;t booked in a while, and who needs a follow-up to win back.</p>

            <p><strong>Source attribution:</strong> When clients book through your website, a referral link, Google, or social media, the source is automatically tracked. You&apos;ll know exactly which marketing channels are bringing in real paying customers.</p>

            <p><strong>Client portal:</strong> Each client gets access to their own portal where they can view upcoming and past bookings, watch before/after walkthrough videos, and manage their account. Clients verify their identity via SMS code &mdash; no passwords to remember.</p>

            <p><strong>Booking history:</strong> Every booking for a client is tracked with full details: date, service, team member, duration, price, payment status, and any attached walkthrough videos. You can review a client&apos;s complete history from their profile.</p>

            <p><strong>Video gallery:</strong> Walkthrough videos uploaded by your team are organized by client and booking. Clients can view these in their portal, and you can review them from the dashboard.</p>
          </div>
        </section>

        {/* Team Members */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Team Members</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Add your field workers on the Team page. Each team member gets a 4-digit PIN to access the mobile team portal &mdash; no app download or account creation needed.</p>

            <p><strong>PIN-based mobile portal:</strong> Team members open the portal link in their phone&apos;s browser and enter their PIN to log in. They can save it to their home screen for quick access, and it works just like a native app. No app store required.</p>

            <p><strong>Today&apos;s jobs:</strong> The portal shows each team member their jobs for the day with client name, address, service type, and scheduled time. They can tap the address to open navigation.</p>

            <p><strong>Check-in &amp; check-out with GPS:</strong> When arriving at a job, the team member taps &quot;Check In&quot; and their GPS location is recorded. Same for check-out when the job is done. This gives you verified arrival and departure times with location proof.</p>

            <p><strong>15-minute heads up:</strong> On the way to a job, team members can tap the &quot;Heads Up&quot; button to let you know they&apos;ll be there in about 15 minutes. You get a notification in your dashboard, and the client can optionally be notified too.</p>

            <p><strong>Video walkthrough uploads:</strong> Before starting a job, team members record a quick walkthrough video showing the current state. After finishing, they record another showing the completed work. Both videos are attached to the booking and visible to you and the client.</p>

            <p><strong>Earnings tracking:</strong> Team members can view their own earnings broken down by week, month, and year. They see their hours worked, jobs completed, and total pay &mdash; all calculated automatically from their check-in/check-out times and hourly rate.</p>

            <p><strong>Availability management:</strong> Team members can set their availability directly from the portal, marking which days and times they&apos;re available to work. This feeds into the scheduling system so you don&apos;t accidentally book someone on their day off.</p>

            <p><strong>Bilingual interface (EN/ES):</strong> The team portal is fully available in English and Spanish. Team members can switch languages at any time. All labels, buttons, and instructions are translated.</p>

            <p><strong>Saving to home screen:</strong> Team members can add the portal to their phone&apos;s home screen for instant access. On iPhone, tap Share &rarr; Add to Home Screen. On Android, tap the menu &rarr; Add to Home Screen. It opens full-screen like a regular app.</p>
          </div>
        </section>

        {/* Finance */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Finance</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The Finance page gives you a complete picture of your business financials.</p>

            <p><strong>Revenue:</strong> Track income by day, week, month, or year. See which services generate the most revenue and spot trends over time.</p>

            <p><strong>Payroll:</strong> View pending team pay and mark payments as completed. Supports Zelle, Apple Cash, and other methods. Pay is calculated automatically from check-in/check-out times and each member&apos;s hourly rate.</p>

            <p><strong>Half-hour rounding:</strong> Job durations are rounded to the nearest half hour with a 10-minute grace period for clean, fair payroll. A job that runs 2 hours and 7 minutes is paid as 2 hours. A job that runs 2 hours and 14 minutes is paid as 2.5 hours.</p>

            <p><strong>Expenses:</strong> Track business expenses across categories like supplies, transport, insurance, and more. Upload receipts for record-keeping.</p>

            <p><strong>P&amp;L (Profit &amp; Loss):</strong> Automatic profit and loss calculation: Revenue &minus; Labor &minus; Expenses = Net Profit. View your P&amp;L by week, month, or year to understand your true margins.</p>
          </div>
        </section>

        {/* Leads & Analytics */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Leads &amp; Analytics</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The Leads page shows you where your customers are coming from and how your marketing is performing.</p>

            <p><strong>Traffic tracking:</strong> See visits to your website broken down by source (Google, social media, direct, referrals).</p>

            <p><strong>Conversions:</strong> Track the journey from website visit to booking request to paying customer. See your conversion rate and identify where potential clients are dropping off.</p>

            <p><strong>Lead sources:</strong> Every lead is tagged with where it came from &mdash; web chat, SMS, referral, Google, or manual entry &mdash; so you know which channels are worth investing in.</p>
          </div>
        </section>

        {/* Communications */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Communications</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Full Loop handles client and team communication through SMS and email, all integrated into your dashboard.</p>

            <p><strong>SMS via Telnyx:</strong> Your business gets a dedicated phone number for text messaging. All incoming and outgoing SMS messages are handled through Telnyx and logged in your dashboard. This is the same number Selena uses to handle booking conversations.</p>

            <p><strong>Email via Resend:</strong> Transactional emails (booking confirmations, reminders, review requests) are sent through Resend using your connected API key. Configure this in Settings &rarr; Integrations.</p>

            <p><strong>Booking confirmations &amp; reminders:</strong> When a booking is created or confirmed, the client automatically receives a confirmation. Reminder messages go out before the appointment so clients are prepared and no-shows drop.</p>

            <p><strong>Review request flow:</strong> After a job is completed, the system can automatically send a review request to the client, directing them to leave a Google review. This helps you build your online reputation on autopilot.</p>

            <p><strong>Bilingual team SMS:</strong> Team notifications (new job assigned, schedule changes) are sent in the team member&apos;s preferred language &mdash; English or Spanish.</p>

            <p><strong>SMS campaigns:</strong> Send targeted text message campaigns to your client list. Filter by lifecycle status (e.g., send a win-back offer to churned clients) or service history. Campaign results are tracked so you can see delivery and response rates.</p>

            <p><strong>Email campaigns:</strong> Send email campaigns with the same filtering options. Great for newsletters, seasonal promotions, or service announcements.</p>
          </div>
        </section>

        {/* Web Chat */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Web Chat</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The web chat widget lets visitors on your website start a conversation with Selena AI directly from any page. It&apos;s a small chat bubble in the corner that opens into a full conversation window.</p>

            <p><strong>Setup:</strong> Go to Connect in your dashboard to get the embed code. Add it to your website and the chat widget appears automatically. No coding knowledge needed &mdash; just paste the snippet before the closing body tag.</p>

            <p><strong>New client flow:</strong> When a new visitor starts a chat, Selena greets them, asks what service they need, and walks them through booking &mdash; collecting their name, phone number, address, preferred date and time. The booking is created in your system automatically.</p>

            <p><strong>Returning client flow:</strong> If a visitor enters a phone number that matches an existing client, Selena recognizes them and greets them by name. She already has their address and history on file, making repeat bookings faster.</p>

            <p><strong>Quick reply buttons:</strong> During the conversation, Selena offers quick reply buttons (like service options or available time slots) so visitors can tap instead of typing. This speeds up the booking process and reduces drop-off.</p>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Notifications</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>The notification center in your dashboard keeps you informed about everything happening in your business in real time.</p>

            <p><strong>What you&apos;ll get notified about:</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>New bookings created (by you, Selena, or through the client portal)</li>
              <li>Team member check-ins and check-outs</li>
              <li>15-minute heads up alerts from your team</li>
              <li>Walkthrough videos uploaded (before and after)</li>
              <li>Selena escalations (conversations she needs your help with)</li>
              <li>New client sign-ups</li>
              <li>Booking cancellations or changes</li>
              <li>Payment updates</li>
            </ul>

            <p><strong>In-app notifications:</strong> The bell icon in your dashboard header shows your unread count. Click it to see your recent notifications and mark them as read.</p>

            <p><strong>Push notifications:</strong> Enable browser push notifications so you get alerts even when you&apos;re not actively in the dashboard. You&apos;ll be prompted to allow notifications on your first visit.</p>

            <p><strong>Team portal notifications:</strong> Team members also have their own notification feed in the team portal, showing new job assignments, schedule changes, and other relevant updates.</p>
          </div>
        </section>

        {/* Settings */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Settings</h3>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>Configure your business from the Settings page:</p>
            <ul className="list-disc list-inside space-y-2 pl-1">
              <li><strong>Business</strong> &mdash; Your business name, phone, email, address, timezone, and operating hours.</li>
              <li><strong>Services</strong> &mdash; Add, edit, reorder, and toggle your service types. Set pricing, estimated duration, and descriptions for each service. These are what clients see when booking.</li>
              <li><strong>Integrations</strong> &mdash; Connect the tools that power your communications and payments:
                <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
                  <li><strong>Telnyx</strong> &mdash; SMS messaging and Selena AI conversations</li>
                  <li><strong>Resend</strong> &mdash; Email confirmations, reminders, and campaigns</li>
                  <li><strong>Stripe</strong> &mdash; Online payments and invoicing</li>
                  <li><strong>Google</strong> &mdash; Review requests and Google Business Profile</li>
                </ul>
              </li>
              <li><strong>Branding</strong> &mdash; Set your brand colors, upload your logo, and customize your tagline. These are used across your client portal, web chat widget, and email templates.</li>
              <li><strong>Guidelines (EN/ES)</strong> &mdash; Write guidelines and instructions for your team in both English and Spanish. These appear in the team portal so your workers always know your expectations and procedures.</li>
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
