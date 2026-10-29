import { describe, expect, it, vi } from "vitest";
import { formatStructuredDescription, isUnstructuredDraft, splitReportedIdeas } from "./ideas";

describe("Drafted ideas (#1162)", () => {
  it("identifies unstructured human drafts correctly", () => {
    // Human submission with quick unstructured notes
    expect(
      isUnstructuredDraft({
        createdByAgentId: null,
        description: "Can we add a dark mode toggle to the top right of the navigation?",
      }),
    ).toBe(true);

    // Agent submission is never treated as a human draft
    expect(
      isUnstructuredDraft({
        createdByAgentId: "agent_123",
        description: "Quick bug report without headings",
      }),
    ).toBe(false);

    // Fully structured report with standard headings is not an unstructured draft
    expect(
      isUnstructuredDraft({
        createdByAgentId: null,
        description: `## Summary\nDark mode toggle.\n\n## Problem Statement\nMissing dark mode.\n\n## Acceptance Criteria\n- [ ] Toggle exists`,
      }),
    ).toBe(false);
  });

  it("formats unstructured drafts into standard specification markdown", () => {
    const raw = "Add an export button to issues list so we can export CSV";
    const structured = formatStructuredDescription(raw, {
      summary: "CSV export button on issues list",
      problem: "Users cannot export issues to CSV.",
      proposedSolution: "Add Export CSV button beside the filter controls.",
      acceptanceCriteria: ["Export CSV button renders", "Clicks trigger download"],
    });

    expect(structured).toContain("## Summary\nCSV export button on issues list");
    expect(structured).toContain("## Problem Statement\nUsers cannot export issues to CSV.");
    expect(structured).toContain("## Proposed Solution\nAdd Export CSV button beside the filter controls.");
    expect(structured).toContain("## Acceptance Criteria\n- [ ] Export CSV button renders\n- [ ] Clicks trigger download");

    // The output is now recognized as structured, so it moves out of drafts
    expect(isUnstructuredDraft({ createdByAgentId: null, description: structured })).toBe(false);
  });
});

describe("splitReportedIdeas (#700)", () => {
  const structured = "## Summary\nx\n\n## Problem\ny\n\n## Proposed fix\nz";
  const rows = [
    { id: "human-raw", createdByAgentId: null, description: "Can we add dark mode?" },
    { id: "human-structured", createdByAgentId: null, description: structured },
    { id: "agent-raw", createdByAgentId: "agent-1", description: "Can we add dark mode?" },
    { id: "agent-structured", createdByAgentId: "agent-1", description: structured },
  ];

  it("puts each reported idea in exactly one list", async () => {
    const db = { bug: { findMany: vi.fn(async () => rows) } };
    const { drafts, ideas } = await splitReportedIdeas(db, rows.map((r) => r.id));

    expect(drafts).toEqual(["human-raw"]);
    expect(ideas.sort()).toEqual(["agent-raw", "agent-structured", "human-structured"]);
    expect(drafts.filter((id) => ideas.includes(id))).toEqual([]);
    expect(drafts.length + ideas.length).toBe(rows.length);
  });

  it("does not query when there are no reported ideas", async () => {
    const db = { bug: { findMany: vi.fn() } };
    expect(await splitReportedIdeas(db, [])).toEqual({ drafts: [], ideas: [] });
    expect(db.bug.findMany).not.toHaveBeenCalled();
  });
});
