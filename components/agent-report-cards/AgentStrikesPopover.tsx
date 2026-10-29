"use client";

import { useEffect } from "react";

import {
  type DemoAgentReport,
  getAgentStrikeStatus,
  getReasonLabel,
  formatEventDate,
} from "@/lib/agent-report-cards/demo-data";
import { agentsMutedClass } from "@/app/(app)/settings/agents/agents-ui";

interface AgentStrikesPopoverProps {
  agent: DemoAgentReport;
  onClose: () => void;
}

export function AgentStrikesPopover({ agent, onClose }: AgentStrikesPopoverProps) {
  const status = getAgentStrikeStatus(agent);
  const remaining = Math.max(0, status.maxStrikes - status.strikeCount);

  // Close on Escape key for accessibility
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="strikes-popup-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface shadow-[0_24px_56px_rgba(11,23,51,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zk-divider px-5 py-4">
          <h2 id="strikes-popup-title" className="text-lg font-bold text-zk-text">
            Agent strikes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zk-muted transition hover:bg-zk-tint hover:text-zk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {status.status === "not-applicable" ? (
            <div className="space-y-2 text-sm text-zk-text2">
              <p className="font-medium">Not applicable to this role</p>
              <p>
                The automatic strike-based demotion rule applies to Contributors only.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-zk-muted">Strike summary</p>
                <p className="text-zk-text">
                  {`${status.strikeCount} of ${status.maxStrikes} strikes`}
                </p>
                {remaining > 0 ? (
                  <>
                    <p className="text-sm text-zk-warn-fg">
                      {`${remaining} more qualifying strike${remaining !== 1 ? "s" : ""} within 7 days`}
                    </p>
                    <p className="text-sm text-zk-warn-fg">
                      trigger automatic demotion to Observer
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zk-bad-fg">
                    At demotion threshold — an additional qualifying strike will trigger automatic demotion to Observer.
                  </p>
                )}
              </div>

              {status.qualifyingEvents.length === 0 ? (
                <p className={agentsMutedClass}>No qualifying strikes in the last seven days.</p>
              ) : (
                <ul className="space-y-3" role="list">
                  {status.qualifyingEvents.map((event) => (
                    <li key={event.id} className="flex flex-col gap-1 p-3 rounded-[14px] bg-zk-tint">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 h-2 w-2 rounded-full bg-electric-blue-strong mt-2" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zk-text">{getReasonLabel(event.reason)}</p>
                          {event.taskDescription && (
                            <p className="mt-0.5 text-sm text-zk-text2">{event.taskDescription}</p>
                          )}
                          <p className="mt-1 text-xs font-mono text-zk-muted">
                            Recorded: {formatEventDate(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
