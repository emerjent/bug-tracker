import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { absoluteUrl } from "@/lib/site-url";

type Db = PrismaClient;

export const REFERRAL_COOKIE_NAME = "ziki_referral";
export const REFERRAL_CODE_LENGTH = 10;

/** Referral codes are short, URL-safe and case-insensitive. */
const CODE_PATTERN = /^[a-z0-9_-]{6,32}$/i;

export function isReferralCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value.trim());
}

export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isReferralCode(trimmed) ? trimmed : null;
}

export function generateReferralCode(): string {
  return randomBytes(8)
    .toString("base64url")
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, REFERRAL_CODE_LENGTH)
    .toLowerCase();
}

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function getOrCreateReferralCode(
  db: Db,
  userId: string,
): Promise<string> {
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch (error) {
      if (isUniqueError(error)) continue;
      throw error;
    }
  }
  throw new Error("Could not generate a unique referral code");
}

export function referralPath(code: string): string {
  return `/r/${encodeURIComponent(code)}`;
}

export function referralUrl(code: string): string {
  return absoluteUrl(referralPath(code));
}

export type RecordReferralResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: "invalid" | "not_found" | "self" };

/**
 * Attribute a successful sign-up to a referral code. Idempotent: an invitee
 * can only ever be recorded once, and a self-referral is refused.
 */
export async function recordReferralSignup(
  db: Db,
  input: { inviteeId: string; code: string | null | undefined },
): Promise<RecordReferralResult> {
  const code = normalizeReferralCode(input.code);
  if (!code) return { ok: false, reason: "invalid" };

  const inviter = await db.user.findFirst({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!inviter) return { ok: false, reason: "not_found" };
  if (inviter.id === input.inviteeId) return { ok: false, reason: "self" };

  const existing = await db.referral.findUnique({
    where: { inviteeId: input.inviteeId },
    select: { id: true, inviterId: true },
  });
  if (existing) {
    // Already attributed (possibly to someone else); never overwrite.
    return { ok: true, created: false };
  }

  try {
    await db.referral.create({
      data: { inviterId: inviter.id, inviteeId: input.inviteeId, code },
    });
    return { ok: true, created: true };
  } catch (error) {
    if (isUniqueError(error)) return { ok: true, created: false };
    throw error;
  }
}

export async function countReferrals(db: Db, userId: string): Promise<number> {
  return db.referral.count({ where: { inviterId: userId } });
}

export async function listReferrals(
  db: Db,
  userId: string,
): Promise<Array<{ inviteeId: string; createdAt: Date }>> {
  const rows = await db.referral.findMany({
    where: { inviterId: userId },
    select: { inviteeId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return rows;
}