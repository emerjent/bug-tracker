import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { loadMilestoneSummaries, milestoneScopeFor } from "@/lib/milestone-stats";
import { dueDateValue } from "@/lib/milestones";
import { MilestoneManager } from "@/components/milestone-manager";

/* Distinct browser-tab title; the root layout appends "· Ziki". */
export const metadata = { title: "Milestones" };

export default async function SettingsMilestonesPage() {
  const scope = await milestoneScopeFor(await requireUser());
  if (!scope.ok) {
    if (scope.forbidden) redirect("/issues");
    return (
      <div className="space-y-3">
        <Link href="/issues" className="text-sm text-zk-accent hover:underline">
          ← Back to issues
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-zk-text">
          Milestone management
        </h1>
        <p className="max-w-xl text-sm text-zk-text2">
          Open an organization first. Milestones belong to one organization, not to every
          account on the site.
        </p>
        <p className="text-sm">
          <Link href="/tenants" className="font-medium text-zk-accent hover:underline">
            Choose an organization
          </Link>
        </p>
      </div>
    );
  }

  const milestones = await loadMilestoneSummaries({ tenantId: scope.tenantId });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/issues" className="text-sm text-zk-accent hover:underline">
          ← Back to issues
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-zk-text">
          Milestone management
        </h1>
        <p className="text-sm text-zk-text2">
          Group issues into a release or sprint. Closing a milestone keeps its issues;
          deleting one removes them from it without deleting them.
        </p>
      </div>

      <MilestoneManager
        milestones={milestones.map((m) => ({ ...m, dueDate: dueDateValue(m.dueDate) || null }))}
      />
    </div>
  );
}
