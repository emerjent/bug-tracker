import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { normalizeReferralCode, REFERRAL_COOKIE_NAME } from "@/lib/referrals";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalized = normalizeReferralCode(code);
  const url = new URL(request.url);
  const callbackUrl = safeCallbackUrl(url.searchParams.get("callbackUrl"));

  const response = NextResponse.redirect(
    new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url),
  );

  if (normalized) {
    const cookieStore = await cookies();
    cookieStore.set(REFERRAL_COOKIE_NAME, normalized, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    // Mirror on the response for clients that read it during the redirect.
    response.cookies.set(REFERRAL_COOKIE_NAME, normalized, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}