"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Building2, Users, LayoutDashboard, FileText, Scale, BadgeCheck, Printer, Settings, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight } from "lucide-react";
import { COMMITTEE_STAGE_ORDER, committeeRoleLabel, stageSlug } from "@/lib/committee-config";
import { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/loans", label: "Applications", icon: FileText },
  { href: "/endorsement", label: "Endorsement", icon: BadgeCheck, roles: ["SUPER_ADMIN", "HEAD_OFFICE_ADMIN", "ACCOUNT_ASSISTANT"] },
  {
    href: "/committee/pending",
    label: "Credit Committee",
    icon: Scale,
    roles: ["SUPER_ADMIN", "HEAD_OFFICE_ADMIN", "HEAD_OFFICE_CREDIT_COMMITTEE", "BOOKKEEPER", "AREA_TEAM_LEADER", "BRANCH_TEAM_LEADER"],
    children: [
      { href: "/committee/pending", label: "Loans for Approval" },
      { href: "/committee", label: "Review Board" },
      ...COMMITTEE_STAGE_ORDER.map((roleKey) => ({ href: `/committee/${stageSlug(roleKey)}`, label: committeeRoleLabel(roleKey) })),
      { href: "/committee/approved", label: "Approved Loans" }
    ]
  },
  { href: "/reports", label: "Reports", icon: Printer },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroup, setOpenGroup] = useState("");

  return (
    <div className="min-h-screen">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform border-r border-blue-100 bg-white transition-[transform,width] duration-200 ease-in-out lg:translate-x-0 ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex min-h-[73px] items-center justify-between border-b border-blue-100 py-4 ${collapsed ? "lg:px-3" : "px-5"}`}>
          <div className={collapsed ? "lg:w-full lg:text-center" : ""}>
            <div className="font-bold text-alc-blue">
              <span className={collapsed ? "hidden lg:inline" : "hidden"}>ALC</span>
              <span className={collapsed ? "lg:hidden" : ""}>AGUSAN LENDING CORPORATION</span>
            </div>
            <div className={`mt-1 text-xs text-slate-500 ${collapsed ? "lg:hidden" : ""}`}>CI/BI and Credit Scorecard</div>
          </div>
          <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          className="absolute -right-4 top-20 hidden h-12 w-8 items-center justify-center rounded-full border border-blue-200 bg-alc-blue text-white shadow-md transition hover:bg-blue-800 lg:flex"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? "Show menu labels" : "Hide menu labels"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <nav className="space-y-1 p-3">
          {nav.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
            const Icon = item.icon;
            const expanded = openGroup === item.label;
            return (
              <div key={item.href}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-1 items-center rounded-md px-3 py-3 text-base font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-alc-blue ${collapsed ? "lg:justify-center lg:px-2" : "gap-4"}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={23} className="shrink-0 text-alc-blue" />
                    <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </Link>
                  {item.children ? (
                    <button
                      type="button"
                      aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                      aria-expanded={expanded}
                      className={`rounded-md p-2 text-slate-500 hover:bg-blue-50 ${collapsed ? "lg:hidden" : ""}`}
                      onClick={() => setOpenGroup(expanded ? "" : item.label)}
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  ) : null}
                </div>
                {item.children && expanded ? (
                  <div className={`ml-6 space-y-0.5 border-l border-blue-100 pl-3 ${collapsed ? "lg:hidden" : ""}`}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-alc-blue"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
      {open ? <div className="no-print fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
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
