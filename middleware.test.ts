import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: () => ({
    auth: (fn: (req: unknown) => unknown) => fn,
  }),
}));

import middleware from "./middleware";

type MockRequest = {
  nextUrl: URL;
  auth: { user: { id: string; email: string } } | null;
  headers: Headers;
};

function createMockReq({
  pathname,
  search = "",
  isLoggedIn = false,
  userAgent = "Mozilla/5.0",
}: {
  pathname: string;
  search?: string;
  isLoggedIn?: boolean;
  userAgent?: string;
}): MockRequest {
  const url = new URL(`https://ziki.dev${pathname}${search}`);
  return {
    nextUrl: url,
    auth: isLoggedIn ? { user: { id: "u1", email: "user@test.com" } } : null,
    headers: new Headers({
      "user-agent": userAgent,
    }),
  };
}

const runMiddleware = (req: MockRequest): Response => {
  return (middleware as unknown as (r: unknown) => Response)(req);
};

describe("middleware routing (#348)", () => {
  it("allows unauthenticated requests to / without redirecting to /login (#487)", () => {
    const req = createMockReq({ pathname: "/", isLoggedIn: false });
    const res = runMiddleware(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets an unauthenticated scheduler call reach /api/internal/cron instead of /login (#571)", () => {
    const res = runMiddleware(createMockReq({ pathname: "/api/internal/cron", isLoggedIn: false }));

    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows unauthenticated requests to /session-expired without redirecting to /login", () => {
    const req = createMockReq({ pathname: "/session-expired", isLoggedIn: false });
    const res = runMiddleware(req);

    // Should not redirect to login
    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects legacy /bugs requests to /issues with 308 permanent redirect", () => {
    const req = createMockReq({ pathname: "/bugs", isLoggedIn: false });
    const res = runMiddleware(req);

    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://ziki.dev/issues");
  });

  it("lets a guest open a shareable invite link", () => {
    const req = createMockReq({ pathname: "/join/abc", isLoggedIn: false });
    const res = runMiddleware(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });
});