import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export interface SessionData {
  username: string;
  role: "admin" | "viewer";
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
): Promise<{ username: string; role: "admin" | "viewer" } | null> {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const viewerUser = process.env.VIEWER_USERNAME;
  const viewerPass = process.env.VIEWER_PASSWORD;

  if (username === adminUser && adminPass && bcrypt.compareSync(password, adminPass)) {
    return { username, role: "admin" };
  }

  if (username === viewerUser && viewerPass && bcrypt.compareSync(password, viewerPass)) {
    return { username, role: "viewer" };
  }

  return null;
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
