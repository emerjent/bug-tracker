import { createMethodNotAllowed, createOptions } from "@/lib/agent-api/http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { agentIssueRequest, issueJson, issueProject } from "@/lib/agent-api/issues";
import { createGoal, listGoals } from "@/lib/goals/service";
import { createGoalSchema } from "@/lib/validations/goal";

export const runtime = "nodejs";

/** GET ?projectId=&after=&limit=&afterId= — the project's goals with budget summaries, newest first (#616). */
export async function GET(request: NextRequest) {
  return agentIssueRequest(request, "goals.list", "observer", null, async (agent) => {
    const scope = await issueProject(agent, request.nextUrl.searchParams);
    const params = request.nextUrl.searchParams;
    const limitRaw = params.get("limit");
    let limit: number | undefined;
    if (limitRaw !== null && limitRaw !== "") {
      const parsed = Number.parseInt(limitRaw, 10);
      if (!Number.isNaN(parsed) && parsed > 0) limit = parsed;
    }
    const cursorRaw = params.get("after");
    const cursorIdRaw = params.get("afterId");
    let cursor: { createdAt: Date; id: string } | null = null;
    if (cursorRaw !== null && cursorRaw !== "" && cursorIdRaw !== null && cursorIdRaw !== "") {
      cursor = { createdAt: new Date(cursorRaw), id: cursorIdRaw };
    }
    const result = await listGoals(scope.tenantId, scope.projectId, cursor, limit);
    return NextResponse.json({ items: result.items, nextCursor: result.nextCursor });
  });
}

/** POST JSON with title, budgetPool, optional description — creates a goal (#616). */
export async function POST(request: NextRequest) {
  return agentIssueRequest(request, "goals.create", "contributor", null, async (agent) => {
    const parsed = createGoalSchema.safeParse(await issueJson(request));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid goal request.", details: parsed.error.issues }, { status: 400 });
    }
    const scope = await issueProject(agent, request.nextUrl.searchParams, parsed.data.projectId);
    try {
      const goal = await createGoal(agent, { ...parsed.data, projectId: scope.projectId });
      return NextResponse.json({ goal }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && "status" in error) throw error;
      return NextResponse.json({ error: "Could not create this goal; try again." }, { status: 503 });
    }
  });
}

const apiMethodNotAllowed = createMethodNotAllowed(["GET", "HEAD", "POST", "OPTIONS"]);
const apiOptions = createOptions(["GET", "HEAD", "POST", "OPTIONS"]);
export const PUT = apiMethodNotAllowed;
export const PATCH = apiMethodNotAllowed;
export const DELETE = apiMethodNotAllowed;
export const OPTIONS = apiOptions;
