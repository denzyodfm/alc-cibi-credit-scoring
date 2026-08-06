import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { BranchForm } from "@/components/BranchForm";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BranchesPage() {
  const user = await requireUser();
  const branches = await prisma.branch.findMany({
    include: { users: true, assignments: { include: { user: true }, where: { isActive: true } } },
    orderBy: { branchCode: "asc" }
  });

  return (
    <AppShell user={user}>
      <PageHeader title="Branch Management" description="Profiles, branch codes, and staff assignments." />
      {canManageSetup(user) ? <BranchForm /> : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {branches.map((branch) => (
          <article key={branch.id} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">Code {branch.branchCode}</div>
                <h2 className="text-lg font-bold">{branch.branchName}</h2>
                <p className="mt-1 text-sm text-slate-500">{branch.branchAddress ?? "No address yet"}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{branch.status}</span>
            </div>
            <div className="mt-4 text-sm">
              <div className="font-semibold">Users under branch: {branch.users.length}</div>
              <div className="mt-2 space-y-1">
                {branch.assignments.map((assignment) => (
                  <div key={assignment.id} className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                    <span>{assignment.user.fullName}</span>
                    <span className="text-xs text-slate-500">{assignment.staffRole.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
