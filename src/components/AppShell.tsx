import Link from "next/link";
import { LogOut, Building2, Users, LayoutDashboard, FileText, Scale, Printer } from "lucide-react";
import { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/loans", label: "Applications", icon: FileText },
  { href: "/committee", label: "Committee", icon: Scale },
  { href: "/reports", label: "Reports", icon: Printer }
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="text-sm font-bold text-alc-green">Agusan Lending Corp.</div>
          <div className="mt-1 text-xs text-slate-500">CI/BI and Credit Scorecard</div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <div className="text-sm font-semibold">{user.fullName}</div>
              <div className="text-xs text-slate-500">{user.role.replaceAll("_", " ")} / {user.branchName}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn-secondary" type="submit">
                <LogOut size={16} />
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
