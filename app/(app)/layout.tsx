import { headers } from "next/headers";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { isLinkPreviewBot } from "@/lib/link-preview";
import { AppHeader } from "@/components/app-header";
import { getUnreadCount } from "@/lib/lookups";
import { REPORT_FORM_URL } from "@/lib/report-form";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/skip-link";
import { PAGE_CONTAINER_CLASS } from "@/components/page-container";
import { FocusMainOnNavigate } from "@/components/focus-main-on-navigate";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { isAdmin } from "@/lib/roles";
import type { WorkspaceChoice } from "@/components/workspace-switcher";
import { prisma } from "@/lib/prisma";
import { currentTenantIdFor } from "@/lib/tenant-context";
import { tenantsForUser } from "@/lib/tenants";
import { countPendingEscalations } from "@/lib/agent-questions";
import { loadOwnAgents } from "@/lib/dashboard-overview";
import { pointTotals } from "@/lib/points/leaderboard";
import { getPlatformRewardConfig } from "@/lib/points/platform-rewards";
import { TARGET_POINTS } from "@/lib/points/rules";
import { ZiggyLayoutWrapper } from "@/components/ziggy";
import type { DashboardAgent } from "@/lib/dashboard-overview";
import { cookies } from "next/headers";

/**
 * Demo paths that are accessible without authentication (public demo mode)
 */
const DEMO_PATHS = [
  "/dashboard",
  "/settings",
  "/settings/agents",
  "/escalations",
  "/feed",
  "/workers",
  "/leaderboard",
  "/projects",
  "/notifications",
  "/team",
  "/docs",
];

function isDemoPath(pathWithoutBase: string): boolean {
  return DEMO_PATHS.some((p) => pathWithoutBase === p || pathWithoutBase.startsWith(p + "/"));
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Get path from middleware header OR from cookie OR from URL
  const pathFromHeader = headersList.get("x-pathname") || "";
  const demoCookie = cookieStore.get("ziggy-demo-mode")?.value === "true";
  const demoModeFromCookie = demoCookie;
  
  // Check if current request path is a demo path (first request won't have cookie)
  const pathWithoutBase = pathFromHeader || "";
  const demoModeFromPath = isDemoPath(pathWithoutBase);
  const demoMode = demoModeFromCookie || demoModeFromPath;

  // Link-preview crawlers may reach /bugs/[id] without a session. Render a
  // minimal shell so generateMetadata + the public preview body can respond.
  if (!session?.user && !demoMode) {
    const ua = headersList.get("user-agent");
    if (isLinkPreviewBot(ua)) {
      return (
        <div className="flex min-h-screen flex-col bg-background">
          <main
            id={MAIN_CONTENT_ID}
            className={`${PAGE_CONTAINER_CLASS} flex-1 py-8`}
          >
            {children}
          </main>
        </div>
      );
    }
  }

  // Demo mode: skip auth, use demo data
  let user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: "user" | "admin" | "super_admin"; isRealSuperAdmin?: boolean; isRealAdmin?: boolean } | null = null;
  let workspaces: WorkspaceChoice[] = [];
  let activeTenantId: string | null = null;
  let tenantId: string | null = null;
  let unreadCount = 0;
  let pendingEscalationsCount = 0;
  let points = 0;
  let solvedTasks = 0;
  let shellAgents: { id: string; name: string; level: string }[] = [];
  let targetPoints = TARGET_POINTS;
  let shortcutsEnabled = true;

  if (!demoMode) {
    // Real authenticated user flow
    user = await requireUser();
    try {
      tenantId = await currentTenantIdFor(user.id);
      activeTenantId = tenantId;
      const memberships = await tenantsForUser(prisma, user.id, user.role);
      workspaces = memberships
        .filter((tenant) => tenant.archivedAt === null)
        .map((tenant) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug }));
    } catch (error) {
      console.error("[layout] workspace context failed", error);
    }
    try {
      unreadCount = await getUnreadCount(user.id);
    } catch (error) {
      console.error("[layout] notification count failed", error);
    }
    if (tenantId) {
      try {
        pendingEscalationsCount = await countPendingEscalations(user.id, tenantId);
      } catch (error) {
        console.error("[layout] pending escalations count failed", error);
      }
      try {
        const totals = await pointTotals(prisma, tenantId, user.id);
        points = totals.points;
        solvedTasks = totals.solvedTasks;
      } catch (error) {
        console.error("[layout] points failed", error);
      }
      try {
        const agents = await loadOwnAgents({ userId: user.id, tenantId });
        shellAgents = agents.map((agent) => ({ id: agent.id, name: agent.name, level: agent.level }));
      } catch (error) {
        console.error("[layout] agents failed", error);
      }
    }
    try {
      targetPoints = (await getPlatformRewardConfig(prisma)).target;
    } catch (error) {
      console.error("[layout] platform rewards failed", error);
    }
    try {
      const prefs = await prisma.user.findUnique({
        where: { id: user.id },
        select: { keyboardShortcuts: true },
      });
      shortcutsEnabled = prefs?.keyboardShortcuts ?? true;
    } catch (error) {
      console.error("[layout] shortcut setting failed", error);
    }
  } else {
    // Demo mode: provide demo user data
    user = {
      id: "demo-user",
      name: "Demo User",
      email: "demo@ziki.dev",
      image: null,
      role: "user",
      isRealSuperAdmin: false,
      isRealAdmin: false,
    };
  }

  return (
    // data-app-shell switches the page (and its dialogs and toasts) to Inter; see globals.css.
    <div data-app-shell="" className="flex min-h-screen flex-col bg-zk-bg">
      <SkipLink />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userName={user?.name ?? user?.email ?? "Demo User"}
          userImage={user?.image}
          role={user?.role ?? "user"}
          isRealSuperAdmin={user?.isRealSuperAdmin ?? false}
          isRealAdmin={user?.isRealAdmin ?? false}
          unreadCount={unreadCount}
          pendingEscalationsCount={pendingEscalationsCount}
          userId={user?.id ?? "demo-user"}
          workspaces={workspaces}
          activeTenantId={activeTenantId}
          points={points}
          solvedTasks={solvedTasks}
          targetPoints={targetPoints}
          agents={shellAgents}
          reportFormUrl={REPORT_FORM_URL}
        />
        <main
          id={MAIN_CONTENT_ID}
          /* Focusable so the skip link and the route announcer can move focus
             here; -1 keeps it out of the normal tab order. */
          tabIndex={-1}
          // Below lg the bottom nav strip covers the last ~4.5rem of the screen.
          className={`${PAGE_CONTAINER_CLASS} min-w-0 flex-1 overflow-x-clip py-6 outline-none max-lg:pb-28 max-sm:px-2 max-sm:pt-2.5 sm:px-6 sm:py-8 max-lg:sm:pb-28`}
        >
          <ZiggyLayoutWrapper
            initialAgents={shellAgents as DashboardAgent[]}
            initialPendingEscalations={pendingEscalationsCount}
            isDemoMode={demoMode}
          >
            {children}
          </ZiggyLayoutWrapper>
        </main>
      </div>
      {!demoMode && (
        <>
          <FocusMainOnNavigate />
          <KeyboardShortcuts
            enabled={shortcutsEnabled}
            dashboard={isAdmin(user?.role ?? "user")}
          />
        </>
      )}
    </div>
  );
}