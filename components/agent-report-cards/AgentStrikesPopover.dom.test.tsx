// @vitest-environment jsdom
"use client";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentStrikesPopover } from "./AgentStrikesPopover";
import { DEMO_AGENT_REPORTS } from "@/lib/agent-report-cards/demo-data";

afterEach(() => {
  cleanup();
});

function getAgent(id: string) {
  return DEMO_AGENT_REPORTS.find((a) => a.id === id)!;
}

describe("AgentStrikesPopover", () => {
  it("renders the title and close button", () => {
    const agent = getAgent("demo-3"); // contributor with 2 strikes
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText("Agent strikes")).toBeDefined();
    expect(screen.getByRole("button", { name: "Close" })).toBeDefined();
  });

  it("renders the dialog with aria-modal", () => {
    const agent = getAgent("demo-3");
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("closes when the close button is clicked", () => {
    const onClose = vi.fn();
    const agent = getAgent("demo-3");
    render(<AgentStrikesPopover agent={agent} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows strike summary dynamically", () => {
    const agent = getAgent("demo-3"); // 2 strikes
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText("2 of 3 strikes")).toBeDefined();
  });

  it("shows the warning with remaining threshold", () => {
    const agent = getAgent("demo-3"); // 2 strikes, 1 remaining
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText(/1 more qualifying strike within 7 days/)).toBeDefined();
    expect(screen.getByText("trigger automatic demotion to Observer")).toBeDefined();
  });

  it("shows zero strikes correctly", () => {
    const agent = getAgent("demo-5"); // contributor with 0 strikes
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText("0 of 3 strikes")).toBeDefined();
    expect(screen.getByText(/3 more qualifying strikes within 7 days/)).toBeDefined();
    expect(screen.getByText("No qualifying strikes in the last seven days.")).toBeDefined();
  });

  it("shows not-applicable for non-contributor roles", () => {
    const agent = getAgent("demo-1"); // reviewer
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText("Not applicable to this role")).toBeDefined();
    expect(screen.queryByText("Strike summary")).toBeNull();
  });

  it("renders strike entries with reason and recorded date", () => {
    const agent = getAgent("demo-6"); // demoted contributor with 3 strikes
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    // Should show qualifying events
    expect(screen.getAllByText(/Missed deadline|Stopped responding/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Recorded:/).length).toBeGreaterThan(0);
  });

  it("handles missing task description gracefully", () => {
    // Create an agent with an event that has no taskDescription
    const agent: Parameters<typeof AgentStrikesPopover>[0]["agent"] = {
      id: "test-1",
      name: "Test Agent",
      role: "contributor",
      events: [
        {
          id: "evt-1",
          agentId: "test-1",
          agentName: "Test Agent",
          agentRole: "contributor",
          reason: "deadline",
          taskDescription: "",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText("Missed deadline")).toBeDefined();
    expect(screen.getByText(/Recorded:/)).toBeDefined();
  });

  it("shows demoted agent with threshold warning", () => {
    const agent = getAgent("demo-6"); // demoted
    render(<AgentStrikesPopover agent={agent} onClose={() => {}} />);
    expect(screen.getByText("3 of 3 strikes")).toBeDefined();
    expect(screen.getByText(/At demotion threshold/)).toBeDefined();
  });

  it("supports keyboard Escape to close", () => {
    const onClose = vi.fn();
    const agent = getAgent("demo-3");
    render(<AgentStrikesPopover agent={agent} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
