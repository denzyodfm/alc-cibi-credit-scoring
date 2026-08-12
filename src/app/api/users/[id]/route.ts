import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const schema=z.object({employeeNo:z.string().min(1),fullName:z.string().min(1),email:z.string().email(),username:z.string().min(3),branchId:z.coerce.number().int().positive(),positionId:z.coerce.number().int().positive(),status:z.enum(["ACTIVE","INACTIVE"]).optional()});
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const actor=await requireUser();if(!canManageSetup(actor))return NextResponse.json({error:"Forbidden"},{status:403});const id=Number((await params).id);const data=schema.parse(await request.json());const position=await prisma.position.findFirstOrThrow({where:{id:data.positionId,isActive:true}});const updated=await prisma.user.update({where:{id},data:{...data,role:position.systemRole}});return NextResponse.json({id:updated.id});}
