import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { BASE_PATH } from "@/lib/base-path";

/**
 * Demo paths that are accessible without authentication (public demo mode)
 */
const DEMO_PATHS = [
  "/dashboard",
  "/settings",
  "/settings/agents",
  "/escalations",
  "/feed",
  "/workers",
  "/leaderboard",
  "/projects",
  "/notifications",
  "/team",
  "/docs",
];

function isDemoPath(path: string): boolean {
  return DEMO_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Middleware — handles /bugs redirects and auth for non-demo paths.
 * Demo paths bypass auth entirely.
 */
export async function middleware(req: import("next/server").NextRequest) {
  const rawPath = req.nextUrl.pathname;

  // Seamless backwards compatibility: redirect /bugs and /bugs/* to /issues and /issues/*
  const isBugsPath = rawPath === "/bugs" || rawPath.startsWith("/bugs/");
  if (isBugsPath) {
    const newPath = rawPath.replace(/^\/bugs/, "/issues");
    const targetUrl = new URL(
      BASE_PATH ? `${BASE_PATH}${newPath}` : newPath,
      req.nextUrl.origin,
    );
    targetUrl.search = req.nextUrl.search;
    return NextResponse.redirect(targetUrl, 308);
  }
  if (rawPath.startsWith("/api/bugs/")) {
    const newPath = rawPath.replace(/^\/api\/bugs\//, "/api/issues/");
    const targetUrl = new URL(
      BASE_PATH ? `${BASE_PATH}${newPath}` : newPath,
      req.nextUrl.origin,
    );
    targetUrl.search = req.nextUrl.search;
    return NextResponse.redirect(targetUrl, 308);
  }

  // Demo paths: bypass auth entirely
  if (isDemoPath(rawPath)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", rawPath);
    requestHeaders.set("x-demo-mode", "true");
    
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return response;
  }

  // Non-demo paths: require authentication
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET 
  });
  
  if (!token) {
    const url = new URL(
      BASE_PATH ? `${BASE_PATH}/login` : "/login",
      req.nextUrl.origin,
    );
    url.searchParams.set("callbackUrl", rawPath);
    return NextResponse.redirect(url);
  }

  // Authenticated: pass user info to layout
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", rawPath);
  requestHeaders.set("x-user-id", token.sub || "");
  requestHeaders.set("x-user-email", token.email || "");
  requestHeaders.set("x-user-name", token.name || "");
  requestHeaders.set("x-user-role", (token as any).role || "user");
  
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export default middleware;