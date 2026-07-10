import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: number;
  action: string;
  entityType: string;
  entityId: string | number;
  oldValue?: unknown;
  newValue?: unknown;
};

export async function audit(input: AuditInput) {
  const h = await headers();
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: String(input.entityId),
      oldValue: input.oldValue === undefined ? undefined : (input.oldValue as object),
      newValue: input.newValue === undefined ? undefined : (input.newValue as object),
      ipAddress: h.get("x-forwarded-for")?.split(",")[0] ?? null,
      userAgent: h.get("user-agent")
    }
  });
}
