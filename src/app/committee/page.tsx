import { AppShell } from "@/components/AppShell";
import { ApprovalDashboard } from "@/components/ApprovalDashboard";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, canManageSetup, canReviewCredit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CommitteePage() {
  const user=await requireUser(); const allowed=canReviewCredit(user); const branchScope=canAccessAllBranches(user)?{}:{branchId:user.branchId};
  const loans=allowed?await prisma.loanApplication.findMany({where:{status:{in:["FOR_CREDIT_COMMITTEE","APPROVED","DENIED"]},...branchScope},include:{applicantProfile:true,branch:true,loanOfficer:true,scorecard:true,committeeReviews:{include:{reviewer:true,creditCommittee:true},orderBy:[{approvalSequence:"asc"},{createdAt:"asc"}]}},orderBy:{updatedAt:"desc"}}):[];
  const approvers=allowed?await prisma.user.findMany({where:{status:"ACTIVE",role:{in:["SUPER_ADMIN","HEAD_OFFICE_ADMIN","HEAD_OFFICE_CREDIT_COMMITTEE","BRANCH_TEAM_LEADER","AREA_TEAM_LEADER"]}},select:{id:true,fullName:true,role:true},orderBy:{id:"asc"}}):[];
  return <AppShell user={user}><PageHeader title="Credit Committee" description="Review endorsed loan records and complete the configured sequential approvals." />{!allowed?<div className="panel p-4 text-sm text-slate-600">Your role is not assigned to Credit Committee review.</div>:<ApprovalDashboard loans={JSON.parse(JSON.stringify(loans))} approvers={approvers} canAssign={canManageSetup(user)} currentUserId={user.id}/>}</AppShell>;
}
