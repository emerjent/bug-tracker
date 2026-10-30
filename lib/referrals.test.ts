import { describe, expect, it, vi } from "vitest";
import {
  generateReferralCode,
  isReferralCode,
  normalizeReferralCode,
  recordReferralSignup,
  referralPath,
  referralUrl,
} from "./referrals";

describe("referral codes", () => {
  it("generates url-safe codes of the expected length", () => {
    const code = generateReferralCode();
    expect(isReferralCode(code)).toBe(true);
    expect(code).toHaveLength(10);
  });

  it("normalizes and validates codes", () => {
    expect(normalizeReferralCode("  AbC-123  ")).toBe("AbC-123");
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("has space")).toBeNull();
    expect(normalizeReferralCode(42)).toBeNull();
  });

  it("builds referral paths and urls", () => {
    expect(referralPath("abc123")).toBe("/r/abc123");
    expect(referralUrl("abc123")).toContain("/r/abc123");
  });
});

describe("recordReferralSignup", () => {
  function db(inviterId: string | null, existingInviteeReferral = false) {
    return {
      user: {
        findFirst: vi.fn(async () => (inviterId ? { id: inviterId } : null)),
      },
      referral: {
        findUnique: vi.fn(async () =>
          existingInviteeReferral ? { id: "r1", inviterId: "other" } : null,
        ),
        create: vi.fn(async () => ({ id: "new" })),
      },
    };
  }

  it("refuses an invalid code", async () => {
    const d = db("inviter-1") as never;
    const result = await recordReferralSignup(d, {
      inviteeId: "invitee-1",
      code: "bad code!",
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses an unknown code", async () => {
    const d = db(null) as never;
    const result = await recordReferralSignup(d, {
      inviteeId: "invitee-1",
      code: "unknown123",
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("prevents self-referral", async () => {
    const d = db("same-user") as never;
    const result = await recordReferralSignup(d, {
      inviteeId: "same-user",
      code: "selfcode12",
    });
    expect(result).toEqual({ ok: false, reason: "self" });
  });

  it("records a new referral", async () => {
    const d = db("inviter-1") as never;
    const result = await recordReferralSignup(d, {
      inviteeId: "invitee-1",
      code: "validcode1",
    });
    expect(result).toEqual({ ok: true, created: true });
    expect((d as any).referral.create).toHaveBeenCalled();
  });

  it("does not duplicate an existing referral", async () => {
    const d = db("inviter-1", true) as never;
    const result = await recordReferralSignup(d, {
      inviteeId: "invitee-1",
      code: "validcode1",
    });
    expect(result).toEqual({ ok: true, created: false });
    expect((d as any).referral.create).not.toHaveBeenCalled();
  });

  it("treats a unique-constraint race as already recorded", async () => {
    const d = db("inviter-1") as never;
    (d as any).referral.create.mockRejectedValueOnce({ code: "P2002" });
    const result = await recordReferralSignup(d, {
      inviteeId: "invitee-1",
      code: "validcode1",
    });
    expect(result).toEqual({ ok: true, created: false });
  });
});