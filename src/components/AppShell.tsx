"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Building2, Users, LayoutDashboard, FileText, Scale, Printer, Settings, Menu, X } from "lucide-react";
import { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/loans", label: "Applications", icon: FileText },
  { href: "/committee", label: "Committee", icon: Scale },
  { href: "/reports", label: "Reports", icon: Printer },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <div>
            <div className="text-sm font-bold text-alc-green">Agusan Lending Corp.</div>
            <div className="mt-1 text-xs text-slate-500">CI/BI and Credit Scorecard</div>
          </div>
          <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {open ? <div className="no-print fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="shrink-0 rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{user.fullName}</div>
                <div className="truncate text-xs text-slate-500">{user.role.replaceAll("_", " ")} / {user.branchName}</div>
              </div>
            </div>
            <form action="/api/auth/logout" method="post" className="shrink-0">
              <button className="btn-secondary" type="submit">
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
