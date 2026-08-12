import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "alc_cibi_session";

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  branchId: number;
  branchCode: string;
  branchName: string;
  isHeadOffice: boolean;
};

function secret() {
  return process.env.SESSION_SECRET || "dev-only-change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(userId: number) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 10 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: number; exp: number };
    if (!decoded.userId || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { branch: true }
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    branchId: user.branchId,
    branchCode: user.branch.branchCode,
    branchName: user.branch.branchName,
    isHeadOffice: user.branch.isHeadOffice
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 10
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function canAccessAllBranches(user: Pick<SessionUser, "role" | "isHeadOffice">) {
  return (
    user.role === "SUPER_ADMIN" ||
    user.role === "HEAD_OFFICE_ADMIN" ||
    user.role === "HEAD_OFFICE_CREDIT_COMMITTEE" ||
    user.isHeadOffice
  );
}

export function canAccessBranch(user: SessionUser, branchId: number) {
  return canAccessAllBranches(user) || user.branchId === branchId;
}

export function canManageSetup(user: SessionUser) {
  return user.role === "SUPER_ADMIN" || user.role === "HEAD_OFFICE_ADMIN";
}

export function canEndorseCredit(user: SessionUser) {
  return user.role === "ACCOUNT_ASSISTANT" || canManageSetup(user);
}

export function canReviewCredit(user: SessionUser) {
  return (
    user.role === "SUPER_ADMIN" ||
    user.role === "HEAD_OFFICE_ADMIN" ||
    user.role === "HEAD_OFFICE_CREDIT_COMMITTEE" ||
    user.role === "BOOKKEEPER" ||
    user.role === "BRANCH_TEAM_LEADER" ||
    user.role === "AREA_TEAM_LEADER"
  );
}

export function isCommitteeAdministrator(user: SessionUser) {
  return user.role === "SUPER_ADMIN" || user.role === "HEAD_OFFICE_ADMIN";
}

export function isCommitteeParticipant(user: SessionUser) {
  return ["BOOKKEEPER", "BRANCH_TEAM_LEADER", "AREA_TEAM_LEADER", "HEAD_OFFICE_CREDIT_COMMITTEE"].includes(user.role);
}
