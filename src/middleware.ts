import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes protégées par rôle
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/host": ["HOST", "ADMIN"],
  "/admin": ["ADMIN"],
  "/municipality": ["MUNICIPALITY", "ADMIN"],
  "/account": ["GUEST", "HOST", "ADMIN", "MUNICIPALITY"],
};

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;

  // Vérification des routes protégées
  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      const session = req.auth;

      if (!session?.user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const userRole = session.user.role as string;
      if (!allowedRoles.includes(userRole)) {
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
