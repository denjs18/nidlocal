import { auth } from "./config";
import type { UserRole } from "@prisma/client";

/**
 * Récupère la session côté serveur (Server Components / Route Handlers).
 * Lève une erreur 401 si non connecté.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user as {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: UserRole;
  };
}

/**
 * Vérifie qu'un rôle est présent.
 * Lève 403 si le rôle ne correspond pas.
 */
export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Vérifie qu'un des rôles est présent (multi-rôle).
 */
export async function requireAnyRole(...roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Retourne la session sans lever d'erreur (null si non connecté).
 */
export async function getOptionalSession() {
  const session = await auth();
  return session?.user ?? null;
}
