import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** Autonomy steps: 0 suggest ... 4 auto_merge. */
export const AUTONOMY_STEPS = [
  "suggest",
  "draft",
  "do_with_approval",
  "do_and_report",
  "auto_merge",
] as const;
export type AutonomyStep = (typeof AUTONOMY_STEPS)[number];
export const AUTONOMY_STEP_INDEX: Record<AutonomyStep, number> = {
  suggest: 0,
  draft: 1,
  do_with_approval: 2,
  do_and_report: 3,
  auto_merge: 4,
};

/** Consecutive upheld ✓ verdicts needed to unlock each next step. */
export const STEPS_PER_UNLOCK = 3;

/** Security areas may not exceed do_with_approval (2) unless a human raises it. */
export const SECURITY_CAP_STEP = AUTONOMY_STEP_INDEX.do_with_approval;

export function stepLabel(step: number): string {
  return AUTONOMY_STEPS[Math.max(0, Math.min(4, step))] ?? "suggest";
}

export function stepIndex(step: AutonomyStep): number {
  return AUTONOMY_STEP_INDEX[step];
}

/** True when an area is the Security area, which is capped at approval. */
export function isSecurityArea(area: { name: string | null; slug: string }): boolean {
  return (
    area.slug === "security" ||
    (area.name ?? "").toLowerCase() === "security" ||
    area.slug.includes("security")
  );
}

export type AutonomyDial = {
  projectAreaId: string;
  projectAreaName: string;
  step: number;
  maxStep: number;
  verdictStreak: number;
  stepLabel: string;
  capped: boolean;
};

/** Read the autonomy dial for one agent in one area. */
export async function getAutonomyDial(
  agentId: string,
  projectAreaId: string,
): Promise<AutonomyDial | null> {
  const pref = await prisma.agentAreaPreference.findUnique({
    where: { agentId_projectAreaId: { agentId, projectAreaId } },
    include: { projectArea: { select: { name: true, slug: true } } },
  });
  if (!pref) return null;
  const maxStep = pref.maxStep;
  return {
    projectAreaId: pref.projectAreaId,
    projectAreaName: pref.projectArea.name,
    step: pref.step,
    maxStep,
    verdictStreak: pref.verdictStreak,
    stepLabel: stepLabel(pref.step),
    capped: isSecurityArea(pref.projectArea) && maxStep <= SECURITY_CAP_STEP,
  };
}

/** Read every area dial for an agent (for the settings / gear panel). */
export async function listAutonomyDials(agentId: string): Promise<AutonomyDial[]> {
  const prefs = await prisma.agentAreaPreference.findMany({
    where: { agentId },
    include: { projectArea: { select: { name: true, slug: true } } },
    orderBy: { projectArea: { name: "asc" } },
  });
  return prefs.map((pref) => ({
    projectAreaId: pref.projectAreaId,
    projectAreaName: pref.projectArea.name,
    step: pref.step,
    maxStep: pref.maxStep,
    verdictStreak: pref.verdictStreak,
    stepLabel: stepLabel(pref.step),
    capped: isSecurityArea(pref.projectArea) && pref.maxStep <= SECURITY_CAP_STEP,
  }));
}

/** The highest step an agent may use in an area, given its streak and cap. */
export function earnedStep(
  verdictStreak: number,
  maxStep: number,
  securityCapped: boolean,
): number {
  const earned = Math.min(4, Math.floor(verdictStreak / STEPS_PER_UNLOCK));
  let cap = maxStep;
  if (securityCapped) cap = Math.min(cap, SECURITY_CAP_STEP);
  return Math.max(0, Math.min(earned, cap));
}

const setAutonomySchema = z.object({
  projectAreaId: z.string().trim().min(1),
  step: z.number().int().min(0).max(4),
});

/** A human sets the autonomy step for an agent in an area (the gear icon).
 * Security stays capped at approval unless explicitly raised above 2. */
export async function setAutonomyStep(
  agentId: string,
  projectAreaId: string,
  step: number,
  _actingUserId: string,
): Promise<{ ok: boolean; step: number; capped?: boolean } | { status: 400; error: string }> {
  const parsed = setAutonomySchema.safeParse({ projectAreaId, step });
  if (!parsed.success) return { status: 400, error: "Invalid step." };
  const desired = parsed.data.step;

  const pref = await prisma.agentAreaPreference.findUnique({
    where: { agentId_projectAreaId: { agentId, projectAreaId } },
    include: { projectArea: { select: { name: true, slug: true } } },
  });
  if (!pref) return { status: 400, error: "No autonomy dial for this agent/area." };

  let maxStep = pref.maxStep;
  if (isSecurityArea(pref.projectArea) && desired > SECURITY_CAP_STEP && maxStep <= SECURITY_CAP_STEP) {
    // Security stays capped at approval unless a human raises the ceiling.
    return { status: 400, error: "Security is capped at approval unless a human raises the ceiling." };
  }
  if (desired > maxStep) maxStep = desired;

  const updated = await prisma.agentAreaPreference.update({
    where: { agentId_projectAreaId: { agentId, projectAreaId } },
    data: { step: desired, maxStep },
    select: { step: true, maxStep: true },
  });
  return { ok: true, step: updated.step, capped: isSecurityArea(pref.projectArea) };
}

/** Record a verdict's effect on the autonomy streak. A reversal resets the
 * streak; an upheld ✓ builds it. When the streak unlocks a step, step rises
 * toward maxStep. */
export async function recordVerdictOutcome(
  agentId: string,
  projectAreaId: string,
  goodToMerge: boolean,
  upheld: boolean,
): Promise<void> {
  const pref = await prisma.agentAreaPreference.findUnique({
    where: { agentId_projectAreaId: { agentId, projectAreaId } },
    select: { step: true, maxStep: true, verdictStreak: true },
  });
  if (!pref) return;

  let streak = upheld ? pref.verdictStreak + 1 : 0;
  // A reversal breaks the streak entirely.
  if (!upheld) streak = 0;

  let step = pref.step;
  const earned = earnedStep(streak, pref.maxStep, false);
  step = earned;

  await prisma.agentAreaPreference.update({
    where: { agentId_projectAreaId: { agentId, projectAreaId } },
    data: { verdictStreak: streak, step, streakChangedAt: new Date() },
  });
}
