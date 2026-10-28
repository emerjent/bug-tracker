import { requireUser } from "@/lib/auth-helpers";
import { answerDecisionCardAction, listDecisionCardQueueAction } from "@/app/actions/decision-cards";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Decision cards" };

function remainingText(ttlSeconds: number): string {
  if (ttlSeconds <= 0) return "Expired — default applies";
  const h = Math.floor(ttlSeconds / 3600);
  const m = Math.floor((ttlSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m ${ttlSeconds % 60}s left`;
}

export default async function DecisionsPage() {
  await requireUser();
  const cards = await listDecisionCardQueueAction();

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-[20px] border border-dashed border-zk-border bg-zk-surface p-6 text-sm text-zk-muted">
        <p className="font-semibold text-zk-text">No pending decision cards</p>
        <p className="mt-1">
          When an agent needs your call, it lands here sorted by how much work
          it is blocking — not by age. Each card carries a timer, so you cannot
          be blocked forever.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zk-text sm:text-2xl">Decision cards</h1>
          <p className="mt-1 text-sm text-zk-muted">
            Agents ask, you answer. Answered cards become comments on the
            issue so the thread keeps its history.
          </p>
        </div>
        <p className="text-sm text-zk-muted">{cards.length} pending</p>
      </div>

      <ul className="divide-y divide-zk-divider overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface">
        {cards.map((card) => {
          const expired = card.ttlSeconds <= 0;
          return (
            <li key={card.id} className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-zk-tint">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-zk-muted">
                    {card.bugNumber ? (
                      <span className="font-semibold text-zk-accent">Issue #{card.bugNumber}</span>
                    ) : null}
                    {card.blockedByCount > 0 ? (
                      <span className="rounded-full bg-zk-warn-bg px-2 py-0.5 text-[10px] font-semibold text-zk-warn-fg">
                        {card.blockedByCount} blocked
                      </span>
                    ) : null}
                    <span>{expired ? "expired" : `expires ${remainingText(card.ttlSeconds)}`}</span>
                  </div>
                  <p className="mt-1 text-sm text-zk-text break-words">{card.question}</p>
                  {card.tried && (
                    <p className="mt-1 text-sm text-zk-text2 break-words">Tried: {card.tried}</p>
                  )}
                  {card.costSoFar != null && (
                    <p className="mt-1 text-sm text-zk-text2 break-words">Cost so far: {card.costSoFar} min</p>
                  )}
                  {card.recommendation != null && card.confidence != null && (
                    <p className="mt-1 text-sm text-zk-text2 break-words">
                      Agent recommends option {card.recommendation + 1} ({card.confidence}% confidence)
                    </p>
                  )}
                </div>
              </div>
              <form
                action={answerDecisionCardAction}
                className="flex flex-wrap gap-2 mt-2"
                method="POST"
              >
                <input name="cardId" value={card.id} hidden />
                {card.options.map((opt) => (
                  <Button
                    key={opt.value}
                    type="submit"
                    name="answer"
                    value={opt.value}
                    disabled={expired}
                    className="text-sm whitespace-nowrap"
                  >
                    {opt.label}
                  </Button>
                ))}
                {card.defaultAnswer && !expired && (
                  <span className="mt-1 text-xs text-zk-muted">
                    Default “{card.defaultAnswer}” applies when the timer runs out.
                  </span>
                )}
                {expired && (
                  <span className="mt-1 text-xs text-zk-warn-fg">
                    Timer ran out — the default answer has been applied.
                  </span>
                )}
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
