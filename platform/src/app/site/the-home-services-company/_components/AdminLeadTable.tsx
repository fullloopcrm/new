// @ts-nocheck
import { redirect } from "next/navigation";
import type { Lead } from "@/app/site/the-home-services-company/_lib/admin-data";
import { updateLeadStatus, updateLeadNotes } from "@/app/site/the-home-services-company/_lib/admin-data";

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_OPTIONS: Lead["status"][] = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "completed",
  "lost",
];

const STATUS_COLORS: Record<Lead["status"], string> = {
  new: "bg-blue-500/20 text-blue-300",
  contacted: "bg-amber-500/20 text-amber-300",
  quoted: "bg-purple-500/20 text-purple-300",
  booked: "bg-teal-500/20 text-teal-300",
  completed: "bg-green-500/20 text-green-300",
  lost: "bg-slate-500/20 text-slate-300",
};

interface AdminLeadTableProps {
  leads: Lead[];
  returnPath: string;
  showBusiness?: boolean;
  showTrade?: boolean;
  showService?: boolean;
  emptyLabel: string;
}

export function AdminLeadTable({
  leads,
  returnPath,
  showBusiness,
  showTrade,
  showService,
  emptyLabel,
}: AdminLeadTableProps) {
  async function saveStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "") as Lead["status"];
    if (id && STATUS_OPTIONS.includes(status)) {
      await updateLeadStatus(id, status);
    }
    redirect(returnPath);
  }

  async function saveNotes(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const notes = String(formData.get("notes") || "");
    if (id) {
      await updateLeadNotes(id, notes);
    }
    redirect(returnPath);
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
        <p className="text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <div key={lead.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-lg font-bold text-white">
                  {lead.name || "No name"}
                  {showBusiness && lead.business_name && (
                    <span className="ml-2 text-sm font-normal text-slate-400">— {lead.business_name}</span>
                  )}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>{lead.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{formatDate(lead.created_at)}</p>
            </div>
            <form action={saveStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <select
                name="status"
                defaultValue={lead.status}
                className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500">Save</button>
            </form>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {lead.phone && (
              <div>
                <span className="text-slate-500">Phone:</span>{" "}
                <a href={`tel:${lead.phone}`} className="text-teal-400 hover:underline">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div>
                <span className="text-slate-500">Email:</span>{" "}
                <a href={`mailto:${lead.email}`} className="text-teal-400 hover:underline">{lead.email}</a>
              </div>
            )}
            {(lead.city || lead.state || lead.zip) && (
              <div>
                <span className="text-slate-500">Location:</span>{" "}
                <span className="text-slate-200">
                  {[lead.city, lead.state, lead.zip].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {showService && lead.service && (
              <div>
                <span className="text-slate-500">Service:</span>{" "}
                <span className="text-slate-200">{lead.service}</span>
              </div>
            )}
            {showTrade && lead.trade && (
              <div>
                <span className="text-slate-500">Trade:</span>{" "}
                <span className="text-slate-200">{lead.trade}</span>
              </div>
            )}
            {lead.when_needed && (
              <div>
                <span className="text-slate-500">When:</span>{" "}
                <span className="text-slate-200">{lead.when_needed}</span>
              </div>
            )}
            {lead.availability && (
              <div>
                <span className="text-slate-500">Availability:</span>{" "}
                <span className="text-slate-200">{lead.availability}</span>
              </div>
            )}
            {lead.has_license && (
              <div>
                <span className="text-slate-500">License:</span>{" "}
                <span className="text-slate-200">{lead.has_license}</span>
              </div>
            )}
            {lead.source && (
              <div>
                <span className="text-slate-500">Source:</span>{" "}
                <span className="text-slate-200">{lead.source}</span>
              </div>
            )}
          </div>

          {(lead.details || lead.about) && (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
              {lead.details || lead.about}
            </div>
          )}

          <form action={saveNotes} className="mt-4 space-y-2">
            <input type="hidden" name="id" value={lead.id} />
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">Admin notes</label>
            <textarea
              name="notes"
              defaultValue={lead.admin_notes || ""}
              rows={2}
              placeholder="Internal notes — not visible to customers"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
            />
            <button type="submit" className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600">Save notes</button>
          </form>
        </div>
      ))}
    </div>
  );
}
