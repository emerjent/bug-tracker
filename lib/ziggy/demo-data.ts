"use client";

/**
 * Demo data for public demo mode.
 * Clearly labelled as demo data — never presented as real activity.
 */

export interface DemoAgent {
  id: string;
  name: string;
  model: string | null;
  level: string;
  status: "waiting" | "working" | "idle" | "offline";
  activity: string;
  lastSeenAt: string | null;
}

export interface DemoAttentionItem {
  id: string;
  type: "escalation" | "question" | "approval" | "redesign";
  title: string;
  description: string;
  route: string;
  routeLabel: string;
  createdAt: string;
  agentName?: string;
}

export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: "demo-1",
    name: "Ziggy Demo — Working",
    model: "Claude 3.5 Sonnet",
    level: "contributor",
    status: "working",
    activity: "Working on #42 Fix login button on mobile Safari",
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    name: "Ziggy Demo — Waiting",
    model: "GPT-4",
    level: "reviewer",
    status: "waiting",
    activity: "Waiting for your answer",
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    name: "Ziggy Demo — Idle",
    model: "Claude 3 Haiku",
    level: "observer",
    status: "idle",
    activity: "Standing by",
    lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const DEMO_ATTENTION_ITEMS: DemoAttentionItem[] = [
  {
    id: "demo-esc-1",
    type: "escalation",
    title: "Blocker: Deploy failing on staging",
    description: "Agent needs approval to promote fix to production",
    route: "/escalations/demo-esc-1",
    routeLabel: "View escalation",
    createdAt: new Date().toISOString(),
    agentName: "Ziggy Demo — Working",
  },
  {
    id: "demo-q-1",
    type: "question",
    title: "Question: Which API version to use?",
    description: "Agent asks whether to target v1 or v2 API for new integration",
    route: "/escalations/demo-q-1",
    routeLabel: "Answer question",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    agentName: "Ziggy Demo — Waiting",
  },
];

export const DEMO_EMPTY_ATTENTION: DemoAttentionItem[] = [];