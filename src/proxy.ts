import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Reachable while a password change is pending
const PASSWORD_CHANGE_PAGE = "/admin/profile";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";
  const isAuthenticated = !!req.auth;

  // Protect admin routes (except login page)
  if (isAdminRoute && !isLoginPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Redirect to dashboard if already logged in and visiting login
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // Forced password change — read from the JWT, so no database call here.
  // Everything in /admin is blocked until the flag clears.
  if (
    isAuthenticated &&
    isAdminRoute &&
    req.auth?.user?.mustChangePassword &&
    pathname !== PASSWORD_CHANGE_PAGE
  ) {
    return NextResponse.redirect(new URL(PASSWORD_CHANGE_PAGE, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
