import Link from "next/link";
import { parseEscalationBody } from "@/lib/escalation-body";
import { IssueApprovalBanner } from "@/components/issue-approval-banner";
import { EscalationTypeBadge, QuickResolveButtons } from "@/app/(app)/escalations/escalation-controls";
import { LocalTime } from "@/components/local-time";

export type AttentionQuestion = {
  id: string;
  createdAt: Date | string;
  body: string;
  agent: { name: string };
  bug: { id: string; number: number; title: string } | null;
};

export type AttentionApproval = {
  id: string;
  stage: string;
  status: string;
  createdAt: Date | string;
  bug: { id: string; number: number; title: string } | null;
  rule: { issueType: { name: string } | null; fileGlob: string | null } | null;
};

export type AttentionData = {
  isAdmin: boolean;
  questions: { items: AttentionQuestion[] };
  approvals: { items: AttentionApproval[] };
} | null;

export type NotificationSummary = {
  id: string;
  title: string;
  readAt: Date | string | null;
  createdAt: Date | string;
};

export function DashboardAttentionPanel({
  tenantId,
  attention,
  notifications,
}: {
  tenantId: string | null;
  attention: AttentionData;
  notifications: NotificationSummary[];
}) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <section
        aria-labelledby="attention-heading"
        className="rounded-[20px] border border-zk-border bg-zk-surface p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="attention-heading" className="text-lg font-bold text-zk-text">
            Needs your attention
          </h2>
          <Link
            href="/activity"
            className="text-sm font-semibold text-zk-accent hover:underline"
          >
            Open activity
          </Link>
        </div>
        <p className="mt-1 text-sm text-zk-muted">
          Agent questions and approvals waiting on you.
        </p>

        {!tenantId ? (
          <p className="mt-4 text-sm text-zk-muted">
            Join a workspace to see agent requests.
          </p>
        ) : null}

        {tenantId &&
        (attention?.questions.items.length ?? 0) === 0 &&
        (attention?.approvals.items.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-zk-muted">Nothing needs you right now.</p>
        ) : null}

        <div className="mt-4 space-y-4">
          {(attention?.questions.items ?? []).map((question) => {
            const parsed = parseEscalationBody(question.body);
            return (
              <article
                key={question.id}
                className="space-y-2 rounded-xl border border-zk-warn-bd bg-zk-warn-bg/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <EscalationTypeBadge type={parsed.type} />
                  <span className="font-semibold text-zk-text">{question.agent.name}</span>
                  <LocalTime date={question.createdAt} className="text-xs text-zk-muted" />
                </div>
                <p className="whitespace-pre-wrap text-sm text-zk-text">
                  {parsed.cleanBody}
                </p>
                {question.bug ? (
                  <p className="text-xs text-zk-muted">
                    Issue:{" "}
                    <Link
                      href={`/issues/${question.bug.id}`}
                      className="font-semibold text-zk-accent hover:underline"
                    >
                      #{question.bug.number} {question.bug.title}
                    </Link>
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 border-t border-zk-divider pt-2">
                  <QuickResolveButtons escalationId={question.id} />
                  <Link
                    href={`/escalations/${question.id}`}
                    className="text-xs font-semibold text-zk-accent hover:underline"
                  >
                    Write a response
                  </Link>
                </div>
              </article>
            );
          })}

          {attention?.isAdmin
            ? (attention?.approvals.items ?? []).map((approval) => (
                <div key={approval.id} className="space-y-2">
                  {approval.bug ? (
                    <p className="text-xs text-zk-muted">
                      Issue:{" "}
                      <Link
                        href={`/issues/${approval.bug.id}`}
                        className="font-semibold text-zk-accent hover:underline"
                      >
                        #{approval.bug.number} {approval.bug.title}
                      </Link>
                    </p>
                  ) : null}
                  <IssueApprovalBanner
                    approval={{
                      id: approval.id,
                      stage: approval.stage,
                      status: approval.status,
                      rule: approval.rule
                        ? {
                            issueType: approval.rule.issueType
                              ? { name: approval.rule.issueType.name }
                              : null,
                            fileGlob: approval.rule.fileGlob,
                          }
                        : null,
                    }}
                    canDecide={attention?.isAdmin ?? false}
                  />
                </div>
              ))
            : null}
        </div>
      </section>
      <section
        aria-labelledby="notifications-heading"
        className="rounded-[20px] border border-zk-border bg-zk-surface p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="notifications-heading" className="text-lg font-bold text-zk-text">
            Recent notifications
          </h2>
          <Link
            href="/notifications"
            className="text-sm font-semibold text-zk-accent hover:underline"
          >
            View all
          </Link>
        </div>
        {notifications.length === 0 ? (
          <p className="mt-4 text-sm text-zk-muted">No recent notifications.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.map((notification) => (
              <li key={notification.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    notification.readAt ? "bg-zk-chip" : "bg-electric-blue-strong"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-medium text-zk-text">{notification.title}</p>
                  <p className="text-xs text-zk-muted">
                    <LocalTime date={notification.createdAt} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
