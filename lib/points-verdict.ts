import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { award } from "@/lib/points/award";

/** Bonus for a ✗ that caught a real regression. */
export const REGRESSION_CAUGHT_BONUS = 200;
/** Bonus for answering a decision card that was blocking an agent. */
export const CARD_ANSWER_BLOCKING_BONUS = 150;

/** Records how a verdict turned out so points can be weighted by whether it
 * held up. Created when the first verdict lands. */
export async function ensureVerdictOutcome(
  testVerdictId: string,
  userId: string,
  bugId: string,
): Promise<void> {
  await prisma.verdictOutcome.upsert({
    where: { testVerdictId },
    update: {},
    create: { testVerdictId, userId, bugId, heldUp: true },
  });
}

/** Mark a verdict as no longer holding up (a reversal). Removes the points
 * the original call earned via a negative correction ledger row. */
export async function markVerdictReversed(testVerdictId: string): Promise<boolean> {
  const outcome = await prisma.verdictOutcome.update({
    where: { testVerdictId },
    data: { heldUp: false },
    select: { id: true, userId: true, bugId: true },
  });
  const bug = await prisma.bug.findUnique({
    where: { id: outcome.bugId },
    select: { tenantId: true },
  });
  if (!bug) return false;
  await award(prisma as unknown as Prisma.TransactionClient, {
    tenantId: bug.tenantId,
    userId: outcome.userId,
    bugId: outcome.bugId,
    role: "reviewer",
    points: -300,
    sourceKey: `verdict-reversed:${testVerdictId}`,
  });
  return true;
}

/** Pay the regression-caught bonus once, idempotently. */
export async function awardRegressionBonus(testVerdictId: string): Promise<boolean> {
  const outcome = await prisma.verdictOutcome.findUnique({
    where: { testVerdictId },
    select: { id: true, userId: true, bugId: true, regressionPaid: true },
  });
  if (!outcome || outcome.regressionPaid) return false;
  const bug = await prisma.bug.findUnique({
    where: { id: outcome.bugId },
    select: { tenantId: true },
  });
  if (!bug) return false;
  await prisma.verdictOutcome.update({ where: { testVerdictId }, data: { regressionPaid: true } });
  await award(prisma as unknown as Prisma.TransactionClient, {
    tenantId: bug.tenantId,
    userId: outcome.userId,
    bugId: outcome.bugId,
    role: "reviewer",
    points: REGRESSION_CAUGHT_BONUS,
    sourceKey: `verdict-regression:${testVerdictId}`,
  });
  return true;
}

/** Pay the bonus for answering a card that was blocking an agent, once. */
export async function awardCardAnswerBonus(cardId: string, userId: string, tenantId: string): Promise<boolean> {
  const card = await prisma.decisionCard.findUnique({
    where: { id: cardId },
    select: { id: true, bugId: true },
  });
  if (!card || !card.bugId) return false;
  await award(prisma as unknown as Prisma.TransactionClient, {
    tenantId,
    userId,
    bugId: card.bugId,
    role: "reviewer",
    points: CARD_ANSWER_BLOCKING_BONUS,
    sourceKey: `card-answer-blocking:${cardId}:${userId}`,
  });
  return true;
}
