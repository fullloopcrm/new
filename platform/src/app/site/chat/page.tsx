import type { Metadata } from "next";
import { getTenantFromHeaders } from "@/lib/tenant-site";
import ChatPageClient from "./ChatPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  const aiName =
    (tenant?.selena_config as any)?.ai_name || "our AI assistant";
  return {
    title: tenant ? `Chat with ${aiName} | ${tenant.name}` : "Chat",
    description: tenant
      ? `Chat with ${aiName} from ${tenant.name}. Available 24/7 to answer questions and book appointments.`
      : "Chat with our AI assistant.",
  };
}

export default async function ChatPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const aiName =
    (tenant.selena_config as any)?.ai_name || "our AI assistant";
  const primaryColor = tenant.primary_color || "oklch(0.55 0.15 175)";

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            Chat with{" "}
            <span className="text-[var(--brand)]">{aiName}</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-xl mx-auto">
            Available 24/7. Book your appointment in minutes.
          </p>
        </div>
      </section>

      {/* Chat */}
      <section className="py-12 lg:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <ChatPageClient tenantId={tenant.id} accentColor={primaryColor} />
        </div>
      </section>
    </div>
  );
}
