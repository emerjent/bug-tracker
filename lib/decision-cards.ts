import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/agent-api/events";

/** A decision card must offer two or three options. */
export const OPTION_COUNT_MIN = 2;
export const OPTION_COUNT_MAX = 3;
/** Default decision timer: four hours, so "blocked forever" becomes "blocked at most four hours." */
export const DEFAULT_TIMER_MINUTES = 240;

export const decisionCardOptionsSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(120),
      value: z.string().trim().min(1).max(120),
    }),
  )
  .min(OPTION_COUNT_MIN, "A decision card needs two or three options.")
  .max(OPTION_COUNT_MAX, "A decision card needs two or three options.");

export const createDecisionCardSchema = z.object({
  projectId: z.string().trim().min(1),
  bugId: z.string().trim().min(1).optional(),
  question: z.string().trim().min(1).max(2000),
  options: decisionCardOptionsSchema,
  recommendation: z.number().int().min(0).max(2).optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  tried: z.string().trim().max(4000).optional(),
  costSoFar: z.number().int().min(0).optional(),
  defaultAnswer: z.string().trim().max(2000).optional(),
  defaultTimerMinutes: z.number().int().min(1).max(43200).optional(),
});

export type CreateDecisionCardInput = z.infer<typeof createDecisionCardSchema>;

export type DecisionCardSummary = {
  id: string;
  bugId: string | null;
  bugNumber: number | null;
  question: string;
  options: Array<{ label: string; value: string }>;
  recommendation: number | null;
  confidence: number | null;
  tried: string | null;
  costSoFar: number | null;
  defaultAnswer: string | null;
  defaultTimerMinutes: number;
  expiresAt: Date | null;
  status: string;
  createdAt: Date;
  ttlSeconds: number;
  blockedByCount: number;
};

async function publishCard(
  tenantId: string,
  type: string,
  payload: Prisma.InputJsonObject,
  bugId: string | null,
  actorAgentId: string | null,
) {
  await publish(prisma, {
    tenantId,
    type,
    payload,
    actorAgentId,
    bugId,
  }).catch(() => null);
}

/** Create a decision card. The agent asks its owner a structured question. */
export async function createDecisionCard(
  agentId: string,
  ownerUserId: string,
  tenantId: string,
  input: CreateDecisionCardInput,
): Promise<
  | { id: string }
  | { status: 400; error: string; message: string }
> {
  const parsed = createDecisionCardSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: 400,
      error: "invalid_request",
      message: issue?.message ?? "Invalid decision card.",
    };
  }
  const body = parsed.data;

  let expiresAt: Date | null = null;
  const timerMinutes = body.defaultTimerMinutes ?? DEFAULT_TIMER_MINUTES;
  if (body.defaultAnswer) {
    expiresAt = new Date(Date.now() + timerMinutes * 60 * 1000);
  }

  let bug: { id: string; number: number; tenantId: string } | null = null;
  if (body.bugId) {
    bug = await prisma.bug.findUnique({
      where: { id: body.bugId, tenantId, isDeleted: false },
      select: { id: true, number: true, tenantId: true },
    });
    if (!bug) {
      return { status: 400, error: "invalid_request", message: "No such issue in this tenant." };
    }
  }

  const card = await prisma.decisionCard.create({
    data: {
      agentId,
      ownerUserId,
      bugId: body.bugId ?? null,
      question: body.question,
      options: body.options as unknown as Prisma.InputJsonObject,
      recommendation: body.recommendation ?? null,
      confidence: body.confidence ?? null,
      tried: body.tried ?? null,
      costSoFar: body.costSoFar ?? null,
      defaultAnswer: body.defaultAnswer ?? null,
      defaultTimerMinutes: timerMinutes,
      expiresAt,
    },
    select: { id: true },
  });

  if (bug) {
    await publishCard(tenantId, "decision_card.created", {
      issueId: bug.id,
      cardId: card.id,
      question: body.question,
    } as Prisma.InputJsonObject, bug.id, agentId);
  }

  return { id: card.id };
}

/** Answer a decision card. Writes the answer back as a typed comment on the issue. */
export const answerDecisionCardSchema = z.object({
  cardId: z.string().trim().min(1),
  answer: z.string().trim().min(1).max(2000),
});

export async function answerDecisionCard(
  ownerUserId: string,
  rawBody: unknown,
): Promise<
  | { status: 200; cardId: string; bugId: string | null; answer: string }
  | { status: 400; error: string; message: string }
  | { status: 403; error: string; message: string }
  | { status: 404; error: string; message: string }
  | { status: 409; error: string; message: string }
> {
  const parsed = answerDecisionCardSchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: 400, error: "invalid_request", message: issue?.message ?? "Invalid answer." };
  }
  const { cardId, answer } = parsed.data;

  const card = await prisma.decisionCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      bugId: true,
      question: true,
      options: true,
      defaultAnswer: true,
      expiresAt: true,
      agentId: true,
    },
  });
  if (!card) return { status: 404, error: "not_found", message: "No such decision card." };
  if (card.ownerUserId !== ownerUserId) {
    return { status: 403, error: "not_found", message: "No such decision card." };
  }
  if (card.status !== "open") {
    return { status: 409, error: "already_answered", message: "This decision card has already been answered." };
  }

  const now = new Date();
  if (card.expiresAt && card.expiresAt.getTime() <= now.getTime()) {
    await prisma.decisionCard.update({
      where: { id: cardId },
      data: {
        status: "expired",
        answer: card.defaultAnswer ?? null,
        answeredAt: now,
        answeredById: ownerUserId,
      },
    });
    return {
      status: 409,
      error: "expired",
      message: "The decision timer expired; the default answer was applied.",
    };
  }

  const updated = await prisma.decisionCard.update({
    where: { id: cardId },
    data: {
      status: "answered",
      answer,
      answeredAt: now,
      answeredById: ownerUserId,
    },
    select: { id: true, bugId: true, agentId: true, question: true },
  });

  if (updated.bugId) {
    const options = (card.options as Array<{ label: string; value: string }> | null) ?? [];
    const optionLabel = options.find((o) => o.value === answer)?.label;
    const bodyText = optionLabel
      ? `Answered decision card “${card.question}”: ${optionLabel}`
      : `Answered decision card “${card.question}”: ${answer}`;
    await prisma.comment.create({
      data: { bugId: updated.bugId, authorId: ownerUserId, body: bodyText, type: "comment" },
    });
    await publishCard(card.agentId ? "" : "", "decision_card.answered", {
      issueId: updated.bugId,
      cardId: updated.id,
      answer,
    } as Prisma.InputJsonObject, updated.bugId, null);
  }

  return { status: 200, cardId: updated.id, bugId: updated.bugId, answer };
}

/** List the decision-card queue for an owner, sorted by blocked work (not age). */
export async function listDecisionCardQueue(
  ownerUserId: string,
): Promise<DecisionCardSummary[]> {
  const cards = await prisma.decisionCard.findMany({
    where: { ownerUserId, status: "open" },
    select: {
      id: true,
      bugId: true,
      question: true,
      options: true,
      recommendation: true,
      confidence: true,
      tried: true,
      costSoFar: true,
      defaultAnswer: true,
      defaultTimerMinutes: true,
      expiresAt: true,
      status: true,
      createdAt: true,
      bug: { select: { number: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const now = Date.now();
  const summaries: DecisionCardSummary[] = await Promise.all(
    cards.map(async (card) => {
      const ttlSeconds = card.expiresAt ? Math.max(0, Math.floor((card.expiresAt.getTime() - now) / 1000)) : 0;
      let blockedByCount = 0;
      if (card.bugId) {
        const [claims, verdicts] = await Promise.all([
          prisma.issueClaim.count({
            where: { bugId: card.bugId, status: "active", releasedAt: null },
          }),
          prisma.testVerdict.count({ where: { bugId: card.bugId } }),
        ]);
        blockedByCount = claims + verdicts;
      }
      return {
        id: card.id,
        bugId: card.bugId,
        bugNumber: card.bug?.number ?? null,
        question: card.question,
        options: (card.options as Array<{ label: string; value: string }>) ?? [],
        recommendation: card.recommendation,
        confidence: card.confidence,
        tried: card.tried,
        costSoFar: card.costSoFar,
        defaultAnswer: card.defaultAnswer,
        defaultTimerMinutes: card.defaultTimerMinutes,
        expiresAt: card.expiresAt,
        status: card.status,
        createdAt: card.createdAt,
        ttlSeconds,
        blockedByCount,
      };
    }),
  );

  summaries.sort((a, b) => {
    if (b.blockedByCount !== a.blockedByCount) return b.blockedByCount - a.blockedByCount;
    if (a.ttlSeconds > 0 && b.ttlSeconds > 0 && a.ttlSeconds !== b.ttlSeconds)
      return a.ttlSeconds - b.ttlSeconds;
    if ((b.costSoFar ?? 0) !== (a.costSoFar ?? 0)) return (b.costSoFar ?? 0) - (a.costSoFar ?? 0);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return summaries;
}
