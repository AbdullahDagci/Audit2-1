import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sayfa bazlı rol yetkileri
const PAGE_ROLES: Record<string, string[]> = {
  "/dashboard": ["admin"],
  "/dashboard/manager": ["manager"],
  "/dashboard/inspections": ["admin", "manager", "inspector"],
  "/dashboard/branches": ["admin"],
  "/dashboard/templates": ["admin"],
  "/dashboard/users": ["admin"],
  "/dashboard/schedules": ["admin", "manager"],
  "/dashboard/reports": ["admin"],
  "/dashboard/activity-logs": ["admin"],
  "/dashboard/notifications": ["admin", "manager", "inspector"],
  "/dashboard/settings": ["admin"],
};

function getDefaultRoute(role: string): string {
  if (role === "manager") return "/dashboard/manager";
  if (role === "inspector") return "/dashboard/inspections";
  return "/dashboard";
}

function getPageRoles(pathname: string): string[] | null {
  // En uzun eşleşen path'i bul (alt sayfaları da kapsar)
  const match = Object.keys(PAGE_ROLES)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname === p || pathname.startsWith(p + "/"));
  return match ? PAGE_ROLES[match] : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get("auth-session")?.value === "true";
  const userRole = request.cookies.get("user-role")?.value;

  // Login sayfası
  if (pathname === "/login") {
    if (isAuthenticated && userRole) {
      return NextResponse.redirect(new URL(getDefaultRoute(userRole), request.url));
    }
    return NextResponse.next();
  }

  // Root
  if (pathname === "/") {
    if (isAuthenticated && userRole) {
      return NextResponse.redirect(new URL(getDefaultRoute(userRole), request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Auth kontrolü
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rol bazlı sayfa erişim kontrolü
  if (userRole && pathname.startsWith("/dashboard")) {
    const allowedRoles = getPageRoles(pathname);
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL(getDefaultRoute(userRole), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.png|logo|api|.*\\.png$|.*\\.ico$|.*\\.jpg$|.*\\.svg$).*)"],
};
