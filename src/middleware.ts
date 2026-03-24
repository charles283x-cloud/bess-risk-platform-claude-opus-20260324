import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

interface SessionData {
  username: string;
  role: "admin" | "viewer";
  isLoggedIn: boolean;
}

const publicPaths = ["/login", "/api/auth/login"];
const writeMethodsForViewer = ["POST", "PUT", "PATCH", "DELETE"];

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

  // Viewer can only use GET
  if (
    session.role === "viewer" &&
    writeMethodsForViewer.includes(request.method) &&
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
