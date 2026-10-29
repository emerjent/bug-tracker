"use client";

import { useState } from "react";

import {
  type DemoAgentReport,
  getAgentStrikeStatus,
  getStrikeStatusLabel,
  getStrikeStatusClass,
} from "@/lib/agent-report-cards/demo-data";
import { AgentStrikesPopover } from "./AgentStrikesPopover";
import { agentsSurface, agentsLink } from "@/app/(app)/settings/agents/agents-ui";

interface AgentReportCardProps {
  agent: DemoAgentReport;
  onViewDetails: (agent: DemoAgentReport) => void;
}

export function AgentReportCard({ agent, onViewDetails }: AgentReportCardProps) {
  const status = getAgentStrikeStatus(agent);
  const [strikePopupOpen, setStrikePopupOpen] = useState(false);

  const displayName = agent.secondaryId
    ? `${agent.name} <span className="font-normal text-zk-muted"> · ${agent.secondaryId}</span>`
    : agent.name;

  return (
    <>
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
          <button
            type="button"
            onClick={() => setStrikePopupOpen(true)}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition ${getStrikeStatusClass(status.status)} hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2`}
            aria-label={`View strikes for ${agent.name}`}
          >
            {getStrikeStatusLabel(status.status)}
          </button>
          <button
            type="button"
            onClick={() => onViewDetails(agent)}
            className={`inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium transition ${agentsLink}`}
          >
            View details
          </button>
        </div>
      </div>
    </li>
    {strikePopupOpen && (
      <AgentStrikesPopover agent={agent} onClose={() => setStrikePopupOpen(false)} />
    )}
    </>
  );
}