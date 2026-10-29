import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAgent: vi.fn(),
  budget: vi.fn(),
  checkSsrf: vi.fn(),
}));

vi.mock("@/lib/agents/require-agent", async (original) => ({
  ...(await original<typeof import("@/lib/agents/require-agent")>()),
  requireAgent: mocks.requireAgent,
}));

vi.mock("@/lib/agents/rate-budget", () => ({
  consumeAgentBudget: mocks.budget,
  agentBudgetExceededResponse: () =>
    new Response(JSON.stringify({ error: "Too many requests." }), { status: 429 }),
}));

vi.mock("@/lib/webhooks/ssrf", () => ({ checkSsrf: mocks.checkSsrf }));

vi.mock("@/lib/webhooks/sign", () => ({
  generateSigningSecret: () => "whsec_test",
  encryptSigningSecret: () => "cipher",
}));

const db = vi.hoisted(() => ({
  webhookSubscription: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  agentAuditEvent: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST } from "./route";

const agent = {
  agentId: "a1",
  name: "agent-1",
  ownerId: "owner-1",
  tenantId: "tenant-zedu",
  level: "working" as const,
  burst: false,
  keyId: "k1",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/webhooks", {
    method: "POST",
    headers: { authorization: "Bearer test-key", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/webhooks (#500)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAgent.mockResolvedValue(agent);
    mocks.budget.mockResolvedValue({ allowed: true });
    mocks.checkSsrf.mockResolvedValue({ ok: true });
    db.webhookSubscription.count.mockResolvedValue(0);
    db.webhookSubscription.findFirst.mockResolvedValue(null);
    db.webhookSubscription.create.mockResolvedValue({
      id: "sub-1",
      url: "https://receiver.test/hook",
      enabled: true,
      events: ["issue.created"],
      createdAt: new Date("2026-10-20T12:00:00.000Z"),
    });
    db.agentAuditEvent.create.mockResolvedValue({});
  });

  it("refuses an unknown event type and names it with the valid types", async () => {
    const res = await POST(postRequest({ url: "https://receiver.test/hook", events: ["issue.mergd"] }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("issue.mergd");
    expect(data.validTypes).toContain("issue.created");
    expect(db.webhookSubscription.create).not.toHaveBeenCalled();
    expect(mocks.checkSsrf).not.toHaveBeenCalled();
  });

  it("creates the subscription when every event type is real", async () => {
    const res = await POST(
      postRequest({ url: "https://receiver.test/hook", events: ["issue.created", "claim.offered"] }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.subscription.id).toBe("sub-1");
    expect(db.webhookSubscription.create.mock.calls[0][0].data.events).toEqual([
      "issue.created",
      "claim.offered",
    ]);
  });

  it("still accepts an omitted filter as every event", async () => {
    const res = await POST(postRequest({ url: "https://receiver.test/hook" }));

    expect(res.status).toBe(201);
    expect(db.webhookSubscription.create.mock.calls[0][0].data.events).toEqual([]);
  });
});
