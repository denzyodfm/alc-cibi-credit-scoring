import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roles = ["SUPER_ADMIN","HEAD_OFFICE_ADMIN","ACCOUNT_ASSISTANT","HEAD_OFFICE_CREDIT_COMMITTEE","AREA_TEAM_LEADER","BRANCH_TEAM_LEADER","ACCOUNT_OFFICER","CASHIER","BOOKKEEPER","VIEWER"] as const;
const schema = z.object({ name: z.string().trim().min(1).max(120), systemRole: z.enum(roles) });
export async function POST(request:Request){const actor=await requireUser();if(!canManageSetup(actor))return NextResponse.json({error:"Forbidden"},{status:403});const data=schema.parse(await request.json());const item=await prisma.position.create({data});return NextResponse.json(item);}
