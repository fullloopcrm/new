import Link from "next/link";
import { redirect } from "next/navigation";
import { clearAdminSession } from "@/app/site/the-home-services-company/_lib/admin-auth";

export function AdminShell({ children }: { children: React.ReactNode }) {
  async function logout() {
    "use server";
    await clearAdminSession();
    redirect("/admin/login");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-white">Admin</Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-slate-300 hover:text-white">Overview</Link>
              <Link href="/admin/leads" className="text-slate-300 hover:text-white">Leads</Link>
              <Link href="/admin/job-applications" className="text-slate-300 hover:text-white">Job Apps</Link>
              <Link href="/admin/partnerships" className="text-slate-300 hover:text-white">Partnerships</Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-slate-400 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </>
  );
}
