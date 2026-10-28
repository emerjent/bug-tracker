"use client";

import { useState } from "react";
import {
  type DemoAgentReport,
  getAgentStrikeStatus,
  getStrikeStatusLabel,
  getStrikeStatusClass,
  getReasonLabel,
  formatEventDate,
} from "@/lib/agent-report-cards/demo-data";
import {
  agentsSurface,
  agentsMutedClass,
  agentsLink,
} from "@/app/(app)/settings/agents/agents-ui";

interface AgentReportCardProps {
  agent: DemoAgentReport;
  onViewDetails: (agent: DemoAgentReport) => void;
}

export function AgentReportCard({ agent, onViewDetails }: AgentReportCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getAgentStrikeStatus(agent);

  const displayName = agent.secondaryId
    ? `${agent.name} <span className="font-normal text-zk-muted"> · ${agent.secondaryId}</span>`
    : agent.name;

  return (
    <li className={`${agentsSurface} p-4 sm:p-5 transition hover:bg-zk-tint/40`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="relative shrink-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-white bg-electric-blue-strong">
              {agent.name.trim().split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-base font-extrabold text-zk-text" dangerouslySetInnerHTML={{ __html: displayName }} />
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-zk-info-bg text-zk-info-fg">
                {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
              </span>
            </div>
            <p className="text-xs text-zk-muted">
              {status.status === "not-applicable" 
                ? "Automatic strike-based demotion does not apply to this role" 
                : `${status.strikeCount} of ${status.maxStrikes} qualifying strikes in the last 7 days`}
            </p>
          </div>
        </div>
        <div className="w-full shrink-0 lg:max-w-md flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getStrikeStatusClass(status.status)}`}>
            {getStrikeStatusLabel(status.status)}
          </span>
          <button
            type="button"
            onClick={() => onViewDetails(agent)}
            className={`inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium transition ${agentsLink}`}
          >
            View details
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zk-divider space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-zk-muted">Reporting window:</span>
            <span className="font-mono text-zk-text">
              Last 7 days (rolling)
            </span>
          </div>

          {status.qualifyingEvents.length === 0 ? (
            <p className={agentsMutedClass}>
              {status.status === "not-applicable"
                ? "The automatic strike-based demotion rule applies to Contributors only. Reviewers and other roles are not subject to this rule."
                : "No qualifying strikes in the last seven days."}
            </p>
          ) : (
            <ul className="space-y-2" role="list">
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className={`inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium transition ${agentsLink}`}
            >
              Close details
            </button>
          </div>
        </div>
      )}
    </li>
  );
}