import { describe, expect, it } from "vitest";
import {
  calculateStrikes,
  DEMO_AGENT_REPORTS,
  formatEventDate,
  getAgentStrikeStatus,
  getReasonLabel,
  getStrikeStatusClass,
  getStrikeStatusLabel,
  isQualifyingStrike,
  isRoleSubjectToStrikeRule,
} from "./demo-data";

describe("isQualifyingStrike", () => {
  it("returns true for silence and deadline", () => {
    expect(isQualifyingStrike("silence")).toBe(true);
    expect(isQualifyingStrike("deadline")).toBe(true);
  });

  it("returns false for agent and declined", () => {
    expect(isQualifyingStrike("agent")).toBe(false);
    expect(isQualifyingStrike("declined")).toBe(false);
  });
});

describe("isRoleSubjectToStrikeRule", () => {
  it("returns true only for contributor", () => {
    expect(isRoleSubjectToStrikeRule("contributor")).toBe(true);
    expect(isRoleSubjectToStrikeRule("reviewer")).toBe(false);
    expect(isRoleSubjectToStrikeRule("observer")).toBe(false);
    expect(isRoleSubjectToStrikeRule("merger")).toBe(false);
  });
});

describe("calculateStrikes", () => {
  it("returns -1 for non-contributor roles", () => {
    const reviewer = DEMO_AGENT_REPORTS.find((a) => a.role === "reviewer")!;
    expect(calculateStrikes(reviewer)).toBe(-1);
  });

  it("counts only qualifying strikes within the 7-day window", () => {
    const agent = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-3")!;
    // deadline (3 days ago) + silence (1 day ago) = 2; agent (5 days ago) does not qualify
    expect(calculateStrikes(agent)).toBe(2);
  });
});

describe("getAgentStrikeStatus", () => {
  it("returns not-applicable for non-contributor roles", () => {
    const reviewer = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-1")!;
    expect(getAgentStrikeStatus(reviewer).status).toBe("not-applicable");
  });

  it("returns no-strikes for a contributor with no qualifying events", () => {
    const agent = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-5")!;
    const status = getAgentStrikeStatus(agent);
    expect(status.status).toBe("no-strikes");
    expect(status.strikeCount).toBe(0);
  });

  it("returns one-strike for a contributor with one qualifying strike", () => {
    const agent = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-4")!;
    const status = getAgentStrikeStatus(agent);
    expect(status.status).toBe("one-strike");
    expect(status.strikeCount).toBe(1);
  });

  it("returns two-strikes for a contributor with two qualifying strikes", () => {
    const agent = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-3")!;
    const status = getAgentStrikeStatus(agent);
    expect(status.status).toBe("two-strikes");
    expect(status.strikeCount).toBe(2);
  });

  it("returns demoted for a contributor with three or more qualifying strikes", () => {
    const agent = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-6")!;
    const status = getAgentStrikeStatus(agent);
    expect(status.status).toBe("demoted");
    expect(status.strikeCount).toBe(3);
  });

  it("returns qualifying events for the reporting window", () => {
    const agent = DEMO_AGENT_REPORTS.find((a) => a.id === "demo-6")!;
    const status = getAgentStrikeStatus(agent);
    expect(status.qualifyingEvents).toHaveLength(3);
  });
});

describe("getStrikeStatusLabel", () => {
  it("maps each status to a label", () => {
    expect(getStrikeStatusLabel("no-strikes")).toBe("0 strikes");
    expect(getStrikeStatusLabel("one-strike")).toBe("1 of 3 strikes");
    expect(getStrikeStatusLabel("two-strikes")).toBe("2 of 3 strikes");
    expect(getStrikeStatusLabel("demoted")).toBe("Demoted to Observer");
    expect(getStrikeStatusLabel("not-applicable")).toBe("Not applicable to this role");
  });
});

describe("getStrikeStatusClass", () => {
  it("returns a class for each status", () => {
    expect(getStrikeStatusClass("no-strikes")).toContain("bg-zk-ok-bg");
    expect(getStrikeStatusClass("one-strike")).toContain("bg-zk-warn-bg");
    expect(getStrikeStatusClass("two-strikes")).toContain("text-orange-700");
    expect(getStrikeStatusClass("demoted")).toContain("bg-zk-bad-bg");
    expect(getStrikeStatusClass("not-applicable")).toContain("bg-zk-chip");
  });
});

describe("getReasonLabel", () => {
  it("maps each reason to a human label", () => {
    expect(getReasonLabel("silence")).toBe("Stopped responding");
    expect(getReasonLabel("deadline")).toBe("Missed deadline");
    expect(getReasonLabel("agent")).toBe("Voluntary release");
    expect(getReasonLabel("declined")).toBe("Declined offer");
  });
});

describe("formatEventDate", () => {
  it("formats an ISO date string", () => {
    const result = formatEventDate("2026-10-20T12:00:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("DEMO_AGENT_REPORTS", () => {
  it("contains 6 agents with distinct names", () => {
    const names = DEMO_AGENT_REPORTS.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("includes a demoted contributor", () => {
    const demoted = DEMO_AGENT_REPORTS.filter((a) => getAgentStrikeStatus(a).status === "demoted");
    expect(demoted).toHaveLength(1);
    expect(demoted[0].name).toBe("Demo Contributor");
  });
});
