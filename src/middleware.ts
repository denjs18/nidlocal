// Middleware Next.js — Edge Runtime compatible
// Utilise uniquement auth.config.ts (sans bcrypt ni Prisma)

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";

const { auth } = NextAuth(authConfig);

const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  "/host":         ["HOST", "ADMIN"],
  "/admin":        ["ADMIN"],
  "/municipality": ["MUNICIPALITY", "ADMIN"],
  "/account":      ["GUEST", "HOST", "ADMIN", "MUNICIPALITY"],
};

export default auth((req: NextRequest & { auth: { user?: { role?: UserRole } } | null }) => {
  const { pathname } = req.nextUrl;

  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!req.auth?.user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const role = req.auth.user.role;
      if (!role || !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/host/:path*",
    "/admin/:path*",
    "/municipality/:path*",
    "/account/:path*",
    "/api/host/:path*",
    "/api/admin/:path*",
    "/api/municipality/:path*",
  ],
};
