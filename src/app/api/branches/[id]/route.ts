import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const schema=z.object({branchCode:z.string().trim().min(1).optional(),branchName:z.string().trim().min(1).optional(),branchAddress:z.string().optional(),isHeadOffice:z.boolean().optional(),status:z.enum(["ACTIVE","INACTIVE"]).optional()});
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const actor=await requireUser();if(!canManageSetup(actor))return NextResponse.json({error:"Forbidden"},{status:403});const id=Number((await params).id);return NextResponse.json(await prisma.branch.update({where:{id},data:schema.parse(await request.json())}));}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){const actor=await requireUser();if(!canManageSetup(actor))return NextResponse.json({error:"Forbidden"},{status:403});const id=Number((await params).id);const [users,loans]=await Promise.all([prisma.user.count({where:{branchId:id}}),prisma.loanApplication.count({where:{branchId:id}})]);if(users||loans)return NextResponse.json({error:"This branch has users or loans. Deactivate it instead."},{status:409});await prisma.branch.delete({where:{id}});return NextResponse.json({ok:true});}
