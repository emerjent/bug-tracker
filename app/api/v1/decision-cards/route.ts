import { createMethodNotAllowed, createOptions } from "@/lib/agent-api/http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { agentErrorResponse, requireAgent } from "@/lib/agents/require-agent";
import { agentBudgetExceededResponse, consumeAgentBudget } from "@/lib/agents/rate-budget";
import { withAgentBudgetHeaders } from "@/lib/agents/rate-budget-headers";
import { createDecisionCard, type CreateDecisionCardInput } from "@/lib/decision-cards";

/**
 * POST /api/v1/decision-cards — an agent asks its owner a structured question
 * (decision card). Body: { projectId, bugId?, question, options: [{label,value}]x2-3,
 * recommendation?, confidence?, tried?, costSoFar?, defaultAnswer?, defaultTimerMinutes? }
 */
export async function POST(req: NextRequest) {
  let agent;
  try {
    agent = await requireAgent(req);
  } catch (error) {
    return agentErrorResponse(error);
  }

  const budget = await consumeAgentBudget(
    { id: agent.agentId, burst: agent.burst, burstUntil: agent.burstUntil ?? null },
    "write",
  );
  if (!budget.allowed) return agentBudgetExceededResponse(budget.retryAfterSeconds, budget);

  const body: unknown = await req.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return withAgentBudgetHeaders(
      NextResponse.json({ error: "invalid_request", message: "Send a JSON object." }, { status: 400 }),
      budget,
    );
  }

  const result = await createDecisionCard(
    agent.agentId,
    agent.ownerId,
    agent.tenantId,
    body as CreateDecisionCardInput,
  );
  if ("status" in result) {
    return withAgentBudgetHeaders(NextResponse.json(result, { status: result.status }), budget);
  }
  return withAgentBudgetHeaders(NextResponse.json({ card: result }, { status: 201 }), budget);
}

const apiMethodNotAllowed = createMethodNotAllowed(["POST", "OPTIONS"]);
const apiOptions = createOptions(["POST", "OPTIONS"]);
export const GET = apiMethodNotAllowed;
export const PUT = apiMethodNotAllowed;
export const PATCH = apiMethodNotAllowed;
export const DELETE = apiMethodNotAllowed;
export const HEAD = apiMethodNotAllowed;
export const OPTIONS = apiOptions;
