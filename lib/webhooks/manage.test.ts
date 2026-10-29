import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSubscriptionRecord, MAX_SUBSCRIPTIONS_PER_AGENT, normalizeSubscriptionEvents, SUBSCRIBABLE_EVENT_TYPES, unknownSubscriptionEvents } from "./manage";

const db = {
  webhookSubscription: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
};

const input = {
  agentId: "agent-a",
  url: "https://receiver.test/hook",
  events: ["issue.created"],
  signingSecretEncrypted: "cipher",
};

beforeEach(() => {
  vi.resetAllMocks();
  db.webhookSubscription.count.mockResolvedValue(0);
  db.webhookSubscription.findFirst.mockResolvedValue(null);
  db.webhookSubscription.create.mockResolvedValue({
    id: "sub-a",
    url: input.url,
    enabled: true,
    createdAt: new Date(0),
    events: input.events,
  });
});

describe("webhook subscription limits (#512)", () => {
  it("refuses the fourth subscription for one agent", async () => {
    db.webhookSubscription.count.mockResolvedValue(MAX_SUBSCRIPTIONS_PER_AGENT);
    const result = await createSubscriptionRecord(db as never, input);
    expect(result).toMatchObject({ ok: false, status: 409 });
    if (!result.ok) expect(result.error).toContain("at most 3");
    expect(db.webhookSubscription.create).not.toHaveBeenCalled();
  });

  it("refuses the same URL twice for one agent", async () => {
    db.webhookSubscription.findFirst.mockResolvedValue({ id: "sub-a" });
    const result = await createSubscriptionRecord(db as never, input);
    expect(result).toMatchObject({ ok: false, status: 409 });
    if (!result.ok) expect(result.error).toContain("already subscribed");
    expect(db.webhookSubscription.create).not.toHaveBeenCalled();
  });

  it("stores the event filter with the subscription", async () => {
    const result = await createSubscriptionRecord(db as never, input);
    expect(result).toMatchObject({ ok: true });
    expect(db.webhookSubscription.create.mock.calls[0][0].data).toMatchObject({
      agentId: "agent-a",
      url: input.url,
      events: ["issue.created"],
    });
  });

  it("normalises the filter: trims, drops blanks, dedupes", () => {
    expect(normalizeSubscriptionEvents([" issue.created ", "issue.created", "", "  "])).toEqual([
      "issue.created",
    ]);
    expect(normalizeSubscriptionEvents(undefined)).toEqual([]);
  });
});

describe("webhook event filters name real events (#500)", () => {
  it("accepts every type the agent event catalogue publishes", () => {
    expect(unknownSubscriptionEvents(SUBSCRIBABLE_EVENT_TYPES)).toEqual([]);
    expect(SUBSCRIBABLE_EVENT_TYPES).toContain("issue.created");
  });

  it("names each unknown type once, ignoring surrounding whitespace", () => {
    expect(unknownSubscriptionEvents(["issue.created", " issue.mergd ", "issue.mergd", "claim.*"])).toEqual([
      "issue.mergd",
      "claim.*",
    ]);
  });

  it("treats an omitted or empty filter as every event", () => {
    expect(unknownSubscriptionEvents(undefined)).toEqual([]);
    expect(unknownSubscriptionEvents([])).toEqual([]);
  });
});
