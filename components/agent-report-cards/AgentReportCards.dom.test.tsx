// @vitest-environment jsdom
"use client";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AgentReportCards } from "./AgentReportCards";

afterEach(() => {
  cleanup();
});

function cardByName(name: string) {
  return screen.getByText(name).closest("li")!;
}

function viewDetailsButton(card: HTMLElement) {
  return within(card).getByRole("button", { name: /view details/i });
}

describe("AgentReportCards", () => {
  it("renders the section heading and demo-data badge", () => {
    render(<AgentReportCards />);
    expect(screen.getByText("Agent Report Cards")).toBeDefined();
    expect(screen.getByText("DEMO DATA")).toBeDefined();
  });

  it("renders all 6 agent cards with names and role badges", () => {
    render(<AgentReportCards />);
    expect(screen.getByText("ChatGPT Assistant")).toBeDefined();
    expect(screen.getByText("OpenCode Reviewer")).toBeDefined();
    expect(screen.getByText("Personal Agent")).toBeDefined();
    expect(screen.getByText("OpenCode Contributor")).toBeDefined();
    expect(screen.getByText("Another Contributor")).toBeDefined();
    expect(screen.getByText("Demo Contributor")).toBeDefined();
    expect(screen.getAllByText("Reviewer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contributor").length).toBeGreaterThan(0);
  });

  it("shows strike status badges on each card", () => {
    render(<AgentReportCards />);
    expect(screen.getByText("0 strikes")).toBeDefined();
    expect(screen.getByText("1 of 3 strikes")).toBeDefined();
    expect(screen.getByText("2 of 3 strikes")).toBeDefined();
    expect(screen.getByText("Demoted to Observer")).toBeDefined();
    expect(screen.getAllByText("Not applicable to this role").length).toBe(2);
  });

  it("filters agents by role using tabs", () => {
    render(<AgentReportCards />);
    // Contributors tab shows only contributors
    fireEvent.click(screen.getByRole("tab", { name: "Contributors" }));
    expect(screen.getByText("Personal Agent")).toBeDefined();
    expect(screen.getByText("OpenCode Contributor")).toBeDefined();
    expect(screen.getByText("Another Contributor")).toBeDefined();
    expect(screen.getByText("Demo Contributor")).toBeDefined();
    expect(screen.queryByText("ChatGPT Assistant")).toBeNull();
    expect(screen.queryByText("OpenCode Reviewer")).toBeNull();

    // Reviewers tab shows only reviewers
    fireEvent.click(screen.getByRole("tab", { name: "Reviewers" }));
    expect(screen.getByText("ChatGPT Assistant")).toBeDefined();
    expect(screen.getByText("OpenCode Reviewer")).toBeDefined();
    expect(screen.queryByText("Personal Agent")).toBeNull();
  });

  it("filters agents with strikes", () => {
    render(<AgentReportCards />);
    fireEvent.click(screen.getByRole("tab", { name: "With strikes" }));
    expect(screen.getByText("Personal Agent")).toBeDefined(); // 2 strikes
    expect(screen.getByText("OpenCode Contributor")).toBeDefined(); // 1 strike
    expect(screen.getByText("Demo Contributor")).toBeDefined(); // demoted
    expect(screen.queryByText("Another Contributor")).toBeNull(); // no strikes
  });

  it("filters demoted agents", () => {
    render(<AgentReportCards />);
    fireEvent.click(screen.getByRole("tab", { name: "Demoted" }));
    expect(screen.getByText("Demo Contributor")).toBeDefined();
    expect(screen.getAllByText("Demo Contributor").length).toBe(1);
    expect(screen.queryByText("Personal Agent")).toBeNull();
  });

  it("searches agents by name", () => {
    render(<AgentReportCards />);
    const search = screen.getByPlaceholderText(/search agents by name or role/i);
    fireEvent.input(search, { target: { value: "ChatGPT" } });
    expect(screen.getByText("ChatGPT Assistant")).toBeDefined();
    expect(screen.queryByText("Personal Agent")).toBeNull();
  });

  it("resets filters", () => {
    render(<AgentReportCards />);
    fireEvent.click(screen.getByRole("tab", { name: "Contributors" }));
    expect(screen.queryByText("ChatGPT Assistant")).toBeNull();
    fireEvent.click(screen.getByText(/reset filters/i));
    expect(screen.getByText("ChatGPT Assistant")).toBeDefined();
    expect(screen.getByText("Personal Agent")).toBeDefined();
  });

  it("opens the detail panel when View details is clicked", () => {
    render(<AgentReportCards />);
    const card = cardByName("ChatGPT Assistant");
    fireEvent.click(viewDetailsButton(card));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("shows agent details in the panel and closes it", () => {
    render(<AgentReportCards />);
    const card = cardByName("ChatGPT Assistant");
    fireEvent.click(viewDetailsButton(card));
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    fireEvent.click(within(dialog).getByRole("button", { name: /^close$/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows qualifying events in the detail panel for a struck agent", () => {
    render(<AgentReportCards />);
    // Click View details on the demoted agent's card
    const card = cardByName("Demo Contributor");
    fireEvent.click(viewDetailsButton(card));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Rolling 7 days from today");
    expect(dialog.textContent).toContain("Missed deadline");
    expect(dialog.textContent).toContain("Stopped responding");
  });
});
