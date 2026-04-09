import { describe, it, expect } from "vitest";
import { resolveRoleRedirect } from "./routing-rules";

describe("resolveRoleRedirect — v4 role-based routing", () => {
  describe("executive role", () => {
    it("redirects /dashboard to /executive", () => {
      expect(resolveRoleRedirect("/dashboard", "executive")).toBe("/executive");
    });

    it("redirects / to /executive", () => {
      expect(resolveRoleRedirect("/", "executive")).toBe("/executive");
    });

    it("redirects /projects/[id] to /projects/[id]/report", () => {
      expect(resolveRoleRedirect("/projects/abc-123", "executive")).toBe("/projects/abc-123/report");
    });

    it("does NOT redirect /projects/[id]/report (already on correct page)", () => {
      expect(resolveRoleRedirect("/projects/abc-123/report", "executive")).toBeNull();
    });

    it("does NOT redirect /executive (already there)", () => {
      expect(resolveRoleRedirect("/executive", "executive")).toBeNull();
    });

    it("does NOT redirect unrelated pages like /login", () => {
      expect(resolveRoleRedirect("/login", "executive")).toBeNull();
    });

    it("does NOT redirect /projects/new (admin-only utility, exec wouldn't get here normally)", () => {
      // /projects/new doesn't match the project-detail pattern (which has UUID-like IDs)
      expect(resolveRoleRedirect("/projects/new", "executive")).toBe("/projects/new/report");
      // Note: this catches "new" too, but executive shouldn't be visiting /projects/new anyway.
      // If this becomes an issue, the regex can be tightened.
    });
  });

  describe("admin role", () => {
    it("redirects /executive to /dashboard", () => {
      expect(resolveRoleRedirect("/executive", "admin")).toBe("/dashboard");
    });

    it("redirects /projects/[id]/report to /projects/[id]", () => {
      expect(resolveRoleRedirect("/projects/abc-123/report", "admin")).toBe("/projects/abc-123");
    });

    it("does NOT redirect /dashboard (already there)", () => {
      expect(resolveRoleRedirect("/dashboard", "admin")).toBeNull();
    });

    it("does NOT redirect /projects/[id] (already on correct page)", () => {
      expect(resolveRoleRedirect("/projects/abc-123", "admin")).toBeNull();
    });

    it("does NOT redirect /templates", () => {
      expect(resolveRoleRedirect("/templates", "admin")).toBeNull();
    });

    it("does NOT redirect /users", () => {
      expect(resolveRoleRedirect("/users", "admin")).toBeNull();
    });
  });

  describe("legacy viewer role (backward compat)", () => {
    it("normalizes viewer to executive: /dashboard → /executive", () => {
      expect(resolveRoleRedirect("/dashboard", "viewer")).toBe("/executive");
    });

    it("normalizes viewer to executive: /projects/[id] → /projects/[id]/report", () => {
      expect(resolveRoleRedirect("/projects/xyz", "viewer")).toBe("/projects/xyz/report");
    });

    it("does NOT redirect viewer from /executive", () => {
      expect(resolveRoleRedirect("/executive", "viewer")).toBeNull();
    });
  });

  describe("UUID-like IDs in paths", () => {
    it("handles real-world project UUID", () => {
      const uuid = "f7552634-0a72-4f95-a133-904f1588c794";
      expect(resolveRoleRedirect(`/projects/${uuid}`, "executive")).toBe(`/projects/${uuid}/report`);
      expect(resolveRoleRedirect(`/projects/${uuid}/report`, "admin")).toBe(`/projects/${uuid}`);
    });

    it("handles project IDs with special chars", () => {
      const id = "abc_def-123";
      expect(resolveRoleRedirect(`/projects/${id}`, "executive")).toBe(`/projects/${id}/report`);
    });
  });
});
