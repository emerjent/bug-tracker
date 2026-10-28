import { createMethodNotAllowed, createOptions } from "@/lib/agent-api/http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { agentErrorResponse, requireAgent } from "@/lib/agents/require-agent";
import { agentBudgetExceededResponse, consumeAgentBudget } from "@/lib/agents/rate-budget";
import { withAgentBudgetHeaders } from "@/lib/agents/rate-budget-headers";
import { setPresenceSchema } from "@/lib/agent-presence";
import { upsertPresence } from "@/lib/agent-presence";

/**
 * POST /api/v1/agents/me/presence — report what this agent is doing right now
 * (#presence). Body: { state, detail?, bugId?, ttlMinutes? }
 *
 * States: claiming, planning, working, waiting_on_ci, blocked_on_you, idle.
 * The lease renews on every heartbeat, so a lapsed lease means the agent has
 * gone silent and its issue returns to Open.
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

  const parsed = setPresenceSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return withAgentBudgetHeaders(
      NextResponse.json(
        { error: "invalid_request", message: issue?.message ?? "Invalid presence." },
        { status: 400 },
      ),
      budget,
    );
  }

  await upsertPresence(agent.agentId, agent.name, parsed.data);
  return withAgentBudgetHeaders(NextResponse.json({ ok: true }, { status: 200 }), budget);
}

const apiMethodNotAllowed = createMethodNotAllowed(["POST", "OPTIONS"]);
const apiOptions = createOptions(["POST", "OPTIONS"]);
export const GET = apiMethodNotAllowed;
export const PUT = apiMethodNotAllowed;
export const PATCH = apiMethodNotAllowed;
export const DELETE = apiMethodNotAllowed;
export const HEAD = apiMethodNotAllowed;
export const OPTIONS = apiOptions;
