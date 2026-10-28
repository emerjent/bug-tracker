"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import {
  answerDecisionCard,
  listDecisionCardQueue,
} from "@/lib/decision-cards";
import { revalidatePath } from "next/cache";

/** Answer an open decision card. Writes the answer back as a typed comment. */
export async function answerDecisionCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const cardId = formData.get("cardId");
  const answer = formData.get("answer");
  if (typeof cardId !== "string" || typeof answer !== "string") {
    return;
  }

  const result = await answerDecisionCard(user.id, { cardId, answer });
  if (result.status !== 200) {
    return;
  }
  revalidatePath("/decisions");
  if (result.bugId) redirect(`/issues/${result.bugId}`);
  redirect("/decisions");
}

/** List the owner's open decision cards, sorted by blocked work. */
export async function listDecisionCardQueueAction() {
  const user = await requireUser();
  return listDecisionCardQueue(user.id);
}
