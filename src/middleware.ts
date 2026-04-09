import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { resolveRoleRedirect } from "@/lib/routing-rules";

interface SessionData {
  username: string;
  role: "admin" | "executive" | "viewer";
  isLoggedIn: boolean;
}

const publicPaths = ["/login", "/api/auth/login"];
const writeMethodsForReadOnly = ["POST", "PUT", "PATCH", "DELETE"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, {
    password: process.env.SESSION_SECRET || "change-this-to-a-random-32-char-string-now",
    cookieName: "bess-session",
  });

  if (!session.isLoggedIn) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // v4 backward compat: legacy 'viewer' role normalized to 'executive'
  // (handles deployment window where DB UPDATE hasn't run yet)
  const effectiveRole = session.role === "viewer" ? "executive" : session.role;

  // v4 role-based routing enforcement (page routes only, not API)
  if (!pathname.startsWith("/api/")) {
    const redirectTo = resolveRoleRedirect(pathname, effectiveRole);
    if (redirectTo) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  // Read-only roles (executive, viewer) cannot use write methods on API
  // Note: viewer here is the legacy DB value; effectiveRole has already normalized it
  if (
    effectiveRole !== "admin" &&
    writeMethodsForReadOnly.includes(request.method) &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.json({ error: "无权限：只读账号" }, { status: 403 });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
