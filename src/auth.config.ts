// Config Auth.js compatible Edge Runtime (middleware Vercel)
// PAS d'import bcrypt, PAS de Prisma — uniquement JWT callbacks + pages

import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role: UserRole }).role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
