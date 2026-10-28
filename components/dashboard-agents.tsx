"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BASE_PATH } from "@/lib/base-path";
import { RelativeTime } from "@/components/relative-time";

/**
 * The serialized row the server sends and the poll endpoint returns. Kept
 * local (not imported from the server-only data module) so this client
 * component has no edge into server code.
 */
export type DashboardAgentStatus = "waiting" | "working" | "idle" | "offline";

export type DashboardAgentView = {
  id: string;
  name: string;
  model: string | null;
  level: string;
  status: DashboardAgentStatus;
  activity: string;
  lastSeenAt: string | null;
};

export const AGENTS_POLL_MS = 30_000;

const statusMeta: Record<
  DashboardAgentStatus,
  { label: string; dot: string; text: string }
> = {
  waiting: { label: "Waiting on you", dot: "bg-sky-tint", text: "text-zk-info-fg" },
  working: { label: "Working", dot: "bg-zk-warn-fg", text: "text-zk-warn-fg" },
  idle: { label: "Idle", dot: "bg-zk-ok-fg", text: "text-zk-ok-fg" },
  offline: { label: "Offline", dot: "bg-zk-muted", text: "text-zk-muted" },
};

/** Closes a popover on outside click or Escape, returning focus to its trigger. */
function useDismiss(
  open: boolean,
  close: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  triggerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, containerRef, triggerRef]);
}

export function DashboardAgents({
  initial,
}: {
  initial: DashboardAgentView[];
}) {
  const [agents, setAgents] = useState(initial);
  const [open, setOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpContainerRef = useRef<HTMLDivElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);

  useDismiss(helpOpen, () => setHelpOpen(false), helpContainerRef, helpTriggerRef);

  // Section-only refresh: the cards above are not re-fetched, so the page
  // never jumps while someone is reading it.
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const poll = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch(`${BASE_PATH}/api/dashboard/agents`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || controller.signal.aborted) return;
        const data = (await response.json()) as { agents?: DashboardAgentView[] };
        if (!controller.signal.aborted && Array.isArray(data.agents)) setAgents(data.agents);
      } catch {
        // A failed or aborted poll keeps the last good rows; the next one retries.
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(poll, AGENTS_POLL_MS);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, []);

  return (
    <section
      aria-labelledby="agents-heading"
      className="overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface"
    >
      <div className="flex items-center justify-between border-b border-zk-divider px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 id="agents-heading" className="text-base font-bold text-zk-text sm:text-lg">
            Your agents
          </h2>
          <span
            aria-label={`${agents.length} agent${agents.length === 1 ? "" : "s"}`}
            className="rounded-full border border-zk-border bg-zk-tint px-2 py-0.5 text-xs font-semibold text-zk-accent"
          >
            {agents.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div ref={helpContainerRef} className="relative">
            <button
              ref={helpTriggerRef}
              type="button"
              aria-expanded={helpOpen}
              aria-haspopup="dialog"
              aria-label="Understand agent statuses"
              onClick={() => setHelpOpen((value) => !value)}
              className="rounded-full p-2 text-zk-muted transition hover:bg-zk-tint hover:text-zk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01" />
              </svg>
            </button>
            {helpOpen ? (
              <div
                role="dialog"
                aria-label="Agent status meanings"
                className="absolute top-full z-50 mt-1.5 w-80 rounded-[20px] border border-zk-border bg-zk-surface p-4 text-sm shadow-[0_16px_40px_rgba(11,23,51,0.16)] right-0"
              >
                <div className="flex items-center justify-between border-b border-zk-divider pb-2">
                  <span className="font-bold text-zk-text">Agent statuses</span>
                  <button
                    type="button"
                    onClick={() => setHelpOpen(false)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-zk-muted hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    aria-label="Close"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-zk-text2">
                  <div>
                    <p className="flex items-center gap-2 font-medium text-zk-info-fg">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-tint" aria-hidden="true" />
                      <span>Waiting on you</span>
                    </p>
                    <p className="mt-1 ml-7 text-xs">The agent asked you a question. <Link href="/escalations" className="font-semibold text-zk-accent hover:underline" onClick={() => setHelpOpen(false)}>Go to Agent Escalations</Link> to answer it.</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 font-medium text-zk-warn-fg">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zk-warn-fg" aria-hidden="true" />
                      <span>Working</span>
                    </p>
                    <p className="mt-1 ml-7 text-xs">The agent is actively working on an issue (has a live claim with recent activity).</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 font-medium text-zk-ok-fg">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zk-ok-fg" aria-hidden="true" />
                      <span>Idle</span>
                    </p>
                    <p className="mt-1 ml-7 text-xs">The agent was seen recently (within 24 hours) but has no active work.</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 font-medium text-zk-muted">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zk-muted" aria-hidden="true" />
                      <span>Offline</span>
                    </p>
                    <p className="mt-1 ml-7 text-xs">The agent hasn't checked in for 24+ hours. Verify it's still running.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="agents-body"
            aria-label="Toggle Your agents section"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full p-2 text-zk-muted transition hover:bg-zk-tint hover:text-zk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
          >
            <svg
              className={`h-5 w-5 transition-transform motion-safe:duration-200 ${open ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div id="agents-body">
          {agents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-medium text-zk-text">No agents yet</p>
              <p className="mt-1 text-sm text-zk-muted">
                Pair an agent to let it work on your issues and report back here.
              </p>
              <Link
                href="/settings/agents/pair"
                className="mt-4 inline-flex h-[42px] items-center justify-center rounded-full bg-electric-blue-strong px-4 text-sm font-semibold text-white transition hover:bg-[#255fe0]"
              >
                Pair your first agent
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zk-divider bg-zk-tint/70 text-xs font-semibold uppercase tracking-wider text-zk-accent">
                    <th scope="col" className="px-5 py-3">Agent</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3">Current activity</th>
                    <th scope="col" className="px-5 py-3 text-right">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zk-divider">
                  {agents.map((agent) => {
                    const meta = statusMeta[agent.status];
                    return (
                      <tr key={agent.id} className="transition hover:bg-zk-tint/40">
                        <td className="px-5 py-3.5 font-semibold text-zk-text">
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{agent.name}</span>
                            {agent.model ? (
                              <span className="truncate text-xs font-normal text-zk-muted">
                                {agent.model}
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-5 py-3.5 font-medium ${meta.text}`}>
                          {meta.label}
                        </td>
                        <td className="max-w-[22rem] truncate px-5 py-3.5 text-zk-text2">
                          {agent.activity}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-xs text-zk-muted">
                          {agent.lastSeenAt ? (
                            <RelativeTime date={agent.lastSeenAt} />
                          ) : (
                            "Never"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
