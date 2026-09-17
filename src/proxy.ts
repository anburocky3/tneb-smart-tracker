import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("tneb_auth_token")?.value;
  const { pathname } = request.nextUrl;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY);
      isAuthenticated = true;
    } catch (e) {
      isAuthenticated = false;
    }
  }

  // 1. Redirect authenticated users away from /register
  if (isAuthenticated && pathname === "/register") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Protect sensitive routes (e.g., /meter/[id])
  // The root route '/' is handled by SecurityWrapper, so we don't redirect it here
  // to avoid infinite loops, as the login form is on the root page.
  if (!isAuthenticated && pathname.startsWith("/meter")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/register", "/meter/:path*"],
};
