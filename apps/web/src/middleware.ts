import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For demo purposes, skip auth check - mock mode
  // In production, check Supabase session via cookie
  const isAuthenticated = request.cookies.get("auth-session")?.value === "true";

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname !== "/login" && pathname !== "/" && !isAuthenticated) {
    // Allow access in development/demo mode
    // Uncomment below for production auth enforcement:
    // return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
