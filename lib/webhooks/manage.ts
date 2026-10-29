import type { Prisma, PrismaClient } from "@prisma/client";
import { AGENT_EVENT_TYPES } from "@/lib/agent-api/events";

/**
 * Webhook subscription limits (#512).
 *
 * Each subscription can multiply outbound traffic, so an agent may keep at
 * most `MAX_SUBSCRIPTIONS_PER_AGENT` of them, the same URL only once, and may
 * narrow deliveries to some event types (`events`; empty means every event).
 */

export const MAX_SUBSCRIPTIONS_PER_AGENT = 3;

type Db = PrismaClient | Prisma.TransactionClient;

export type SubscribedWebhook = {
  id: string;
  url: string;
  enabled: boolean;
  createdAt: Date;
  events: string[];
};

export type CreateSubscriptionResult =
  | { ok: true; subscription: SubscribedWebhook }
  | { ok: false; status: 409; error: string };

/** Trim, drop blanks and duplicate event names. `[]` means "all events". */
export function normalizeSubscriptionEvents(events: readonly string[] | undefined): string[] {
  if (!events) return [];
  return [...new Set(events.map((event) => event.trim()).filter(Boolean))];
}

/** The event names a subscription may narrow to; delivery matches them exactly (#500). */
export const SUBSCRIBABLE_EVENT_TYPES: readonly string[] = AGENT_EVENT_TYPES;

/**
 * Event names in `events` that no publisher emits (#500). A subscription
 * stores exact names and delivery only sends an event whose type is in the
 * list, so an unknown name is not a harmless typo: it silently receives
 * nothing. The route refuses these instead of storing them.
 */
export function unknownSubscriptionEvents(events: readonly string[] | undefined): string[] {
  if (!events) return [];
  const known = new Set(SUBSCRIBABLE_EVENT_TYPES);
  return [...new Set(events.map((event) => event.trim()).filter((event) => event && !known.has(event)))];
}

export async function createSubscriptionRecord(
  db: Db,
  params: {
    agentId: string;
    url: string;
    events: string[];
    signingSecretEncrypted: string;
  },
): Promise<CreateSubscriptionResult> {
  const [existingCount, duplicate] = await Promise.all([
    db.webhookSubscription.count({ where: { agentId: params.agentId } }),
    db.webhookSubscription.findFirst({
      where: { agentId: params.agentId, url: params.url },
      select: { id: true },
    }),
  ]);
  if (duplicate) {
    return { ok: false, status: 409, error: "That URL is already subscribed for this agent." };
  }
  if (existingCount >= MAX_SUBSCRIPTIONS_PER_AGENT) {
    return {
      ok: false,
      status: 409,
      error: `An agent can have at most ${MAX_SUBSCRIPTIONS_PER_AGENT} webhook subscriptions. Delete one first.`,
    };
  }

  const subscription = await db.webhookSubscription.create({
    data: {
      agentId: params.agentId,
      url: params.url,
      events: params.events,
      signingSecretEncrypted: params.signingSecretEncrypted,
    },
    select: { id: true, url: true, enabled: true, createdAt: true, events: true },
  });
  return { ok: true, subscription };
}
