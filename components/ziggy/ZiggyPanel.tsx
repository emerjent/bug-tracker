"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ZiggyCharacter } from "./ZiggyCharacter";
import { useReducedMotion } from "@/lib/ziggy/useReducedMotion";

/**
 * ZiggyPanel — compact help panel with three core functions.
 * No AI inference — deterministic keyword matching + verified routes.
 */

// Function 1: Find in Ziki — verified route registry
export interface HelpEntry {
  id: string;
  keywords: string[];
  route: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const ZIGGY_HELP_ENTRIES: HelpEntry[] = [
  {
    id: "agents-manage",
    keywords: ["agent", "manage", "settings", "pair", "connect", "register"],
    route: "/settings/agents",
    label: "Manage your agents",
    description: "Pair, configure, and view your AI agents",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  {
    id: "escalations",
    keywords: ["escalation", "question", "approval", "waiting", "answer", "respond", "blocker"],
    route: "/escalations",
    label: "Agent escalations",
    description: "Answer questions and resolve blockers from agents",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    id: "notifications",
    keywords: ["notification", "notify", "alert", "unread", "mention"],
    route: "/notifications",
    label: "Notifications",
    description: "View mentions, updates, and activity alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "issues",
    keywords: ["issue", "bug", "ticket", "report", "create", "new", "list", "view"],
    route: "/issues",
    label: "Issues",
    description: "Browse, create, and manage issues",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    id: "dashboard",
    keywords: ["dashboard", "overview", "stats", "points", "leaderboard", "home"],
    route: "/",
    label: "Dashboard",
    description: "Your workspace overview, points, and assigned work",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "settings",
    keywords: ["setting", "preference", "profile", "account", "security", "theme", "appearance"],
    route: "/settings",
    label: "Settings",
    description: "Manage your profile, theme, and preferences",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: "projects",
    keywords: ["project", "workspace", "team", "tenant", "area", "milestone"],
    route: "/projects",
    label: "Projects",
    description: "Manage projects, areas, and milestones",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "workers",
    keywords: ["worker", "leaderboard", "rank", "points", "top", "contributor"],
    route: "/workers",
    label: "Leaderboard",
    description: "View top contributors and point rankings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M12 13v8M5 21h14" />
      </svg>
    ),
  },
  {
    id: "feed",
    keywords: ["feed", "activity", "recent", "updates", "timeline"],
    route: "/feed",
    label: "Activity feed",
    description: "See recent activity across your workspace",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18h16" />
        <path d="M4 14h16" />
        <path d="M10 6h9a4 4 0 0 1 0 8h-1" />
        <path d="M10 6a4 4 0 0 0 0 8" />
      </svg>
    ),
  },
  {
    id: "docs",
    keywords: ["doc", "documentation", "help", "guide", "handbook", "api", "llms"],
    route: "/docs",
    label: "Documentation",
    description: "Read the handbook and API reference",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

// Simple keyword matching for Function 1
export function findHelpEntries(query: string): HelpEntry[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  return ZIGGY_HELP_ENTRIES.filter((entry) =>
    entry.keywords.some((kw) => normalized.includes(kw.toLowerCase()))
  ).slice(0, 5);
}

// Function 2 & 3: Agent status & attention needed — use existing API types
export interface AgentStatusInfo {
  id: string;
  name: string;
  model: string | null;
  level: string;
  status: "waiting" | "working" | "idle" | "offline";
  activity: string;
  lastSeenAt: string | null;
}

export interface EscalationInfo {
  id: string;
  type: string;
  title: string;
  body: string;
  agentName: string;
  createdAt: string;
  bugId?: string;
  bugTitle?: string;
}

export interface AttentionItem {
  id: string;
  type: "escalation" | "question" | "approval" | "redesign";
  title: string;
  description: string;
  route: string;
  routeLabel: string;
  createdAt: string;
  agentName?: string;
}

export interface ZiggyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  /** Current user's agents (for Function 2) */
  agents?: AgentStatusInfo[];
  /** Current escalations/questions needing attention (for Function 3) */
  attentionItems?: AttentionItem[];
  /** Reduced motion preference */
  reducedMotion?: boolean;
  /** Current character state */
  characterState?: "idle" | "waving" | "peeking";
  /** Cursor position for cursor awareness */
  cursorOffset?: { x: number; y: number } | null;
}

export function ZiggyPanel({
  isOpen,
  onClose,
  onNavigate,
  agents = [],
  attentionItems = [],
  reducedMotion = false,
  characterState = "idle",
  cursorOffset = null,
}: ZiggyPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HelpEntry[]>([]);
  const prefersReducedMotion = useReducedMotion();
  const effectiveReducedMotion = reducedMotion || prefersReducedMotion;

  // Focus management
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Search for Function 1
  useEffect(() => {
    if (activeTab === 1) {
      setSearchResults(findHelpEntries(searchQuery));
    }
  }, [searchQuery, activeTab]);

  // Handle Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close (but not on the panel itself)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tab 1: Find in Ziki
  const renderFindTab = () => (
    <div className="ziggy-panel-tab" role="tabpanel" aria-labelledby="tab-find">
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="ziggy-search" style={{ display: "none" }}>
          Search Ziki features
        </label>
        <input
          ref={inputRef}
          id="ziggy-search"
          type="search"
          placeholder="What are you looking for? (e.g., 'manage agents', 'notifications')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1.5px solid #E8D4B9",
            background: "#FFFFFF",
            fontSize: "14px",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            boxSizing: "border-box",
          } as React.CSSProperties}
        />
      </div>

      {searchQuery ? (
        searchResults.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => {
                    onNavigate(entry.route);
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #E8D4B9",
                    background: "#FAF8F3",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s ease, border-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F5E6C8";
                    e.currentTarget.style.borderColor = "#A8E6CF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FAF8F3";
                    e.currentTarget.style.borderColor = "#E8D4B9";
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #A8E6CF 0%, #7FD8BE 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {entry.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#1A202C" }}>
                      {entry.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: 2 }}>
                      {entry.description}
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8E6CF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3AF" }}>
            <div style={{ fontSize: "24px", marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No matches found</div>
            <div style={{ fontSize: "13px" }}>Try different keywords like "agents", "notifications", "issues"</div>
          </div>
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: "13px", color: "#9CA3AF", fontWeight: 500 }}>
            Popular shortcuts
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ZIGGY_HELP_ENTRIES.slice(0, 6).map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => {
                    onNavigate(entry.route);
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 10px",
                    borderRadius: 10,
                    border: "1px solid #E8D4B9",
                    background: "#FAF8F3",
                    cursor: "pointer",
                    transition: "background 0.1s ease, border-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F5E6C8";
                    e.currentTarget.style.borderColor = "#A8E6CF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FAF8F3";
                    e.currentTarget.style.borderColor = "#E8D4B9";
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #A8E6CF 0%, #7FD8BE 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {entry.icon}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#1A202C", textAlign: "center" }}>
                    {entry.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Tab 2: Agent Status
  const renderAgentStatusTab = () => (
    <div className="ziggy-panel-tab" role="tabpanel" aria-labelledby="tab-agent">
      {agents.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
          <div style={{ fontSize: "32px", marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 500, marginBottom: 4, color: "#1A202C" }}>
            No agents paired yet
          </div>
          <div style={{ fontSize: "13px", marginBottom: 16 }}>
            Connect an agent to see its status here
          </div>
          <button
            onClick={() => {
              onNavigate("/settings/agents/connect");
              onClose();
            }}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #A8E6CF 0%, #7FD8BE 100%)",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(127, 216, 190, 0.3)",
            }}
          >
            Connect an agent
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                padding: "14px",
                borderRadius: 12,
                border: "1px solid #E8D4B9",
                background: "#FAF8F3",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <ZiggyCharacter
                  state={characterState}
                  size={32}
                  reducedMotion={effectiveReducedMotion}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "#1A202C" }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280" }}>
                    {agent.model ? `${agent.model} • ` : ""}
                    {agent.level.charAt(0).toUpperCase() + agent.level.slice(1)}
                  </div>
                </div>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: "11px",
                    fontWeight: 600,
                    background:
                      agent.status === "waiting"
                        ? "#E0F2FE"
                        : agent.status === "working"
                        ? "#FEF3C7"
                        : agent.status === "idle"
                        ? "#D1FAE5"
                        : "#F3F4F6",
                    color:
                      agent.status === "waiting"
                        ? "#0369A1"
                        : agent.status === "working"
                        ? "#92400E"
                        : agent.status === "idle"
                        ? "#065F46"
                        : "#6B7280",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background:
                        agent.status === "waiting"
                          ? "#0369A1"
                          : agent.status === "working"
                          ? "#F59E0B"
                          : agent.status === "idle"
                          ? "#10B981"
                          : "#9CA3AF",
                    }}
                  />
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.4 }}>
                {agent.activity}
              </div>
              {agent.lastSeenAt && (
                <div style={{ marginTop: 8, fontSize: "11px", color: "#9CA3AF" }}>
                  Last seen: {new Date(agent.lastSeenAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Tab 3: Attention Needed
  const renderAttentionTab = () => (
    <div className="ziggy-panel-tab" role="tabpanel" aria-labelledby="tab-attention">
      {attentionItems.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
          <div style={{ fontSize: "32px", marginBottom: 12 }}>✨</div>
          <div style={{ fontWeight: 500, marginBottom: 4, color: "#1A202C" }}>
            All caught up!
          </div>
          <div style={{ fontSize: "13px" }}>
            No questions, approvals, or escalations need your attention right now.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {attentionItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.route);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px",
                borderRadius: 12,
                border: "1px solid #E8D4B9",
                background: "#FAF8F3",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s ease, border-color 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5E6C8";
                e.currentTarget.style.borderColor = "#A8E6CF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FAF8F3";
                e.currentTarget.style.borderColor = "#E8D4B9";
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background:
                    item.type === "escalation"
                      ? "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"
                      : item.type === "approval"
                      ? "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)"
                      : "linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.type === "escalation" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                    <path d="M12 9v4M12 17h.01" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                {item.type === "approval" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                )}
                {item.type === "question" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                )}
                {item.type === "redesign" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2.5">
                    <path d="M12 3v18M5 12h14" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#1A202C", marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11px", color: "#9CA3AF" }}>
                  {item.agentName && <span>From {item.agentName}</span>}
                  <span>•</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8E6CF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={panelRef}
      className="ziggy-panel"
      role="dialog"
      aria-label="Ziggy companion"
      aria-modal="true"
      style={{
        position: "fixed",
        bottom: 100,
        right: 24,
        width: 380,
        maxHeight: 520,
        background: "#FFFFFF",
        borderRadius: "20px",
        border: "1.5px solid #E8D4B9",
        boxShadow: `
          0 20px 40px rgba(26, 32, 44, 0.15),
          0 8px 16px rgba(26, 32, 44, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.5)
        `,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: effectiveReducedMotion
          ? "none"
          : "ziggy-panel-enter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <style jsx>{`
        @keyframes ziggy-panel-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #E8D4B9",
          background: "linear-gradient(180deg, #FAF8F3 0%, transparent 100%)",
          borderRadius: "20px 20px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ZiggyCharacter
            state={characterState}
            size={36}
            reducedMotion={effectiveReducedMotion}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#1A202C" }}>
              Ziggy
            </div>
            <div style={{ fontSize: "11px", color: "#9CA3AF" }}>Your Ziki companion</div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Ziggy"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: "#9CA3AF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.1s ease, color 0.1s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5E6C8";
            e.currentTarget.style.color = "#1A202C";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#9CA3AF";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tab navigation */}
      <div
        role="tablist"
        aria-label="Ziggy functions"
        style={{
          display: "flex",
          padding: "4px",
          background: "#FAF8F3",
          borderBottom: "1px solid #E8D4B9",
        }}
      >
        {[
          { id: 1, label: "Find", icon: "🔍" },
          { id: 2, label: "Agent", icon: "🤖" },
          { id: 3, label: "Attention", icon: "⚡" },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as 1 | 2 | 3)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 8px",
              borderRadius: 8,
              border: "none",
              background: activeTab === tab.id ? "#FFFFFF" : "transparent",
              color: activeTab === tab.id ? "#1A202C" : "#6B7280",
              fontSize: "12px",
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: "pointer",
              boxShadow: activeTab === tab.id ? "0 2px 8px rgba(26, 32, 44, 0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "14px" }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          maxHeight: 400,
        }}
      >
        {activeTab === 1 && renderFindTab()}
        {activeTab === 2 && renderAgentStatusTab()}
        {activeTab === 3 && renderAttentionTab()}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #E8D4B9",
          background: "#FAF8F3",
          borderRadius: "0 0 20px 20px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
          Press <kbd style={{ padding: "2px 6px", borderRadius: 4, background: "#E8D4B9", fontFamily: "inherit" }}>Esc</kbd> to close
        </span>
      </div>
    </div>
  );
}