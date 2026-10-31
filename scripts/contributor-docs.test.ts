import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The contributor docs name this repo and product, not the old ones (#565, #687). */
const DOCS = ["README.md", "AGENTS.md", "CONTRIBUTING.md"];

describe("contributor docs (#565, #687)", () => {
  it.each(DOCS)("%s directs PRs to project repo / emerjent/ziki", (file) => {
    const text = readFileSync(file, "utf8");
    expect(text).toContain("emerjent/ziki");
    expect(text).toContain("repoUrl");
    // "formerly Zedu-Endor/bug-tracker" is fine; targeting it is not.
    expect(text).not.toMatch(/(?:target|against)[^\n]*`Zedu-Endor\/(?:bug-tracker|issue-tracker)`/i);
    expect(text).not.toMatch(/on `Zedu-Endor\/(?:bug-tracker|issue-tracker)`/);
  });

  it.each(DOCS)("%s has no old product name or personal paths", (file) => {
    const text = readFileSync(file, "utf8");
    expect(text).not.toContain("Zedu Bugs");
    expect(text).not.toMatch(/\/Users\/[a-z]+\//i);
  });
});
