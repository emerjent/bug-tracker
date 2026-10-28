"use client";

/**
 * Demo data for Agent Report Cards.
 * Clearly labelled as demo data — never presented as real activity.
 */

export type AgentRole = "contributor" | "reviewer" | "triager" | "observer" | "dispatcher" | "merger" | "admin_merger";

export type ClaimReleaseReason = "silence" | "deadline" | "agent" | "declined";

export interface ClaimReleaseEvent {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  reason: ClaimReleaseReason;
  taskDescription: string;
  createdAt: string;
}

export interface DemoAgentReport {
  id: string;
  name: string;
  role: AgentRole;
  secondaryId?: string;
  events: ClaimReleaseEvent[];
}

/**
 * Qualifying strike reasons for Contributors.
 * Per Ziki rules: only 'silence' and 'deadline' count as qualifying strikes.
 * Voluntary releases ('agent') and declined offers ('declined') do NOT count.
 */
export const QUALIFYING_STRIKE_REASONS: ClaimReleaseReason[] = ["silence", "deadline"];

/**
 * Check if a claim release reason qualifies as a strike for Contributors.
 */
export function isQualifyingStrike(reason: ClaimReleaseReason): boolean {
  return QUALIFYING_STRIKE_REASONS.includes(reason);
}

/**
 * Check if an agent role is subject to the automatic strike-based demotion rule.
 * Per Ziki rules: only Contributors are subject to automatic demotion after 3 qualifying strikes in 7 days.
 */
export function isRoleSubjectToStrikeRule(role: AgentRole): boolean {
  return role === "contributor";
}

/**
 * Calculate strike count for an agent within the rolling 7-day window.
 * Only counts qualifying events for Contributors.
 */
export function calculateStrikes(agent: DemoAgentReport, windowMs = 7 * 24 * 60 * 60 * 1000): number {
  if (!isRoleSubjectToStrikeRule(agent.role)) {
    return -1; // Not applicable
  }

  const now = new Date();
  const cutoff = now.getTime() - windowMs;

  return agent.events.filter((event) => {
    const eventTime = new Date(event.createdAt).getTime();
    return (
      eventTime >= cutoff &&
      isQualifyingStrike(event.reason)
    );
  }).length;
}

/**
 * Get the agent's status based on strike count.
 */
export function getAgentStrikeStatus(agent: DemoAgentReport): {
  status: "no-strikes" | "one-strike" | "two-strikes" | "demoted" | "not-applicable";
  strikeCount: number;
  maxStrikes: number;
  qualifyingEvents: ClaimReleaseEvent[];
} {
  if (!isRoleSubjectToStrikeRule(agent.role)) {
    return {
      status: "not-applicable",
      strikeCount: -1,
      maxStrikes: 3,
      qualifyingEvents: [],
    };
  }

  const now = new Date();
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const qualifyingEvents = agent.events.filter((event) => {
    const eventTime = new Date(event.createdAt).getTime();
    return eventTime >= cutoff && isQualifyingStrike(event.reason);
  });

  const strikeCount = qualifyingEvents.length;
  const maxStrikes = 3;

  let status: "no-strikes" | "one-strike" | "two-strikes" | "demoted" | "not-applicable" = "no-strikes";
  if (strikeCount >= maxStrikes) {
    status = "demoted";
  } else if (strikeCount === 2) {
    status = "two-strikes";
  } else if (strikeCount === 1) {
    status = "one-strike";
  }

  return {
    status,
    strikeCount,
    maxStrikes,
    qualifyingEvents,
  };
}

/**
 * Demo agent reports with sample strike data.
 * All data is clearly fictional and for demonstration only.
 */
export const DEMO_AGENT_REPORTS: DemoAgentReport[] = [
  {
    id: "demo-1",
    name: "ChatGPT Assistant",
    role: "reviewer",
    secondaryId: "reviewer-1",
    events: [
      {
        id: "evt-1",
        agentId: "demo-1",
        agentName: "ChatGPT Assistant",
        agentRole: "reviewer",
        reason: "deadline",
        taskDescription: "Review PR #1245",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "demo-2",
    name: "OpenCode Reviewer",
    role: "reviewer",
    secondaryId: "reviewer-2",
    events: [
      {
        id: "evt-2",
        agentId: "demo-2",
        agentName: "OpenCode Reviewer",
        agentRole: "reviewer",
        reason: "silence",
        taskDescription: "Review issue #892",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "demo-3",
    name: "Personal Agent",
    role: "contributor",
    secondaryId: "contributor-1",
    events: [
      {
        id: "evt-3",
        agentId: "demo-3",
        agentName: "Personal Agent",
        agentRole: "contributor",
        reason: "deadline",
        taskDescription: "Fix login button on mobile Safari",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "evt-4",
        agentId: "demo-3",
        agentName: "Personal Agent",
        agentRole: "contributor",
        reason: "silence",
        taskDescription: "Implement dark mode for dashboard",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "evt-5",
        agentId: "demo-3",
        agentName: "Personal Agent",
        agentRole: "contributor",
        reason: "agent",
        taskDescription: "Voluntary release of claim #401",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "demo-4",
    name: "OpenCode Reviewer",
    role: "contributor",
    secondaryId: "contributor-2",
    events: [
      {
        id: "evt-6",
        agentId: "demo-4",
        agentName: "OpenCode Reviewer",
        agentRole: "contributor",
        reason: "deadline",
        taskDescription: "Submit fix for API timeout issue",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "evt-7",
        agentId: "demo-4",
        agentName: "OpenCode Reviewer",
        agentRole: "contributor",
        reason: "declined",
        taskDescription: "Declined claim offer for #333",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "demo-5",
    name: "Another Contributor",
    role: "contributor",
    secondaryId: "contributor-3",
    events: [
      {
        id: "evt-8",
        agentId: "demo-5",
        agentName: "Another Contributor",
        agentRole: "contributor",
        reason: "agent",
        taskDescription: "Voluntary release of claim #555",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "demo-6",
    name: "Demo Contributor",
    role: "contributor",
    secondaryId: "contributor-4",
    events: [
      {
        id: "evt-9",
        agentId: "demo-6",
        agentName: "Demo Contributor",
        agentRole: "contributor",
        reason: "deadline",
        taskDescription: "Complete unit tests for auth module",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "evt-10",
        agentId: "demo-6",
        agentName: "Demo Contributor",
        agentRole: "contributor",
        reason: "silence",
        taskDescription: "Implement rate limiting middleware",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "evt-11",
        agentId: "demo-6",
        agentName: "Demo Contributor",
        agentRole: "contributor",
        reason: "deadline",
        taskDescription: "Fix memory leak in worker process",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

/**
 * Demo notifications for the notification bell.
 */
export interface DemoNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  readAt: string | null;
  type: "strike" | "demotion" | "role-change" | "activity";
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "notif-1",
    title: "Contributor claim released — missed deadline",
    description: "Personal Agent's claim on 'Fix login button on mobile Safari' was released after missing the deadline.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    readAt: null,
    type: "strike",
  },
  {
    id: "notif-2",
    title: "Contributor claim released — silence",
    description: "Personal Agent stopped responding on 'Implement dark mode for dashboard'. Claim released after silence.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    readAt: null,
    type: "strike",
  },
  {
    id: "notif-3",
    title: "Contributor claim released — missed deadline",
    description: "OpenCode Reviewer's claim on 'Submit fix for API timeout issue' was released after missing the deadline.",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    type: "strike",
  },
  {
    id: "notif-4",
    title: "Agent role changed",
    description: "Demo Contributor has been automatically demoted to Observer after 3 qualifying strikes.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    readAt: null,
    type: "demotion",
  },
];

/**
 * Format a date for display in agent details.
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get a human-readable reason label.
 */
export function getReasonLabel(reason: ClaimReleaseReason): string {
  switch (reason) {
    case "silence":
      return "Stopped responding";
    case "deadline":
      return "Missed deadline";
    case "agent":
      return "Voluntary release";
    case "declined":
      return "Declined offer";
    default:
      return reason;
  }
}

/**
 * Get the strike status label for display.
 */
export function getStrikeStatusLabel(status: ReturnType<typeof getAgentStrikeStatus>["status"]): string {
  switch (status) {
    case "no-strikes":
      return "0 strikes";
    case "one-strike":
      return "1 of 3 strikes";
    case "two-strikes":
      return "2 of 3 strikes";
    case "demoted":
      return "Demoted to Observer";
    case "not-applicable":
      return "Not applicable to this role";
    default:
      return "Unknown";
  }
}

/**
 * Get the strike status badge class.
 */
export function getStrikeStatusClass(status: ReturnType<typeof getAgentStrikeStatus>["status"]): string {
  switch (status) {
    case "no-strikes":
      return "bg-zk-ok-bg text-zk-ok-fg";
    case "one-strike":
      return "bg-zk-warn-bg text-zk-warn-fg";
    case "two-strikes":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "demoted":
      return "bg-zk-bad-bg text-zk-bad-fg";
    case "not-applicable":
      return "bg-zk-chip text-zk-text2";
    default:
      return "bg-zk-chip text-zk-text2";
  }
}