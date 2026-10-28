"use client";

import { useMemo, useState } from "react";
import type { DemoAgentReport, AgentRole, DemoNotification } from "@/lib/agent-report-cards/demo-data";
import { DEMO_AGENT_REPORTS, DEMO_NOTIFICATIONS, getAgentStrikeStatus, getStrikeStatusLabel, getStrikeStatusClass, getReasonLabel, formatEventDate } from "@/lib/agent-report-cards/demo-data";
import { AgentReportCard } from "./AgentReportCard";
import {
  agentsSurface,
  agentsMutedClass,
  agentsLink,
  agentsInputClass,
} from "@/app/(app)/settings/agents/agents-ui";

type FilterId = "all" | "contributor" | "reviewer" | "with-strikes" | "no-strikes" | "demoted";

interface AgentReportCardsProps {
  demoNotifications?: DemoNotification[];
  onNotificationRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export function AgentReportCards({ 
  demoNotifications = DEMO_NOTIFICATIONS,
  onNotificationRead,
  onMarkAllRead,
}: AgentReportCardsProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<DemoAgentReport | null>(null);

  const tabs: { id: FilterId; label: string }[] = [
    { id: "all", label: "All agents" },
    { id: "contributor", label: "Contributors" },
    { id: "reviewer", label: "Reviewers" },
    { id: "with-strikes", label: "With strikes" },
    { id: "no-strikes", label: "No strikes" },
    { id: "demoted", label: "Demoted" },
  ];

  const visible = useMemo(() => {
    return DEMO_AGENT_REPORTS.filter((agent) => {
      const status = getAgentStrikeStatus(agent);
      
      // Role filter
      if (filter === "contributor" && agent.role !== "contributor") return false;
      if (filter === "reviewer" && agent.role !== "reviewer") return false;
      
      // Strike status filters
      if (filter === "with-strikes" && (status.status === "no-strikes" || status.status === "not-applicable")) return false;
      if (filter === "no-strikes" && status.status !== "no-strikes") return false;
      if (filter === "demoted" && status.status !== "demoted") return false;
      
      // Search query
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.role.toLowerCase().includes(q) ||
        (agent.secondaryId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [filter, query]);

  const hasActiveFilters = filter !== "all" || query.trim() !== "";

  return (
    <section aria-labelledby="report-cards-heading" className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 id="report-cards-heading" className="text-3xl font-extrabold tracking-tight text-zk-text">
              Agent Report Cards
            </h2>
            <p className={agentsMutedClass}>
              See which agents have received strikes and understand why.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-bold text-zk-text2 shrink-0">DEMO DATA</span>
        </div>
      </div>

      <div className={`${agentsSurface} p-4 sm:p-6 space-y-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search agents by name or role</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents by name or role..."
              className={agentsInputClass}
            />
          </label>
          <div role="tablist" aria-label="Filter agents" className="inline-flex flex-wrap gap-1 rounded-full bg-zk-seg p-1">
            {tabs.map((tab) => {
              const on = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[34px] rounded-full px-3.5 text-[13px] transition ${on
                    ? "bg-zk-surface font-bold text-zk-text shadow-sm"
                    : "font-medium text-zk-text2 hover:text-zk-text"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
            className={`${agentsLink} text-xs self-start`}
          >
            Reset filters
          </button>
        )}

        {visible.length === 0 ? (
          <p className={`${agentsMutedClass} ${agentsSurface} p-6`}>
            {DEMO_AGENT_REPORTS.length === 0
              ? "No agents yet."
              : "No agents match your search and filters."}
          </p>
        ) : (
          <ul className="space-y-3" role="list">
            {visible.map((agent) => (
              <AgentReportCard
                key={agent.id}
                agent={agent}
                onViewDetails={setSelectedAgent}
              />
            ))}
          </ul>
        )}
      </div>

      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </section>
  );
}

function AgentDetailPanel({ agent, onClose }: { agent: DemoAgentReport; onClose: () => void }) {
  const status = getAgentStrikeStatus(agent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface shadow-[0_24px_56px_rgba(11,23,51,0.22)]">
        <div className="flex items-center justify-between border-b border-zk-divider px-5 py-4">
          <h3 id="detail-title" className="text-lg font-bold text-zk-text">
            {agent.name} {agent.secondaryId && <span className="font-normal text-zk-muted"> · {agent.secondaryId}</span>}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zk-muted transition hover:bg-zk-tint hover:text-zk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
            aria-label="Close details"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-zk-info-bg text-zk-info-fg">
              {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getStrikeStatusClass(status.status)}`}>
              {getStrikeStatusLabel(status.status)}
            </span>
          </div>

          {status.status === "not-applicable" ? (
            <div className="space-y-2 text-sm text-zk-text2">
              <p className="font-medium">Not applicable to this role</p>
              <p>
                The automatic strike-based demotion rule applies to Contributors only. Reviewers and other roles are not subject to this rule.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-zk-muted">Reporting window</p>
                <p className="text-zk-text">Rolling 7 days from today</p>
              </div>

              {status.qualifyingEvents.length === 0 ? (
                <p className={agentsMutedClass}>
                  No qualifying strikes in the last seven days.
                </p>
              ) : (
                <ul className="space-y-3" role="list">
                  {status.qualifyingEvents.map((event) => (
                    <li key={event.id} className="flex flex-col gap-1.5 p-3 rounded-[14px] bg-zk-tint">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 h-2 w-2 rounded-full bg-electric-blue-strong mt-2" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zk-text">{getReasonLabel(event.reason)}</p>
                          <p className="mt-0.5 text-sm text-zk-text2">{event.taskDescription}</p>
                          <p className="mt-1 text-xs font-mono text-zk-muted">Recorded: {formatEventDate(event.createdAt)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold text-zk-accent hover:underline ${agentsLink}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}