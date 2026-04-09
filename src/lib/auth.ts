import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export interface SessionData {
  userId: string;
  username: string;
  displayName: string;
  role: "admin" | "executive" | "viewer";
  isLoggedIn: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "change-this-to-a-random-32-char-string-now",
  cookieName: "bess-session",
  cookieOptions: {
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function authenticate(
  username: string,
  password: string
): Promise<{ id: string; username: string; displayName: string; role: "admin" | "executive" | "viewer" } | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return null;

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return null;

  // v4 backward compat: legacy 'viewer' role normalized to 'executive'
  const normalizedRole = user.role === "viewer" ? "executive" : user.role;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: normalizedRole as "admin" | "executive" | "viewer",
  };
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }
  return session as unknown as SessionData;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireExecutive(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== "executive") {
    throw new Error("Forbidden");
  }
  return session;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
