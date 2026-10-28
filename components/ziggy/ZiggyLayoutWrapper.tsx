"use client";

import { usePathname } from "next/navigation";
import { ZiggyProvider } from "./ZiggyProvider";
import type { DashboardAgent } from "@/lib/dashboard-overview";

export interface ZiggyLayoutWrapperProps {
  children: React.ReactNode;
  initialAgents?: DashboardAgent[];
  initialPendingEscalations?: number;
  isDemoMode?: boolean;
}

function toClientAgent(agent: DashboardAgent) {
  return {
    ...agent,
    lastSeenAt: agent.lastSeenAt ? agent.lastSeenAt.toISOString() : null,
  };
}

export function ZiggyLayoutWrapper({
  children,
  initialAgents = [],
  initialPendingEscalations = 0,
  isDemoMode = false,
}: ZiggyLayoutWrapperProps) {
  const pathname = usePathname();

  // Exclude Ziggy from Issues page routes
  const isIssuesPage = pathname?.startsWith("/issues");

  if (isIssuesPage) {
    return <>{children}</>;
  }

  return (
    <ZiggyProvider
      initialAgents={initialAgents.map(toClientAgent)}
      initialPendingEscalations={initialPendingEscalations}
      isDemoMode={isDemoMode}
    >
      {children}
    </ZiggyProvider>
  );
}