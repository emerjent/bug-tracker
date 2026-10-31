export type EscalationType =
  | "Blocker"
  | "Work Authorization"
  | "Question"
  | "Scope Expansion"
  | "Human Approval";

export function classifyEscalation(body: string): EscalationType {
  const lower = body.toLowerCase();
  if (
    lower.includes("block") ||
    lower.includes("stuck") ||
    lower.includes("impediment") ||
    lower.startsWith("[blocker]")
  ) {
    return "Blocker";
  }
  if (
    lower.includes("authoriz") ||
    lower.includes("permission") ||
    lower.includes("start work") ||
    lower.includes("bid") ||
    lower.startsWith("[work authorization]")
  ) {
    return "Work Authorization";
  }
  if (
    lower.includes("scope") ||
    lower.includes("expand") ||
    lower.includes("out of scope") ||
    lower.includes("refactor") ||
    lower.startsWith("[scope expansion]")
  ) {
    return "Scope Expansion";
  }
  if (
    lower.includes("approv") ||
    lower.includes("sign off") ||
    lower.includes("confirm") ||
    lower.includes("review") ||
    lower.startsWith("[human approval]")
  ) {
    return "Human Approval";
  }
  return "Question";
}

export function parseEscalationBody(rawBody: string): { type: EscalationType; cleanBody: string } {
  const match = rawBody.match(/^\[([a-zA-Z\s_]+)\]\s*([\s\S]*)$/);
  if (match) {
    const tag = match[1].toLowerCase().replace(/\\s+/g, "_");
    if (tag === "blocker") return { type: "Blocker", cleanBody: match[2] };
    if (tag === "work_authorization" || tag === "authorization")
      return { type: "Work Authorization", cleanBody: match[2] };
    if (tag === "scope_change" || tag === "scope_expansion")
      return { type: "Scope Expansion", cleanBody: match[2] };
    if (tag === "human_approval" || tag === "approval")
      return { type: "Human Approval", cleanBody: match[2] };
    if (tag === "question") return { type: "Question", cleanBody: match[2] };
  }
  return { type: classifyEscalation(rawBody), cleanBody: rawBody };
}