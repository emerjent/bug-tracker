import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAgent: vi.fn(),
  budget: vi.fn(),
  releaseClaim: vi.fn(),
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

vi.mock("@/lib/agent-api/offer", async (original) => ({
  ...(await original<typeof import("@/lib/agent-api/offer")>()),
  releaseClaim: mocks.releaseClaim,
}));

const db = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  agentAuditEvent: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST } from "./route";

const agent = {
  agentId: "a1",
  name: "test-agent",
  ownerId: "o1",
  tenantId: "tenant-1",
  level: "working" as const,
  burst: false,
  keyId: "k1",
};

const params = { params: Promise.resolve({ id: "bug-1" }) };

function releaseRequest(body?: string, search = "?projectId=proj-1") {
  return new NextRequest(`http://localhost/api/v1/issues/bug-1/release${search}`, {
    method: "POST",
    headers: {
      authorization: "Bearer test-key",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body }),
  });
}

describe("POST /api/v1/issues/[id]/release (#565)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAgent.mockResolvedValue(agent);
    mocks.budget.mockResolvedValue({ allowed: true });
    mocks.releaseClaim.mockResolvedValue({
      claimId: "claim-1",
      issueId: "bug-1",
      reason: "agent",
      reopened: true,
      reofferedTo: null,
    });
    db.project.findFirst.mockResolvedValue({ id: "proj-1" });
    db.agentAuditEvent.create.mockResolvedValue({});
  });

  it("rejects malformed JSON with 400 and releases nothing", async () => {
    const res = await POST(releaseRequest('{"reason":"waiting on infra"'), params);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Send a valid JSON body." });
    expect(mocks.releaseClaim).not.toHaveBeenCalled();
    expect(db.project.findFirst).not.toHaveBeenCalled();
  });

  it("still releases when the body is truly empty", async () => {
    const res = await POST(releaseRequest(), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ claimId: "claim-1", reason: "agent" });
    expect(mocks.releaseClaim).toHaveBeenCalledWith(agent, "proj-1", "bug-1", undefined);
  });

  it("treats a whitespace-only body as empty", async () => {
    const res = await POST(releaseRequest("   \n\t"), params);

    expect(res.status).toBe(200);
    expect(mocks.releaseClaim).toHaveBeenCalledWith(agent, "proj-1", "bug-1", undefined);
  });

  it("keeps a valid reason and body projectId", async () => {
    const res = await POST(
      releaseRequest(JSON.stringify({ projectId: "proj-1", reason: "waiting on infra" }), ""),
      params,
    );

    expect(res.status).toBe(200);
    expect(mocks.releaseClaim).toHaveBeenCalledWith(agent, "proj-1", "bug-1", "waiting on infra");
  });
});
