import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** How long a presence lease lasts before the agent is treated as idle. */
export const PRESENCE_LEASE_MINUTES = 15;

export const PRESENCE_STATES = [
  "claiming",
  "planning",
  "working",
  "waiting_on_ci",
  "blocked_on_you",
  "idle",
] as const;

export const setPresenceSchema = z.object({
  state: z.enum(PRESENCE_STATES).optional(),
  detail: z.string().trim().max(300).optional(),
  bugId: z.string().trim().min(1).optional(),
  ttlMinutes: z.number().int().min(1).max(43200).optional(),
});

export type PresenceUpdate = z.infer<typeof setPresenceSchema>;

export type PresenceSummary = {
  agentId: string;
  agentName: string;
  state: string;
  detail: string | null;
  bugId: string | null;
  live: boolean;
  leaseExpiresAt: Date | null;
};

/** Upsert an agent's presence and (re)start its lease. Called on heartbeat
 * and whenever the agent reports what it is doing. */
export async function upsertPresence(
  agentId: string,
  agentName: string,
  update: PresenceUpdate,
): Promise<void> {
  const ttlMinutes = update.ttlMinutes ?? PRESENCE_LEASE_MINUTES;
  const leaseExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const state = update.state ?? "idle";
  await prisma.agentPresence.upsert({
    where: { agentId },
    update: {
      state,
      detail: update.detail ?? null,
      bugId: update.bugId ?? null,
      leaseExpiresAt,
      lastHeartbeatAt: new Date(),
    },
    create: {
      agentId,
      state,
      detail: update.detail ?? null,
      bugId: update.bugId ?? null,
      leaseExpiresAt,
      lastHeartbeatAt: new Date(),
    },
  });
}

/** Renew an existing presence lease without changing its state. Used by the
 * claim heartbeat so a working agent stays live. */
export async function renewPresenceLease(agentId: string, ttlMinutes = PRESENCE_LEASE_MINUTES): Promise<void> {
  await prisma.agentPresence.updateMany({
    where: { agentId },
    data: {
      leaseExpiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      lastHeartbeatAt: new Date(),
    },
  });
}

/** All live presences in a tenant. A presence is live while its lease hasn't
 * lapsed; a lapsed lease means the agent is treated as idle. */
export async function listLivePresences(
  tenantId: string,
  bugId?: string,
): Promise<PresenceSummary[]> {
  const now = new Date();
  const rows = await prisma.agentPresence.findMany({
    where: {
      agent: { tenantId },
      ...(bugId ? { bugId } : {}),
      leaseExpiresAt: { gt: now },
    },
    include: { agent: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    agentId: r.agentId,
    agentName: r.agent.name,
    state: r.state,
    detail: r.detail,
    bugId: r.bugId,
    live: true,
    leaseExpiresAt: r.leaseExpiresAt,
  }));
}

/** Presence for one agent, null when absent or lapsed. */
export async function getPresence(agentId: string): Promise<PresenceSummary | null> {
  const now = new Date();
  const r = await prisma.agentPresence.findUnique({
    where: { agentId },
    include: { agent: { select: { name: true } } },
  });
  if (!r || r.leaseExpiresAt.getTime() <= now.getTime()) return null;
  return {
    agentId: r.agentId,
    agentName: r.agent.name,
    state: r.state,
    detail: r.detail,
    bugId: r.bugId,
    live: true,
    leaseExpiresAt: r.leaseExpiresAt,
  };
}
