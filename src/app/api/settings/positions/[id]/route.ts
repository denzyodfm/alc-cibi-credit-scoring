import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const roles=["SUPER_ADMIN","HEAD_OFFICE_ADMIN","ACCOUNT_ASSISTANT","HEAD_OFFICE_CREDIT_COMMITTEE","AREA_TEAM_LEADER","BRANCH_TEAM_LEADER","ACCOUNT_OFFICER","CASHIER","BOOKKEEPER","VIEWER"] as const;
const schema=z.object({name:z.string().trim().min(1).max(120).optional(),systemRole:z.enum(roles).optional(),isActive:z.boolean().optional()});
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const actor=await requireUser();if(!canManageSetup(actor))return NextResponse.json({error:"Forbidden"},{status:403});const id=Number((await params).id);const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return badRequest(parsed.error);return NextResponse.json(await prisma.position.update({where:{id},data:parsed.data}));}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){const actor=await requireUser();if(!canManageSetup(actor))return NextResponse.json({error:"Forbidden"},{status:403});const id=Number((await params).id);const used=await prisma.user.count({where:{positionId:id}});if(used)return NextResponse.json({error:"This position is assigned to users. Reassign them first."},{status:409});await prisma.position.delete({where:{id}});return NextResponse.json({ok:true});}
