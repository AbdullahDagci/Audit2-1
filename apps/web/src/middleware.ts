import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get("auth-session")?.value === "true";

  // Giriş yapmış kullanıcı login'e gelirse → dashboard'a yönlendir
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Giriş yapmamış kullanıcı korumalı sayfaya gelirse → login'e yönlendir
  if (pathname !== "/login" && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.png|logo|api|.*\\.png$|.*\\.ico$|.*\\.jpg$|.*\\.svg$).*)"],
};
