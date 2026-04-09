/**
 * Pure function for v4 role-based routing.
 * Returns the redirect target path, or null if no redirect needed.
 *
 * Used by middleware.ts to enforce role-based view boundaries:
 * - admin sees /dashboard and /projects/[id]
 * - executive sees /executive and /projects/[id]/report
 *
 * Legacy 'viewer' role is normalized to 'executive' before this function is called.
 */
export function resolveRoleRedirect(
  pathname: string,
  role: "admin" | "executive" | "viewer"
): string | null {
  // Normalize legacy viewer → executive (defensive; auth.ts also does this)
  const effectiveRole = role === "viewer" ? "executive" : role;

  if (effectiveRole === "executive") {
    if (pathname === "/dashboard" || pathname === "/") {
      return "/executive";
    }
    // /projects/[id] (without /report) → /projects/[id]/report
    const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectMatch) {
      return `/projects/${projectMatch[1]}/report`;
    }
  }

  if (effectiveRole === "admin") {
    if (pathname === "/executive") {
      return "/dashboard";
    }
    // /projects/[id]/report → /projects/[id]
    const reportMatch = pathname.match(/^\/projects\/([^/]+)\/report$/);
    if (reportMatch) {
      return `/projects/${reportMatch[1]}`;
    }
  }

  return null;
}
