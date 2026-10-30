import { redirect } from "next/navigation";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

/**
 * Zedu Bugs uses Google OAuth exclusively. Manual signup is deprecated and disabled.
 * Anyone accessing /signup is redirected to /login with preserved callbackUrl.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const ref = params.ref ? `&ref=${encodeURIComponent(params.ref)}` : "";
  redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}${ref}`);
}

