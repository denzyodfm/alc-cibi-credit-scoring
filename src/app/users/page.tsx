import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { UserForm } from "@/components/UserForm";
import { UserEditButton } from "@/components/UserEditButton";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const user = await requireUser();
  const [users, branches, positions] = await Promise.all([
    prisma.user.findMany({ include: { branch: true, position: true }, orderBy: { fullName: "asc" } }),
    prisma.branch.findMany({ where:{status:"ACTIVE"}, orderBy: { branchCode: "asc" } }),
    prisma.position.findMany({where:{isActive:true},orderBy:{name:"asc"}})
  ]);

  return (
    <AppShell user={user}>
      <PageHeader title="User Management" description="Role-based access, branch assignment, and activation status." />
      {canManageSetup(user) ? <UserForm branches={branches.map((b) => ({ id: b.id, branchName: b.branchName, branchCode: b.branchCode }))} positions={positions}/> : null}
      <section className="panel mt-5 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.fullName}</div>
                  <div className="text-xs text-slate-500">{item.employeeNo}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{item.username}</div>
                  <div className="text-xs text-slate-500">{item.email}</div>
                </td>
                <td className="px-4 py-3">{item.branch.branchCode} / {item.branch.branchName}</td>
                <td className="px-4 py-3">{item.position?.name || item.role.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{canManageSetup(user)?<UserEditButton user={JSON.parse(JSON.stringify(item))} branches={branches} positions={positions}/>:null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </AppShell>
  );
}
