import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Public paths — no auth required */
const PUBLIC: string[] = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/sample-tickets.csv",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow _next internals, fonts, favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("hr_auth")?.value;
  const expected = btoa(`admin:${process.env.ADMIN_PASSWORD ?? "admin"}`);

  if (token !== expected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
