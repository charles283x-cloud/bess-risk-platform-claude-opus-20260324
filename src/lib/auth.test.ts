import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to allow the mock object to be defined before vi.mock runs
const { mockSession } = vi.hoisted(() => ({
  mockSession: { isLoggedIn: false, role: "viewer", username: "", displayName: "", userId: "" },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

vi.mock("iron-session", () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { requireAuth, requireAdmin, requireExecutive } from "./auth";

describe("auth helpers", () => {
  beforeEach(() => {
    mockSession.isLoggedIn = false;
    mockSession.role = "viewer";
    mockSession.username = "";
    mockSession.displayName = "";
    mockSession.userId = "";
  });

  describe("requireAuth", () => {
    it("throws Unauthorized when not logged in", async () => {
      mockSession.isLoggedIn = false;
      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });

    it("returns session when logged in", async () => {
      mockSession.isLoggedIn = true;
      mockSession.username = "alice";
      mockSession.role = "admin";
      const result = await requireAuth();
      expect(result.username).toBe("alice");
    });
  });

  describe("requireAdmin", () => {
    it("throws Unauthorized when not logged in", async () => {
      mockSession.isLoggedIn = false;
      await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is not admin", async () => {
      mockSession.isLoggedIn = true;
      mockSession.role = "executive";
      await expect(requireAdmin()).rejects.toThrow("Forbidden");
    });

    it("passes when role is admin", async () => {
      mockSession.isLoggedIn = true;
      mockSession.role = "admin";
      const result = await requireAdmin();
      expect(result.role).toBe("admin");
    });
  });

  describe("requireExecutive", () => {
    it("throws Unauthorized when not logged in", async () => {
      mockSession.isLoggedIn = false;
      await expect(requireExecutive()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is admin", async () => {
      mockSession.isLoggedIn = true;
      mockSession.role = "admin";
      await expect(requireExecutive()).rejects.toThrow("Forbidden");
    });

    it("throws Forbidden when role is viewer (legacy, normalization happens at login not here)", async () => {
      mockSession.isLoggedIn = true;
      mockSession.role = "viewer";
      await expect(requireExecutive()).rejects.toThrow("Forbidden");
    });

    it("passes when role is executive", async () => {
      mockSession.isLoggedIn = true;
      mockSession.role = "executive";
      const result = await requireExecutive();
      expect(result.role).toBe("executive");
    });
  });
});
